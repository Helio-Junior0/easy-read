// Catálogo de livros e download para uso offline.
//
// Fluxo: public/livros/catalogo.json lista os livros disponíveis.
// baixarLivro() busca o .md, divide em páginas e grava tudo no IndexedDB.
import type { Livro, LivroCatalogo } from '../types/index';
import { paginar } from './paginacao';
import {
  buscarLivroPorSlug,
  buscarTodosLivros,
  removerLivro,
  salvarLivroComPaginas,
} from './dbService';

const BASE = import.meta.env.BASE_URL; // "/" no Netlify

export interface ItemBiblioteca extends LivroCatalogo {
  baixado: boolean;
  livroId?: number;
  totalPaginas?: number;
}

export async function buscarCatalogo(): Promise<LivroCatalogo[]> {
  const resposta = await fetch(`${BASE}livros/catalogo.json`, { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`Não foi possível carregar o catálogo (${resposta.status}).`);
  const dados = (await resposta.json()) as { livros: LivroCatalogo[] };
  return dados.livros;
}

// Catálogo + o que já está baixado. Sem internet, mostra só os livros baixados.
export async function listarBiblioteca(): Promise<ItemBiblioteca[]> {
  const baixados = await buscarTodosLivros();
  const porSlug = new Map(baixados.map((l) => [l.slug, l]));

  let catalogo: LivroCatalogo[];
  try {
    catalogo = await buscarCatalogo();
  } catch {
    catalogo = baixados;
  }

  const itens: ItemBiblioteca[] = catalogo.map((c) => {
    const local = porSlug.get(c.slug);
    return { ...c, baixado: !!local, livroId: local?.id, totalPaginas: local?.totalPaginas };
  });

  // Livros baixados que saíram do catálogo continuam aparecendo
  for (const l of baixados) {
    if (!catalogo.some((c) => c.slug === l.slug)) {
      itens.push({ ...l, baixado: true, livroId: l.id, totalPaginas: l.totalPaginas });
    }
  }

  return itens;
}

// Baixa o .md, pagina e salva. Se já estiver baixado, só devolve o livro.
export async function baixarLivro(item: LivroCatalogo): Promise<Livro> {
  const existente = await buscarLivroPorSlug(item.slug);
  if (existente) return existente;

  const resposta = await fetch(`${BASE}${item.arquivo.replace(/^\//, '')}`);
  if (!resposta.ok) throw new Error(`Não foi possível baixar "${item.titulo}" (${resposta.status}).`);

  const md = await resposta.text();
  const paginas = paginar(md);
  if (paginas.length === 0) throw new Error(`O arquivo de "${item.titulo}" está vazio.`);

  const livro: Omit<Livro, 'id'> = {
    slug: item.slug,
    titulo: item.titulo,
    autor: item.autor,
    descricao: item.descricao,
    categoria: item.categoria,
    licenca: item.licenca,
    arquivo: item.arquivo,
    totalPaginas: paginas.length,
    baixadoEm: new Date(),
  };

  const id = await salvarLivroComPaginas(livro, paginas);
  return { ...livro, id };
}

// Apaga o livro do aparelho (páginas, leituras, revisões e tentativas)
export async function excluirLivroBaixado(livroId: number): Promise<void> {
  await removerLivro(livroId);
}
