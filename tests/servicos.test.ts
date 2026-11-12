import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/db/index'
import { baixarLivro, listarBiblioteca } from '../src/services/livroService'
import { buscarProgresso, registrarLeitura, sugerirIntervalo } from '../src/services/leituraService'
import { ErroRevisao, obterRevisao, registrarResultado, buscarTentativasPorRevisao } from '../src/services/revisaoService'
import { paginar } from '../src/services/paginacao'

const catalogo = { livros: [{ slug: 'exemplo-git', titulo: 'Git na Prática', autor: 'Equipe', categoria: 'Ferramentas', arquivo: 'livros/exemplo-git.md' }] }
const catalogoAdmin = { livros: [{ slug: 'livro-do-admin', titulo: 'Livro do Admin', autor: 'Admin', arquivo: 'api/livros/livro-do-admin' }] }
const md = readFileSync('tests/fixtures/exemplo-git.md', 'utf8')
const item = catalogo.livros[0]

function respostaIA(inicio: number) {
  return {
    resumo: 'Resumo do trecho.',
    perguntas: [
      { pergunta: 'O que faz git init?', opcoes: ['Cria repositório', 'Apaga', 'Envia', 'Baixa'], respostaCorreta: 'Cria repositório', pagina: inicio },
      { pergunta: 'Inválida', opcoes: ['A', 'B'], respostaCorreta: 'C', pagina: inicio },
    ],
  }
}

let chamadasIA: any[] = []

beforeEach(async () => {
  chamadasIA = []
  await db.delete()
  await db.open()
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('livros/catalogo.json')) return new Response(JSON.stringify(catalogo))
    if (url.endsWith('livros/exemplo-git.md')) return new Response(md)
    if (url === '/api/livros') return new Response(JSON.stringify(catalogoAdmin))
    if (url.endsWith('api/livros/livro-do-admin')) return new Response('# Livro do Admin\n\nTexto do livro.')
    if (url === '/api/gerar-revisao') {
      const pedido = JSON.parse(String(init?.body))
      chamadasIA.push(pedido)
      return new Response(JSON.stringify(respostaIA(pedido.inicio)))
    }
    return new Response('não encontrado', { status: 404 })
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('fluxo completo', () => {
  it('baixa, pagina e salva o livro', async () => {
    const livro = await baixarLivro(item)
    expect(livro.totalPaginas).toBe(paginar(md).length)
    expect(await db.paginas.where('livroId').equals(livro.id!).count()).toBe(livro.totalPaginas)
    const bib = await listarBiblioteca()
    expect(bib[0]).toMatchObject({ slug: 'exemplo-git', baixado: true, livroId: livro.id, origem: 'fixo' })
    // livro adicionado pelo painel aparece junto e pode ser baixado
    expect(bib[1]).toMatchObject({ slug: 'livro-do-admin', baixado: false, origem: 'admin' })
    const doAdmin = await baixarLivro(bib[1])
    expect(doAdmin.totalPaginas).toBe(1)
    await db.livros.delete(doAdmin.id!)
    // baixar de novo não duplica
    await baixarLivro(item)
    expect(await db.livros.count()).toBe(1)
  })

  it('registra leitura, sugere intervalo, gera e reaproveita revisão', async () => {
    const livro = await baixarLivro(item)
    const id = livro.id!
    expect(await sugerirIntervalo(id)).toBeNull()

    for (const p of [1, 2, 3]) await registrarLeitura(id, p)
    expect(await sugerirIntervalo(id)).toEqual({ inicio: 1, fim: 3 })
    const prog = await buscarProgresso(id)
    expect(prog).toMatchObject({ paginasLidas: 3, ultimaPaginaLida: 3, paginaParaContinuar: 4 })

    const revisao = await obterRevisao(id, 1, 3)
    expect(chamadasIA).toHaveLength(1)
    expect(chamadasIA[0].paginas.map((p: any) => p.numero)).toEqual([1, 2, 3])
    expect(revisao.perguntas).toHaveLength(1) // a inválida foi descartada

    // mesmo intervalo: vem do banco, sem chamar a IA
    await obterRevisao(id, 1, 3)
    expect(chamadasIA).toHaveLength(1)

    // offline com revisão salva funciona; sem revisão salva dá erro "offline"
    vi.stubGlobal('navigator', { onLine: false })
    await expect(obterRevisao(id, 1, 3)).resolves.toBeTruthy()
    await expect(obterRevisao(id, 4, 5)).rejects.toMatchObject({ tipo: 'offline' })
    vi.stubGlobal('navigator', { onLine: true })

    for (const p of [4, 5]) await registrarLeitura(id, p)
    expect(await sugerirIntervalo(id)).toEqual({ inicio: 4, fim: 5 })

    await registrarResultado(revisao.id!, 1)
    const tentativas = await buscarTentativasPorRevisao(revisao.id!)
    expect(tentativas[0]).toMatchObject({ acertos: 1, total: 1, livroId: id })
  })

  it('catálogo: usa o que estiver disponível e só falha se nada responder', async () => {
    const original = globalThis.fetch as any
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) =>
      url === '/api/livros' ? new Response('<html>', { status: 200 }) : original(url, init)))
    expect((await listarBiblioteca()).map((l) => l.slug)).toEqual(['exemplo-git'])

    const livro = await baixarLivro(item)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    expect(await listarBiblioteca()).toMatchObject([{ slug: 'exemplo-git', baixado: true, livroId: livro.id }])
  })

  it('não manda imagens embutidas para a IA', async () => {
    const { semImagensEmbutidas } = await import('../src/services/revisaoService')
    expect(semImagensEmbutidas('antes ![](data:image/png;base64,AAAA) depois ![fig](http://x/y.png)'))
      .toBe('antes [figura] depois ![fig](http://x/y.png)')
  })

  it('grava o capítulo de cada página e sabe onde continuar', async () => {
    const { buscarCapituloDaPagina, buscarOndeContinuar } = await import('../src/services/leituraService')
    const { ultimoTituloDeCapitulo } = await import('../src/services/dbService')
    expect(ultimoTituloDeCapitulo('# Um\n\n```\n# comentário\n```\n\n# **Dois** #')).toBe('Dois')

    const livro = await baixarLivro(item)
    expect(await buscarCapituloDaPagina(livro.id!, 1)).toBe('Git na Prática')
    expect(await buscarCapituloDaPagina(livro.id!, livro.totalPaginas)).toBe('Git na Prática')
    // livro baixado antes de o capítulo ser gravado: calcula na hora
    await db.paginas.toCollection().modify((p) => { delete p.capitulo })
    expect(await buscarCapituloDaPagina(livro.id!, 3)).toBe('Git na Prática')

    expect(await buscarOndeContinuar()).toBeNull()
    await registrarLeitura(livro.id!, 2)
    expect(await buscarOndeContinuar()).toEqual({ livroId: livro.id, pagina: 3 })
    await registrarLeitura(livro.id!, livro.totalPaginas)
    expect(await buscarOndeContinuar()).toEqual({ livroId: livro.id, pagina: livro.totalPaginas })
  })

  it('recusa intervalo inválido', async () => {
    const livro = await baixarLivro(item)
    await expect(obterRevisao(livro.id!, 0, 2)).rejects.toBeInstanceOf(ErroRevisao)
    await expect(obterRevisao(livro.id!, 3, 2)).rejects.toMatchObject({ tipo: 'intervalo' })
    await expect(obterRevisao(livro.id!, 1, livro.totalPaginas + 1)).rejects.toMatchObject({ tipo: 'intervalo' })
  })

  it('erro do servidor vira ErroRevisao do tipo servidor', async () => {
    const livro = await baixarLivro(item)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ erro: 'falhou' }), { status: 502 })))
    await expect(obterRevisao(livro.id!, 1, 2)).rejects.toMatchObject({ tipo: 'servidor', message: 'falhou' })
  })
})
