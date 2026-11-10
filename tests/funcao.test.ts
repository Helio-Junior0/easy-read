import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { montarPrompt } from '../netlify/functions/gerar-revisao'

const pedido = {
  titulo: 'Livro', autor: 'Autor', inicio: 3, fim: 4,
  paginas: [{ numero: 3, md: '# Git\n\ntexto' }, { numero: 4, md: 'mais texto' }],
}

function respostaGemini(obj: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }))
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

const req = (body: unknown, method = 'POST') =>
  new Request('http://x/api/gerar-revisao', { method, body: method === 'POST' ? JSON.stringify(body) : undefined })

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

  it('devolve revisão validada e tenta de novo se a IA errar o formato', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respostaGemini({ resumo: '', perguntas: [] }))
      .mockResolvedValueOnce(respostaGemini({
        resumo: 'ok',
        perguntas: [{ pergunta: 'P?', opcoes: ['a', 'b', 'c', 'd'], respostaCorreta: 'b', pagina: 99 }],
      }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await handler(req(pedido))
    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(corpo.perguntas[0].pagina).toBe(3) // página fora do intervalo é corrigida
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('chave')
  })

  it('falha da IA vira 502', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'chave')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('erro', { status: 500 })))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await handler(req(pedido))).status).toBe(502)
  })
})
