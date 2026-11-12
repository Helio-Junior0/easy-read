// Acesso direto ao IndexedDB (Dexie). As telas devem preferir os serviços
// livroService, leituraService e revisaoService, que usam estas funções.
import Dexie from 'dexie';
import { db } from '../db/index';
import type { Livro, Pagina, Revisao, Tentativa } from '../types/index';

// ---------- Livros ----------

export async function buscarTodosLivros(): Promise<Livro[]> {
  return await db.livros.toArray();
}

export async function buscarLivroPorId(id: number): Promise<Livro | undefined> {
  return await db.livros.get(id);
}

export async function buscarLivroPorSlug(slug: string): Promise<Livro | undefined> {
  return await db.livros.where('slug').equals(slug).first();
}

// Último título de capítulo ("# Título") dentro de um trecho de Markdown, ignorando blocos de código
export function ultimoTituloDeCapitulo(md: string): string | undefined {
  let dentroDeCodigo = false;
  let titulo: string | undefined;
  for (const linha of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(linha)) dentroDeCodigo = !dentroDeCodigo;
    else if (!dentroDeCodigo) {
      const m = /^#\s+(.+?)\s*#*$/.exec(linha);
      if (m) titulo = m[1].replace(/[*_`]/g, '').trim();
    }
  }
  return titulo;
}

// Salva o livro e todas as páginas numa transação só (ou entra tudo, ou nada)
export async function salvarLivroComPaginas(
  livro: Omit<Livro, 'id'>,
  paginasMd: string[],
): Promise<number> {
  return await db.transaction('rw', [db.livros, db.paginas], async () => {
    const livroId = await db.livros.add(livro as Livro);
    let capitulo: string | undefined;
    const paginas: Pagina[] = paginasMd.map((md, i) => {
      capitulo = ultimoTituloDeCapitulo(md) ?? capitulo;
      return { livroId, numero: i + 1, md, capitulo };
    });
    await db.paginas.bulkAdd(paginas);
    return livroId;
  });
}

// Remove o livro e tudo ligado a ele
export async function removerLivro(livroId: number): Promise<void> {
  await db.transaction('rw', [db.livros, db.paginas, db.leituras, db.revisoes, db.tentativas], async () => {
    await db.paginas.where('livroId').equals(livroId).delete();
    await db.leituras.where('livroId').equals(livroId).delete();
    await db.revisoes.where('livroId').equals(livroId).delete();
    await db.tentativas.where('livroId').equals(livroId).delete();
    await db.livros.delete(livroId);
  });
}

// ---------- Páginas ----------

export async function buscarPagina(livroId: number, numero: number): Promise<Pagina | undefined> {
  return await db.paginas.get([livroId, numero]);
}

// Páginas de inicio até fim (inclusive), em ordem
export async function buscarPaginas(livroId: number, inicio: number, fim: number): Promise<Pagina[]> {
  return await db.paginas
    .where('[livroId+numero]')
    .between([livroId, inicio], [livroId, fim], true, true)
    .toArray();
}

// Capítulo de uma página. Livros baixados antes de o capítulo ser gravado são calculados na hora.
export async function buscarCapituloDaPagina(livroId: number, numero: number): Promise<string | undefined> {
  const pagina = await buscarPagina(livroId, numero);
  if (!pagina) return undefined;
  if (pagina.capitulo !== undefined) return pagina.capitulo;

  const anteriores = await buscarPaginas(livroId, 1, numero);
  for (let i = anteriores.length - 1; i >= 0; i--) {
    const titulo = ultimoTituloDeCapitulo(anteriores[i].md);
    if (titulo) return titulo;
  }
  return undefined;
}

// ---------- Leituras (páginas lidas) ----------

export async function marcarPaginaLida(livroId: number, pagina: number): Promise<void> {
  await db.leituras.put({ livroId, pagina, lidaEm: new Date() });
}

export async function buscarPaginasLidas(livroId: number): Promise<number[]> {
  const leituras = await db.leituras.where('livroId').equals(livroId).toArray();
  return leituras.map((l) => l.pagina).sort((a, b) => a - b);
}

// Última página que a pessoa leu, em qualquer livro (para o botão "Continuar")
export async function buscarUltimaLeitura(): Promise<{ livroId: number; pagina: number } | undefined> {
  const leituras = await db.leituras.toArray();
  let ultima: (typeof leituras)[number] | undefined;
  for (const l of leituras) {
    if (!ultima || l.lidaEm >= ultima.lidaEm) ultima = l;
  }
  return ultima ? { livroId: ultima.livroId, pagina: ultima.pagina } : undefined;
}

// Maior número de página já lida (0 se nenhuma)
export async function buscarUltimaPaginaLida(livroId: number): Promise<number> {
  const ultima = await db.leituras
    .where('[livroId+pagina]')
    .between([livroId, Dexie.minKey], [livroId, Dexie.maxKey])
    .last();
  return ultima?.pagina ?? 0;
}

// ---------- Revisões (resumo + quiz da IA) ----------

export async function buscarRevisao(livroId: number, inicio: number, fim: number): Promise<Revisao | undefined> {
  return await db.revisoes.where('[livroId+inicio+fim]').equals([livroId, inicio, fim]).last(); // a mais recente
}

export async function buscarRevisaoPorId(id: number): Promise<Revisao | undefined> {
  return await db.revisoes.get(id);
}

export async function buscarRevisoesPorLivro(livroId: number): Promise<Revisao[]> {
  const revisoes = await db.revisoes.where('livroId').equals(livroId).toArray();
  return revisoes.sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
}

export async function salvarRevisao(revisao: Omit<Revisao, 'id'>): Promise<number> {
  return await db.revisoes.add(revisao as Revisao);
}

// ---------- Tentativas (resultado do quiz) ----------

export async function salvarTentativa(tentativa: Omit<Tentativa, 'id' | 'feitaEm'>): Promise<number> {
  return await db.tentativas.add({ ...tentativa, feitaEm: new Date() } as Tentativa);
}

export async function buscarTentativasPorRevisao(revisaoId: number): Promise<Tentativa[]> {
  return await db.tentativas.where('revisaoId').equals(revisaoId).sortBy('feitaEm');
}

export async function buscarTentativasPorLivro(livroId: number): Promise<Tentativa[]> {
  return await db.tentativas.where('livroId').equals(livroId).sortBy('feitaEm');
}
