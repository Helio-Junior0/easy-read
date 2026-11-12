// Área do administrador: login e gerenciamento dos livros do catálogo.
//
// O login só existe para o admin. A senha é conferida no servidor
// (variável ADMIN_PASSWORD do Netlify) e o navegador guarda um token temporário.
import { reactive, readonly } from 'vue';
import {
  validarArquivoMd,
  validarDadosLivro,
  type DadosLivro,
  type EnvioLivro,
} from '../shared/livroFormato';
import type { LivroCatalogo } from '../types/index';

const CHAVE = 'easyread.admin';

interface Sessao {
  token: string;
  expiraEm: number;
}

function lerSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const sessao = JSON.parse(bruto) as Sessao;
    if (!sessao.token || sessao.expiraEm <= Date.now()) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

const estado = reactive({ logado: lerSessao() !== null });

// Use em telas e no menu: admin.logado
export const admin = readonly(estado);

export function adminLogado(): boolean {
  estado.logado = lerSessao() !== null;
  return estado.logado;
}

export function sair(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento disponível: nada a limpar
  }
  estado.logado = false;
}

async function lerErro(resposta: Response, padrao: string): Promise<string> {
  if (resposta.status === 404) {
    return 'Painel indisponível aqui. No computador, rode o projeto com "npx netlify dev".';
  }
  const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
  return corpo?.erro ?? padrao;
}

async function chamar(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet.');
  }
}

export async function entrar(senha: string): Promise<void> {
  const resposta = await chamar('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha }),
  });
  if (!resposta.ok) throw new Error(await lerErro(resposta, 'Não foi possível entrar.'));

  const sessao = (await resposta.json()) as Sessao;
  localStorage.setItem(CHAVE, JSON.stringify(sessao));
  estado.logado = true;
}

function cabecalhoAdmin(): Record<string, string> {
  const sessao = lerSessao();
  if (!sessao) {
    estado.logado = false;
    throw new Error('Sua sessão expirou. Entre de novo.');
  }
  return { Authorization: `Bearer ${sessao.token}` };
}

function tratarNaoAutorizado(resposta: Response): void {
  if (resposta.status === 401) sair();
}

// Lê o arquivo escolhido no formulário e confere se é um .md válido
export async function lerArquivoMd(arquivo: File): Promise<string> {
  const md = await arquivo.text();
  const erro = validarArquivoMd(arquivo.name, md);
  if (erro) throw new Error(erro);
  return md;
}

export async function adicionarLivro(dados: DadosLivro, arquivo: File): Promise<LivroCatalogo> {
  const erroDados = validarDadosLivro(dados);
  if (erroDados) throw new Error(erroDados);

  const md = await lerArquivoMd(arquivo);
  const envio: EnvioLivro = { ...dados, nomeArquivo: arquivo.name, md };

  const resposta = await chamar('/api/livros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabecalhoAdmin() },
    body: JSON.stringify(envio),
  });
  tratarNaoAutorizado(resposta);
  if (!resposta.ok) throw new Error(await lerErro(resposta, 'Não foi possível adicionar o livro.'));

  return (await resposta.json()) as LivroCatalogo;
}

export async function excluirLivroDoCatalogo(slug: string): Promise<void> {
  const resposta = await chamar(`/api/livros/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: cabecalhoAdmin(),
  });
  tratarNaoAutorizado(resposta);
  if (!resposta.ok) throw new Error(await lerErro(resposta, 'Não foi possível excluir o livro.'));
}
