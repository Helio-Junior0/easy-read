import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/db/index'
import {
  cadastrar,
  carregarSessao,
  conta,
  entrar,
  escolherPlano,
  hojeLocal,
  revisoesRestantesHoje,
  sair,
  validarCadastro,
} from '../src/services/contaService'
import { baixarLivro } from '../src/services/livroService'
import { obterRevisao } from '../src/services/revisaoService'

const md = readFileSync('tests/fixtures/exemplo-git.md', 'utf8')
const item = { slug: 'exemplo-git', titulo: 'Git na Prática', autor: 'Equipe', arquivo: 'livros/exemplo-git.md' }

// localStorage simples para os testes (no Node ele não existe)
const armazenamento = new Map<string, string>()
const localStorageFalso = {
  getItem: (k: string) => armazenamento.get(k) ?? null,
  setItem: (k: string, v: string) => void armazenamento.set(k, String(v)),
  removeItem: (k: string) => void armazenamento.delete(k),
}

let chamadasIA = 0
let reaproveitada = false

beforeEach(async () => {
  vi.stubGlobal('localStorage', localStorageFalso)
  armazenamento.clear()
  sair()
  chamadasIA = 0
  reaproveitada = false
  await db.delete()
  await db.open()
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('livros/exemplo-git.md')) return new Response(md)
    if (url === '/api/gerar-revisao') {
      chamadasIA++
      const { inicio } = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({
        resumo: 'Resumo.',
        perguntas: [{ pergunta: 'P?', opcoes: ['a', 'b'], respostaCorreta: 'a', pagina: inicio }],
        ...(reaproveitada ? { reaproveitada: true } : {}),
      }))
    }
    return new Response('não encontrado', { status: 404 })
  }))
})

afterEach(() => vi.unstubAllGlobals())

const dados = { nome: 'Ana Souza', email: ' Ana@Exemplo.com ', senha: 'segredo1', confirmacao: 'segredo1' }

describe('cadastro e login no aparelho', () => {
  it('valida os campos', () => {
    expect(validarCadastro(dados)).toBeNull()
    expect(validarCadastro({ ...dados, nome: 'A' })).toMatch(/nome/)
    expect(validarCadastro({ ...dados, email: 'ana@' })).toMatch(/e-mail/)
    expect(validarCadastro({ ...dados, senha: '123', confirmacao: '123' })).toMatch(/6 caracteres/)
    expect(validarCadastro({ ...dados, confirmacao: 'outra' })).toMatch(/não são iguais/)
  })

  it('cadastra, guarda só o hash da senha e mantém a sessão', async () => {
    const usuario = await cadastrar(dados)
    expect(usuario).toMatchObject({ nome: 'Ana Souza', email: 'ana@exemplo.com', plano: 'gratis' })
    const salvo = await db.usuarios.get(usuario.id!)
    expect(JSON.stringify(salvo)).not.toContain('segredo1')
    expect(salvo!.senhaHash).toMatch(/^[0-9a-f]{64}$/)

    expect(armazenamento.get('easyread.usuario')).toBe(String(usuario.id))
    expect((await carregarSessao())?.email).toBe('ana@exemplo.com')
    await expect(cadastrar(dados)).rejects.toThrow(/Já existe uma conta/)
  })

  it('entra com a senha certa e recusa a errada', async () => {
    await cadastrar(dados)
    sair()
    expect(conta.usuario).toBeNull()
    await expect(entrar('ana@exemplo.com', 'errada')).rejects.toThrow('E-mail ou senha incorretos.')
    await expect(entrar('ninguem@exemplo.com', 'segredo1')).rejects.toThrow('E-mail ou senha incorretos.')
    const usuario = await entrar('  ANA@exemplo.com', 'segredo1')
    expect(usuario.nome).toBe('Ana Souza')
    expect(conta.usuario?.id).toBe(usuario.id)
  })
})

describe('limite de revisões por plano', () => {
  it('plano Grátis: 3 revisões novas por dia; revisão salva não conta', async () => {
    await cadastrar(dados)
    const livro = await baixarLivro(item)
    const id = livro.id!
    expect(revisoesRestantesHoje()).toBe(3)

    await obterRevisao(id, 1, 3)
    await obterRevisao(id, 1, 3) // salva no aparelho: não chama a IA
    expect(chamadasIA).toBe(1)
    expect(revisoesRestantesHoje()).toBe(2)

    await obterRevisao(id, 2, 4)
    await obterRevisao(id, 3, 5)
    expect(revisoesRestantesHoje()).toBe(0)
    await expect(obterRevisao(id, 4, 6)).rejects.toMatchObject({ tipo: 'limite', message: expect.stringContaining('plano Grátis') })
    expect(chamadasIA).toBe(3)

    // a contagem fica guardada na conta
    const salvo = await db.usuarios.get(conta.usuario!.id!)
    expect(salvo!.uso).toEqual({ dia: hojeLocal(), quantidade: 3 })
  })

  it('"gerar novas perguntas" é só para os planos pagos', async () => {
    await cadastrar(dados)
    const livro = await baixarLivro(item)
    await obterRevisao(livro.id!, 1, 3)
    await expect(obterRevisao(livro.id!, 1, 3, { gerarNova: true })).rejects.toMatchObject({ tipo: 'limite' })

    await escolherPlano('leitor')
    expect(conta.usuario!.plano).toBe('leitor')
    expect((await db.usuarios.get(conta.usuario!.id!))!.plano).toBe('leitor')
    expect(revisoesRestantesHoje()).toBe(14)
    await obterRevisao(livro.id!, 1, 3, { gerarNova: true })
    expect(revisoesRestantesHoje()).toBe(13)
  })

  it('revisão que já estava pronta no servidor não gasta o limite', async () => {
    await cadastrar(dados)
    const livro = await baixarLivro(item)
    reaproveitada = true
    await obterRevisao(livro.id!, 1, 3)
    expect(chamadasIA).toBe(1)
    expect(revisoesRestantesHoje()).toBe(3)
  })

  it('o contador zera no dia seguinte', () => {
    const ontem = { plano: 'gratis' as const, uso: { dia: '2000-01-01', quantidade: 3 } }
    expect(revisoesRestantesHoje(ontem)).toBe(3)
    expect(revisoesRestantesHoje(null)).toBeNull()
    expect(hojeLocal(new Date(2026, 10, 22, 23, 30))).toBe('2026-11-22')
  })
})
