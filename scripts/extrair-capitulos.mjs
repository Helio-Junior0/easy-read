// Extrai os capítulos 1 a 10 de Dom Casmurro de um .txt com linhas de largura fixa
// e gera os capítulos no formato do app (src/types: Capitulo).
//
// Uso:
//   node scripts/extrair-capitulos.mjs              -> só mostra o relatório
//   node scripts/extrair-capitulos.mjs --gravar     -> também atualiza src/data/initialData.json
//   node scripts/extrair-capitulos.mjs --capitulo 3 -> mostra o capítulo 3 inteiro
//
// O texto nunca é alterado: as linhas só são juntadas com um espaço ou separadas
// em parágrafos. Palavras suspeitas são apenas listadas, nunca corrigidas.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ARQUIVO_LIVRO = 'C:/Users/helio/livros/dom-casmurro.txt'
const ARQUIVO_DADOS = fileURLToPath(new URL('../src/data/initialData.json', import.meta.url))

const LIVRO_ID = 1
const PRIMEIRO_CAPITULO = 1
const ULTIMO_CAPITULO = 10
const idDoCapitulo = (numero) => 100 + numero

// Pontuação que pode encerrar um parágrafo
const FIM_DE_FRASE = /[.!?…"”:]$/
// Diferença (em caracteres) abaixo da qual a decisão de quebra é considerada duvidosa
const MARGEM_DUVIDA = 2

// Ajustes manuais, por número da linha no .txt, para casos em que a largura não decide.
// A chave é a linha cuja quebra (com a linha seguinte) foi revisada.
const AJUSTES = new Map([
  [97, 'juntar'], // "...no seminário?" + "É mais que tempo": a fala de José Dias continua
  [196, 'separar'], // "...restabelecer tudo." + "Não foi despedido": volta a narração após a fala
])

const args = process.argv.slice(2)
const gravar = args.includes('--gravar')
const capituloParaMostrar = args.includes('--capitulo')
  ? Number(args[args.indexOf('--capitulo') + 1])
  : null

// ---------------------------------------------------------------------------
// Leitura e localização dos capítulos

const linhas = readFileSync(ARQUIVO_LIVRO, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)

const ROMANOS = { I: 1, V: 5, X: 10, L: 50, C: 100 }
function romanoParaNumero(romano) {
  let total = 0
  for (let i = 0; i < romano.length; i++) {
    const atual = ROMANOS[romano[i]]
    const proximo = ROMANOS[romano[i + 1]] ?? 0
    total += atual < proximo ? -atual : atual
  }
  return total
}

function numeroDoCabecalho(linha) {
  const m = linha.trim().match(/^CAPÍTULO\s+(PRIMEIRO|[IVXLC]+)$/)
  if (!m) return null
  return m[1] === 'PRIMEIRO' ? 1 : romanoParaNumero(m[1])
}

const cabecalhos = []
linhas.forEach((linha, indice) => {
  const numero = numeroDoCabecalho(linha)
  if (numero !== null) cabecalhos.push({ numero, indice })
})

// Largura útil da linha: percentil 99 do comprimento das linhas de texto dos capítulos
// extraídos (ignora cabeçalhos, títulos e linhas vazias). O livro inteiro tem trechos
// com linhas mais largas, que deixariam o limite folgado demais para estes capítulos.
const inicioTrecho = cabecalhos.find((c) => c.numero === PRIMEIRO_CAPITULO)?.indice ?? 0
const fimTrecho = cabecalhos.find((c) => c.numero === ULTIMO_CAPITULO + 1)?.indice ?? linhas.length
const indicesCabecalho = new Set(cabecalhos.flatMap((c) => [c.indice, c.indice + 1]))
const comprimentos = linhas
  .map((linha, i) => ({ linha, i }))
  .filter(({ linha, i }) => i >= inicioTrecho && i < fimTrecho && linha.trim() && !indicesCabecalho.has(i))
  .map(({ linha }) => linha)
  .map((linha) => linha.trimEnd().length)
  .sort((a, b) => a - b)
const LARGURA = comprimentos[Math.floor(0.99 * (comprimentos.length - 1))]
const MEDIA = comprimentos.reduce((s, n) => s + n, 0) / comprimentos.length

// ---------------------------------------------------------------------------
// Título em formato de frase, preservando nomes próprios

const textoDoLivro = linhas.join('\n')

// Uma palavra é tratada como nome próprio se, no meio das frases do livro,
// aparece mais vezes com inicial maiúscula do que minúscula
function ehNomeProprio(palavra) {
  const minuscula = palavra.toLocaleLowerCase('pt-BR')
  const capitalizada = minuscula[0].toLocaleUpperCase('pt-BR') + minuscula.slice(1)
  const meio = (forma) =>
    (textoDoLivro.match(new RegExp(`[\\p{L},;] ${forma}(?![\\p{L}])`, 'gu')) ?? []).length
  return meio(capitalizada) > meio(minuscula)
}

function tituloEmFrase(titulo) {
  return titulo
    .trim()
    .split(/\s+/)
    .map((palavra, i) => {
      const minuscula = palavra.toLocaleLowerCase('pt-BR')
      const soLetras = minuscula.replace(/[^\p{L}]/gu, '')
      const capitalizar = i === 0 || /^\p{L}\.$/u.test(palavra) || (soLetras && ehNomeProprio(soLetras))
      return capitalizar ? minuscula[0].toLocaleUpperCase('pt-BR') + minuscula.slice(1) : minuscula
    })
    .join(' ')
}

// ---------------------------------------------------------------------------
// Reconstrução dos parágrafos

const primeiraPalavra = (linha) => linha.trim().split(/\s+/)[0] ?? ''
const comecaFala = (linha) => linha.trimStart().startsWith('—')

function montarParagrafos(linhasCapitulo, numeroLinhaInicial) {
  const paragrafos = []
  const duvidas = []
  let atual = []

  const fechar = () => {
    if (atual.length) paragrafos.push(atual.join(' '))
    atual = []
  }

  linhasCapitulo.forEach((bruta, i) => {
    const linha = bruta.trim()
    if (!linha) return fechar()

    // Uma linha que começa com travessão inicia um novo parágrafo
    if (comecaFala(linha)) fechar()
    atual.push(linha)

    const proxima = linhasCapitulo[i + 1]?.trim()
    if (!proxima) return fechar()
    if (comecaFala(proxima)) return fechar()

    // A linha foi quebrada antes do fim se a primeira palavra da próxima caberia nela
    const espacoQueSobra = LARGURA - (linha.length + 1 + primeiraPalavra(proxima).length)
    const caberia = espacoQueSobra >= 0
    const terminaFrase = FIM_DE_FRASE.test(linha)
    // Versos e nomes isolados: linhas bem curtas que não chegam à metade da largura
    const linhaIsolada = linha.length < LARGURA * 0.5 && caberia

    const numeroLinha = numeroLinhaInicial + i
    const ajuste = AJUSTES.get(numeroLinha)
    const separar = ajuste ? ajuste === 'separar' : (terminaFrase && caberia) || linhaIsolada

    if (ajuste || (terminaFrase && Math.abs(espacoQueSobra) <= MARGEM_DUVIDA)) {
      duvidas.push({
        linha: numeroLinha,
        decisao: (separar ? 'separou' : 'juntou') + (ajuste ? ' (ajuste manual)' : ''),
        fim: linha.slice(-40),
        inicioProxima: proxima.slice(0, 40),
      })
    }

    if (separar) fechar()
  })
  fechar()

  return { paragrafos, duvidas }
}

// ---------------------------------------------------------------------------
// Palavras suspeitas de hífen perdido (ex.: "fazêlo", "ampararme", "admitime")

const PRONOMES = ['lhes', 'lhe', 'los', 'las', 'me', 'te', 'se', 'lo', 'la', 'nos', 'vos']
// Radicais que aparecem com hífen antes de pronome em outro ponto do livro (ex.: "fazê-" de "fazê-lo")
const radicaisHifenizados = new Set(
  [...textoDoLivro.toLocaleLowerCase('pt-BR').matchAll(/(\p{L}+)-(?:me|te|se|lhes?|l[oa]s?|n[oa]s?|vos)(?![\p{L}])/gu)].map(
    (m) => m[1],
  ),
)
// Palavras comuns que batem com os padrões, mas estão corretas
const EXCLUSOES = new Set([
  'aquilo', 'aquele', 'aquela', 'crime', 'sublime', 'regime', 'enorme', 'conforme', 'uniforme',
  'firme', 'informe', 'disforme', 'forme', 'admite', 'permite', 'remete', 'promete', 'compete',
  'noite', 'parte', 'arte', 'sorte', 'morte', 'forte', 'norte', 'corte', 'porte', 'deste', 'neste',
  'este', 'esse', 'disse', 'fosse', 'tivesse', 'estivesse', 'pudesse', 'quisesse', 'houvesse',
])

function motivoSuspeita(palavra) {
  const minuscula = palavra.toLocaleLowerCase('pt-BR')
  if (EXCLUSOES.has(minuscula)) return null

  for (const pronome of PRONOMES) {
    if (!minuscula.endsWith(pronome)) continue
    const radical = minuscula.slice(0, -pronome.length)
    if (radical.length < 3) continue
    const sugestao = `${radical}-${pronome}`

    if (radicaisHifenizados.has(radical)) return `"${radical}-" aparece com hífen no livro (${sugestao}?)`
    if (/(?:ar|er|ir|or|ôr)$/.test(radical) && ['me', 'te', 'se', 'lhe', 'lhes', 'lo', 'la', 'los', 'las'].includes(pronome)) {
      return `infinitivo + pronome (${sugestao}?)`
    }
    if (/[áâêíóô]$/.test(radical) && ['lo', 'la', 'los', 'las'].includes(pronome)) {
      return `vogal acentuada + pronome (${sugestao}?)`
    }
    if (/(?:[^aeiou]i|ei|ou|eu|iu)$/.test(radical) && ['me', 'te', 'se', 'lhe', 'lhes'].includes(pronome)) {
      return `pretérito + pronome (${sugestao}?)`
    }
  }
  return null
}

// Frase em que a palavra aparece (dentro do texto já montado)
function fraseCom(texto, palavra) {
  const frases = texto.replace(/\n\n/g, ' ').split(/(?<=[.!?…])\s+/)
  return frases.find((f) => new RegExp(`(?<![\\p{L}])${palavra}(?![\\p{L}])`, 'u').test(f)) ?? ''
}

// ---------------------------------------------------------------------------
// Extração

const capitulos = []
const suspeitas = []
const duvidasDeQuebra = []
const linhasLongas = []

for (let numero = PRIMEIRO_CAPITULO; numero <= ULTIMO_CAPITULO; numero++) {
  const posicao = cabecalhos.findIndex((c) => c.numero === numero)
  if (posicao === -1) throw new Error(`Capítulo ${numero} não encontrado no arquivo`)

  const inicio = cabecalhos[posicao].indice
  const fim = cabecalhos[posicao + 1]?.indice ?? linhas.length
  const tituloOriginal = linhas[inicio + 1].trim()
  const corpo = linhas.slice(inicio + 2, fim)

  const { paragrafos, duvidas } = montarParagrafos(corpo, inicio + 3)
  const texto = paragrafos.join('\n\n')

  // Conferência: o texto montado tem exatamente as mesmas palavras do original
  const palavrasOriginais = corpo.join(' ').split(/\s+/).filter(Boolean)
  const palavrasMontadas = texto.split(/\s+/).filter(Boolean)
  if (palavrasOriginais.join(' ') !== palavrasMontadas.join(' ')) {
    throw new Error(`Capítulo ${numero}: o texto montado difere do original`)
  }

  corpo.forEach((linha, i) => {
    if (linha.trim().length > LARGURA + 10) {
      linhasLongas.push({ capitulo: numero, linha: inicio + 3 + i, tamanho: linha.trim().length })
    }
  })

  const vistas = new Set()
  for (const palavra of texto.match(/\p{L}+/gu) ?? []) {
    if (vistas.has(palavra)) continue
    vistas.add(palavra)
    const motivo = motivoSuspeita(palavra)
    if (motivo) suspeitas.push({ capitulo: numero, palavra, motivo, frase: fraseCom(texto, palavra) })
  }

  duvidasDeQuebra.push(...duvidas.map((d) => ({ capitulo: numero, ...d })))

  capitulos.push({
    id: idDoCapitulo(numero),
    livroId: LIVRO_ID,
    numero,
    titulo: tituloEmFrase(tituloOriginal),
    texto,
    _tituloOriginal: tituloOriginal,
    _paragrafos: paragrafos.length,
    _palavras: palavrasMontadas.length,
  })
}

// ---------------------------------------------------------------------------
// Relatório

const pontas = (texto, n) => {
  const p = texto.split(/\s+/)
  return { inicio: p.slice(0, n).join(' '), fim: p.slice(-n).join(' ') }
}

console.log(`Largura útil das linhas: ${LARGURA} caracteres (média ${MEDIA.toFixed(1)})\n`)

console.log('=== CAPÍTULOS ===')
for (const c of capitulos) {
  const { inicio, fim } = pontas(c.texto, 15)
  console.log(`\n[${c.id}] Capítulo ${c.numero}: "${c.titulo}"  (original: ${c._tituloOriginal})`)
  console.log(`  ${c._paragrafos} parágrafos, ${c._palavras} palavras`)
  console.log(`  Início: ${inicio}`)
  console.log(`  Fim:    ${fim}`)
}

console.log('\n=== PALAVRAS SUSPEITAS (hífen perdido?) ===')
if (!suspeitas.length) console.log('Nenhuma.')
for (const s of suspeitas) {
  console.log(`\nCap. ${s.capitulo} — "${s.palavra}": ${s.motivo}`)
  console.log(`  Frase: ${s.frase}`)
}

console.log('\n=== LINHAS ANORMALMENTE LONGAS (possível junção no arquivo) ===')
if (!linhasLongas.length) console.log('Nenhuma.')
for (const l of linhasLongas) console.log(`Cap. ${l.capitulo}, linha ${l.linha} do .txt: ${l.tamanho} caracteres`)

console.log(`\n=== QUEBRAS DE PARÁGRAFO DUVIDOSAS (a ±${MARGEM_DUVIDA} caracteres do limite) ===`)
if (!duvidasDeQuebra.length) console.log('Nenhuma.')
for (const d of duvidasDeQuebra) {
  console.log(`Cap. ${d.capitulo}, linha ${d.linha} do .txt: ${d.decisao}`)
  console.log(`  "...${d.fim}" | "${d.inicioProxima}..."`)
}

if (capituloParaMostrar) {
  const c = capitulos.find((cap) => cap.numero === capituloParaMostrar)
  console.log(`\n=== CAPÍTULO ${capituloParaMostrar} COMPLETO ===\n`)
  console.log(c ? `${c.titulo}\n\n${c.texto}` : 'Capítulo fora do intervalo extraído.')
}

// ---------------------------------------------------------------------------
// Gravação no initialData.json

if (gravar) {
  const dados = JSON.parse(readFileSync(ARQUIVO_DADOS, 'utf8'))
  const novos = capitulos.map(({ id, livroId, numero, titulo, texto }) => ({ id, livroId, numero, titulo, texto }))

  // Capítulos já existentes deste livro com os mesmos números são substituídos.
  // Se o id antigo for diferente (ex.: 1 -> 101), o capituloId de resumos e quizzes é remapeado.
  const substituidos = dados.capitulos.filter(
    (c) => c.livroId === LIVRO_ID && c.numero >= PRIMEIRO_CAPITULO && c.numero <= ULTIMO_CAPITULO,
  )
  const novoIdPorAntigo = new Map(substituidos.map((c) => [c.id, idDoCapitulo(c.numero)]))
  const antigo = substituidos.find((c) => c.numero === PRIMEIRO_CAPITULO)

  const idsNovos = new Set(novos.map((c) => c.id))
  dados.capitulos = [
    ...dados.capitulos.filter((c) => !substituidos.includes(c) && !idsNovos.has(c.id)),
    ...novos,
  ].sort((a, b) => a.id - b.id)

  for (const item of [...dados.resumos, ...dados.quizzes]) {
    const novoId = novoIdPorAntigo.get(item.capituloId)
    if (novoId !== undefined && novoId !== item.capituloId) {
      console.log(`capituloId ${item.capituloId} -> ${novoId} em "${item.pergunta ?? item.conteudo.slice(0, 50)}"`)
      item.capituloId = novoId
    }
  }

  const ids = dados.capitulos.map((c) => c.id)
  if (new Set(ids).size !== ids.length) throw new Error('IDs de capítulo repetidos')
  for (const r of [...dados.resumos, ...dados.quizzes]) {
    if (!ids.includes(r.capituloId)) throw new Error(`capituloId ${r.capituloId} não existe nos capítulos`)
  }

  writeFileSync(ARQUIVO_DADOS, JSON.stringify(dados, null, 2) + '\n')
  JSON.parse(readFileSync(ARQUIVO_DADOS, 'utf8'))

  console.log('\n=== initialData.json atualizado ===')
  if (antigo) {
    console.log(`Capítulo ${antigo.id} -> ${novos[0].id} — título: "${antigo.titulo}" -> "${novos[0].titulo}"`)
    console.log(`Texto antigo (${antigo.texto.length} caracteres): ${antigo.texto}`)
    console.log(`Texto novo: ${novos[0].texto.length} caracteres`)
  }
  console.log(`Capítulos no arquivo: ${ids.join(', ')}`)
}
