// Divide o Markdown de um livro em páginas de tamanho parecido.
//
// Regras:
// - cada página tem por volta de PALAVRAS_POR_PAGINA palavras;
// - só corta entre blocos (parágrafo, lista, tabela, título, código);
// - nunca corta no meio de um bloco de código;
// - título nunca fica sozinho no fim de uma página;
// - títulos # e ## começam página nova quando a página atual já tem conteúdo razoável;
// - parágrafo gigante é quebrado entre frases.
//
// A função é determinística: o mesmo .md gera sempre as mesmas páginas.
// Não mude PALAVRAS_POR_PAGINA depois que o app estiver em uso,
// senão a "página 25" de quem já baixou deixa de bater com a de quem baixar depois.

export const PALAVRAS_POR_PAGINA = 300;

const LIMITE_PARAGRAFO = Math.round(PALAVRAS_POR_PAGINA * 1.5);
const MINIMO_ANTES_DE_CAPITULO = Math.round(PALAVRAS_POR_PAGINA * 0.5);

interface Bloco {
  texto: string;
  palavras: number;
  titulo: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = não é título
}

export function contarPalavras(texto: string): number {
  const partes = texto.trim().split(/\s+/);
  return partes[0] === '' ? 0 : partes.length;
}

function nivelTitulo(texto: string): Bloco['titulo'] {
  const m = /^(#{1,6})\s/.exec(texto);
  return m ? (m[1].length as Bloco['titulo']) : 0;
}

function criarBloco(texto: string): Bloco {
  return { texto, palavras: contarPalavras(texto), titulo: nivelTitulo(texto) };
}

// Quebra o Markdown em blocos, respeitando os blocos de código cercados (``` ou ~~~)
function separarBlocos(md: string): Bloco[] {
  const linhas = md.replace(/\r\n?/g, '\n').split('\n');
  const blocos: Bloco[] = [];
  let atual: string[] = [];
  let cerca: string | null = null;

  const fecharAtual = () => {
    const texto = atual.join('\n').trim();
    if (texto) blocos.push(criarBloco(texto));
    atual = [];
  };

  for (const linha of linhas) {
    const marca = /^\s*(```+|~~~+)/.exec(linha);

    if (cerca) {
      atual.push(linha);
      if (marca && marca[1][0] === cerca[0] && marca[1].length >= cerca.length) {
        cerca = null;
        fecharAtual();
      }
      continue;
    }

    if (marca) {
      fecharAtual();
      cerca = marca[1];
      atual.push(linha);
      continue;
    }

    if (linha.trim() === '') {
      fecharAtual();
      continue;
    }

    // Título é sempre um bloco separado, mesmo sem linha em branco depois
    if (nivelTitulo(linha.trim())) {
      fecharAtual();
      atual.push(linha);
      fecharAtual();
      continue;
    }

    atual.push(linha);
  }

  fecharAtual();
  return blocos;
}

// Parágrafo muito grande é dividido entre frases (código, lista e tabela ficam inteiros)
function dividirParagrafoGrande(bloco: Bloco): Bloco[] {
  const ehTexto =
    bloco.titulo === 0 &&
    !/^\s*(```|~~~)/.test(bloco.texto) &&
    !/^\s*([-*+]\s|\d+[.)]\s|\|)/.test(bloco.texto);

  if (!ehTexto || bloco.palavras <= LIMITE_PARAGRAFO) return [bloco];

  const frases = bloco.texto.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [bloco.texto];
  const partes: Bloco[] = [];
  let atual = '';

  for (const frase of frases) {
    if (atual && contarPalavras(atual + frase) > PALAVRAS_POR_PAGINA) {
      partes.push(criarBloco(atual.trim()));
      atual = '';
    }
    atual += frase;
  }
  if (atual.trim()) partes.push(criarBloco(atual.trim()));

  return partes;
}

export function paginar(md: string): string[] {
  const blocos = separarBlocos(md).flatMap(dividirParagrafoGrande);
  const paginas: string[] = [];
  let atual: Bloco[] = [];
  let palavras = 0;

  const fecharPagina = () => {
    if (atual.length === 0) return;
    paginas.push(atual.map((b) => b.texto).join('\n\n'));
    atual = [];
    palavras = 0;
  };

  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i];

    // Título junto com o bloco seguinte, para não ficar sozinho no fim da página
    let grupo: Bloco[] = [bloco];
    let j = i;
    while (grupo[grupo.length - 1].titulo && j + 1 < blocos.length) {
      j++;
      grupo.push(blocos[j]);
    }
    const palavrasGrupo = grupo.reduce((soma, b) => soma + b.palavras, 0);

    const comecaCapitulo = bloco.titulo === 1 || bloco.titulo === 2;
    const estoura = palavras > 0 && palavras + palavrasGrupo > PALAVRAS_POR_PAGINA;

    if (estoura || (comecaCapitulo && palavras >= MINIMO_ANTES_DE_CAPITULO)) {
      fecharPagina();
    }

    atual.push(...grupo);
    palavras += palavrasGrupo;
    i = j;
  }

  fecharPagina();
  return paginas;
}
