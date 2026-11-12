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
    async delete(chave: string) { dados.delete(chave) },
    async list({ prefix = '' } = {}) {
      return { blobs: [...dados.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }
    },
  }),
}))

import login from '../netlify/functions/admin-login'
import livros from '../netlify/functions/livros'
import { criarToken, tokenValido } from '../netlify/lib/auth'
import { gerarSlug, validarArquivoMd } from '../src/shared/livroFormato'

const SENHA = 'senha-de-teste-123'
const base = 'http://x'
const ctx = (slug?: string) => ({ params: slug ? { slug } : {} }) as any

async function entrar(senha = SENHA) {
  return login(new Request(`${base}/api/admin/login`, { method: 'POST', body: JSON.stringify({ senha }) }))
}

const envio = { titulo: 'Pense em Python', autor: 'Allen B. Downey', categoria: 'Programação', nomeArquivo: 'livro.md', md: '# Pense\r\n\r\nTexto.' }

function postar(corpo: unknown, token?: string) {
  return livros(new Request(`${base}/api/livros`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(corpo),
  }), ctx())
}

beforeEach(() => { dados.clear(); vi.stubEnv('ADMIN_PASSWORD', SENHA) })
afterEach(() => vi.unstubAllEnvs())

describe('regras do livro', () => {
  it('gera slug sem acento', () => {
    expect(gerarSlug('  Introdução à Programação: C# & .NET!  ')).toBe('introducao-a-programacao-c-net')
  })
  it('só aceita .md de texto', () => {
    expect(validarArquivoMd('livro.md', '# ok')).toBeNull()
    expect(validarArquivoMd('LIVRO.MD', '# ok')).toBeNull()
    expect(validarArquivoMd('livro.pdf', '# ok')).toMatch(/\.md/)
    expect(validarArquivoMd('livro.md.exe', '# ok')).toMatch(/\.md/)
    expect(validarArquivoMd('livro.md', '   ')).toMatch(/vazio/)
    expect(validarArquivoMd('livro.md', 'PK\u0000\u0003')).toMatch(/texto/)
  })
})

describe('login do admin', () => {
  it('senha errada é recusada, senha certa devolve token', async () => {
    expect((await entrar('errada')).status).toBe(401)
    const r = await entrar()
    expect(r.status).toBe(200)
    const { token } = await r.json()
    expect(tokenValido(token)).toBe(true)
  })

  it('token adulterado, vencido ou de outra senha não vale', () => {
    const { token } = criarToken()
    expect(tokenValido(token + 'x')).toBe(false)
    const [dadosToken, assinatura] = token.split('.')
    const forjado = Buffer.from(JSON.stringify({ exp: Date.now() + 9e9 })).toString('base64url')
    expect(tokenValido(`${forjado}.${assinatura}`)).toBe(false)
    expect(tokenValido(`${dadosToken}.${assinatura}`, Date.now() + 9 * 60 * 60 * 1000)).toBe(false)
    vi.stubEnv('ADMIN_PASSWORD', 'outra-senha-456')
    expect(tokenValido(token)).toBe(false)
  })

  it('sem ADMIN_PASSWORD configurada ninguém entra', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '')
    expect((await entrar('')).status).toBe(500)
    expect(tokenValido('a.b')).toBe(false)
  })
})

describe('/api/livros', () => {
  it('sem login não adiciona nem exclui', async () => {
    expect((await postar(envio)).status).toBe(401)
    expect((await postar(envio, 'token.falso')).status).toBe(401)
    const r = await livros(new Request(`${base}/api/livros/x`, { method: 'DELETE' }), ctx('x'))
    expect(r.status).toBe(401)
    expect(dados.size).toBe(0)
  })

  it('admin adiciona, todos listam e baixam, admin exclui', async () => {
    const { token } = criarToken()

    const criado = await postar(envio, token)
    expect(criado.status).toBe(201)
    expect(await criado.json()).toMatchObject({ slug: 'pense-em-python', arquivo: 'api/livros/pense-em-python' })

    // repetido
    expect((await postar(envio, token)).status).toBe(409)

    const lista = await (await livros(new Request(`${base}/api/livros`), ctx())).json()
    expect(lista.livros).toHaveLength(1)
    expect(lista.livros[0]).toMatchObject({ titulo: 'Pense em Python', categoria: 'Programação' })

    const md = await livros(new Request(`${base}/api/livros/pense-em-python`), ctx('pense-em-python'))
    expect(md.headers.get('content-type')).toContain('text/markdown')
    expect(await md.text()).toBe('# Pense\n\nTexto.')

    const excluido = await livros(new Request(`${base}/api/livros/pense-em-python`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    }), ctx('pense-em-python'))
    expect(excluido.status).toBe(200)
    expect(dados.size).toBe(0)
    expect((await livros(new Request(`${base}/api/livros/pense-em-python`), ctx('pense-em-python'))).status).toBe(404)
  })

  it('recusa arquivo que não é .md e dados incompletos', async () => {
    const { token } = criarToken()
    expect((await postar({ ...envio, nomeArquivo: 'livro.pdf' }, token)).status).toBe(400)
    expect((await postar({ ...envio, md: '' }, token)).status).toBe(400)
    expect((await postar({ ...envio, titulo: ' ' }, token)).status).toBe(400)
    expect((await postar({ ...envio, autor: '' }, token)).status).toBe(400)
    expect((await postar('texto', token)).status).toBe(400)
    expect(dados.size).toBe(0)
  })

  it('slug estranho na URL não chega ao armazenamento', async () => {
    const r = await livros(new Request(`${base}/api/livros/x`), ctx('../meta/x'))
    expect(r.status).toBe(404)
  })
})
