// Contas de usuário guardadas só neste aparelho (IndexedDB).
//
// É uma demonstração: a conta não existe em outros aparelhos e some se os dados
// do navegador forem apagados. A senha não é guardada; guardamos só um hash
// (PBKDF2 com sal), para ela não ficar legível no banco do navegador.
import { reactive, readonly } from 'vue';
import { db } from '../db/index';
import { buscarPlano } from '../shared/planos';
import type { PlanoId, Usuario } from '../types/index';

const CHAVE_SESSAO = 'easyread.usuario';
const ITERACOES = 100_000;

interface Estado {
  usuario: Usuario | null;
  carregado: boolean;
}

const estado = reactive<Estado>({ usuario: null, carregado: false });

// Use nas telas: conta.usuario
export const conta = readonly(estado);

// ---------- Senha ----------

function paraHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function deHex(hex: string): Uint8Array {
  return new Uint8Array((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));
}

async function gerarHash(senha: string, salHex: string): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(salHex) as BufferSource, iterations: ITERACOES },
    chave,
    256,
  );
  return paraHex(bits);
}

// ---------- Validação ----------

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validarCadastro(dados: { nome: string; email: string; senha: string; confirmacao: string }): string | null {
  if (dados.nome.trim().length < 2) return 'Informe seu nome.';
  if (dados.nome.trim().length > 80) return 'O nome pode ter no máximo 80 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(dados.email))) return 'Informe um e-mail válido.';
  if (dados.senha.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (dados.senha !== dados.confirmacao) return 'As senhas não são iguais.';
  return null;
}

// ---------- Sessão ----------

function guardarSessao(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(CHAVE_SESSAO);
    else localStorage.setItem(CHAVE_SESSAO, String(id));
  } catch {
    // sem armazenamento: a sessão vale só enquanto a página estiver aberta
  }
}

function lerSessao(): number | null {
  try {
    const id = Number(localStorage.getItem(CHAVE_SESSAO));
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

// Carrega o usuário da sessão salva (chamado pelo roteador antes da primeira tela)
export async function carregarSessao(): Promise<Usuario | null> {
  if (!estado.carregado) {
    const id = lerSessao();
    estado.usuario = id ? ((await db.usuarios.get(id)) ?? null) : null;
    if (id && !estado.usuario) guardarSessao(null);
    estado.carregado = true;
  }
  return estado.usuario;
}

export async function cadastrar(dados: { nome: string; email: string; senha: string; confirmacao: string }): Promise<Usuario> {
  const erro = validarCadastro(dados);
  if (erro) throw new Error(erro);

  const email = normalizarEmail(dados.email);
  if (await db.usuarios.where('email').equals(email).first()) {
    throw new Error('Já existe uma conta com este e-mail neste aparelho. Entre com ela.');
  }

  const sal = paraHex(crypto.getRandomValues(new Uint8Array(16)));
  const usuario: Usuario = {
    nome: dados.nome.trim(),
    email,
    sal,
    senhaHash: await gerarHash(dados.senha, sal),
    plano: 'gratis',
    criadoEm: new Date(),
  };
  usuario.id = await db.usuarios.add(usuario);

  estado.usuario = usuario;
  estado.carregado = true;
  guardarSessao(usuario.id);
  return usuario;
}

export async function entrar(email: string, senha: string): Promise<Usuario> {
  const usuario = await db.usuarios.where('email').equals(normalizarEmail(email)).first();
  if (!usuario || (await gerarHash(senha, usuario.sal)) !== usuario.senhaHash) {
    throw new Error('E-mail ou senha incorretos.');
  }
  estado.usuario = usuario;
  estado.carregado = true;
  guardarSessao(usuario.id ?? null);
  return usuario;
}

export function sair(): void {
  estado.usuario = null;
  estado.carregado = true;
  guardarSessao(null);
}

// ---------- Plano e limite de revisões ----------

// Data local do aparelho (o limite do plano zera à meia-noite)
export function hojeLocal(agora = new Date()): string {
  const d = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
}

// Pagamento simulado: só troca o plano da conta
export async function escolherPlano(plano: PlanoId): Promise<void> {
  if (!estado.usuario?.id) throw new Error('Entre na sua conta para escolher um plano.');
  await db.usuarios.update(estado.usuario.id, { plano });
  estado.usuario = { ...estado.usuario, plano };
}

type ContaComPlano = { plano: PlanoId; uso?: { dia: string; quantidade: number } } | null;

export function usoDeHoje(usuario: ContaComPlano = estado.usuario): number {
  return usuario?.uso?.dia === hojeLocal() ? usuario.uso.quantidade : 0;
}

// Quantas revisões novas ainda cabem hoje no plano (null = sem conta, sem limite do plano)
export function revisoesRestantesHoje(usuario: ContaComPlano = estado.usuario): number | null {
  if (!usuario) return null;
  return Math.max(0, buscarPlano(usuario.plano).revisoesPorDia - usoDeHoje(usuario));
}

// Conta uma revisão nova gerada pela IA
export async function registrarRevisaoNova(): Promise<void> {
  const usuario = estado.usuario;
  if (!usuario?.id) return;
  // Relê do banco para não perder a contagem se outra aba também gerou revisões
  const doBanco = (await db.usuarios.get(usuario.id)) ?? usuario;
  const uso = { dia: hojeLocal(), quantidade: usoDeHoje(doBanco) + 1 };
  await db.usuarios.update(usuario.id, { uso });
  estado.usuario = { ...doBanco, uso };
}
