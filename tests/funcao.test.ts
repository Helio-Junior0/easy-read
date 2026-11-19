import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Netlify Blobs simulado em memória
const dados = new Map<string, string>()
vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    async get(chave: string, opcoes?: { type?: string }) {
      const v = dados.get(chave)
      if (v === undefined) return null
      return opcoes?.type === 'json' ? JSON.parse(v) : v
    },
    async set(chave: string, valor: string) { dados.set(chave, valor) },
    async setJSON(chave: string, valor: unknown) { dados.set(chave, JSON.stringify(valor)) },
  }),
}))

import handler, { chaveDoCache, hoje, montarPrompt } from '../netlify/functions/gerar-revisao'
import { criarToken } from '../netlify/lib/auth'

const pedido = {
  titulo: 'Livro', autor: 'Autor', inicio: 3, fim: 4,
  paginas: [{ numero: 3, md: '# Git\n\ntexto' }, { numero: 4, md: 'mais texto' }],
}

function respostaGemini(obj: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }))
}

beforeEach(() => dados.clear())
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

const req = (body: unknown, method = 'POST', headers: Record<string, string> = {}) =>
  new Request('http://x/api/gerar-revisao', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined })

const ctx = (ip: string) => ({ ip }) as any

const revisaoOk = {
  resumo: 'ok',
  perguntas: [{ pergunta: 'P?', opcoes: ['a', 'b', 'c', 'd'], respostaCorreta: 'b', pagina: 3 }],
}

describe('função gerar-revisao', () => {
  it('prompt inclui as páginas numeradas', () => {
    const p = montarPrompt(pedido)
    expect(p).toContain('<pagina numero="3">')
    expect(p).toContain('páginas 3 a 4')
  })

  it('sem chave devolve 500', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    expect((await handler(req(pedido))).status).toBe(500)
  })

  it('pedido inválido devolve 400', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'x')
    expect((await handler(req({ titulo: 'a' }))).status).toBe(400)
    expect((await handler(req(pedido, 'GET'))).status).toBe(405)
  })

  it('devolve revisão validada com uma chamada só', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    const fetchMock = vi.fn().mockResolvedValue(respostaGemini({ ...revisaoOk, perguntas: [{ ...revisaoOk.perguntas[0], pagina: 99 }] }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await handler(req(pedido), ctx('1.1.1.1'))
    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(corpo.perguntas[0].pagina).toBe(3) // página fora do intervalo é corrigida
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('chave')
  })

  it('formato errado da IA não é tentado de novo (economiza cota)', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    const fetchMock = vi.fn().mockResolvedValue(respostaGemini({ resumo: '', perguntas: [] }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await handler(req(pedido), ctx('1.1.1.1'))).status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('mesmas páginas pedidas por outra pessoa vêm do cache, sem chamar a IA nem contar no limite', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    const fetchMock = vi.fn(async () => respostaGemini(revisaoOk))
    vi.stubGlobal('fetch', fetchMock)
    expect((await handler(req(pedido), ctx('1.1.1.1'))).status).toBe(200)
    const outra = await handler(req(pedido), ctx('2.2.2.2'))
    expect(outra.status).toBe(200)
    expect((await outra.json()).reaproveitada).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(dados.get(`uso/${hoje()}/total`)).toBe('1')

    // texto diferente = outra chave
    expect(chaveDoCache({ ...pedido, paginas: [{ numero: 3, md: 'outro' }] })).not.toBe(chaveDoCache(pedido))

    // "gerar novas perguntas" ignora o cache e conta no limite
    expect((await handler(req({ ...pedido, nova: true }), ctx('2.2.2.2'))).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(dados.get(`uso/${hoje()}/total`)).toBe('2')
  })

  it('limite por pessoa e limite diário geral', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    vi.stubEnv('LIMITE_POR_PESSOA', '2')
    vi.stubEnv('LIMITE_DIARIO', '3')
    const fetchMock = vi.fn(async () => respostaGemini(revisaoOk))
    vi.stubGlobal('fetch', fetchMock)
    const nova = { ...pedido, nova: true }

    expect((await handler(req(nova), ctx('1.1.1.1'))).status).toBe(200)
    expect((await handler(req(nova), ctx('1.1.1.1'))).status).toBe(200)
    const bloqueada = await handler(req(nova), ctx('1.1.1.1'))
    expect(bloqueada.status).toBe(429)
    expect((await bloqueada.json()).erro).toContain('Você já gerou 2')

    expect((await handler(req(nova), ctx('2.2.2.2'))).status).toBe(200)
    const geral = await handler(req(nova), ctx('3.3.3.3'))
    expect(geral.status).toBe(429)
    expect((await geral.json()).erro).toContain('limite de revisões novas de hoje')
    expect(fetchMock).toHaveBeenCalledTimes(3)

    // o cache continua funcionando com o limite esgotado
    expect((await handler(req(pedido), ctx('3.3.3.3'))).status).toBe(200)

    // admin logado não tem limite
    vi.stubEnv('ADMIN_PASSWORD', 'senha-de-teste-123')
    const { token } = criarToken()
    expect((await handler(req(nova, 'POST', { Authorization: `Bearer ${token}` }), ctx('1.1.1.1'))).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('cota do Gemini esgotada vira 429 com mensagem clara', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('quota', { status: 429 })))
    const r = await handler(req(pedido), ctx('1.1.1.1'))
    expect(r.status).toBe(429)
    expect((await r.json()).erro).toContain('cota da IA acabou')
  })

  it('o dia segue o fuso do Pacífico', () => {
    expect(hoje(new Date('2026-11-20T06:00:00Z'))).toBe('2026-11-19')
    expect(hoje(new Date('2026-11-20T09:00:00Z'))).toBe('2026-11-20')
  })

  it('falha da IA vira 502', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('erro', { status: 500 })))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await handler(req(pedido))).status).toBe(502)
  })
})
