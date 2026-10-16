import { db } from '../db/index';
import type { Livro, Capitulo, Resumo, Quiz } from '../types/index';

export async function salvarLivro(livro: Livro): Promise<number> {
  const id = await db.livros.add(livro);
  return Number(id);
}

export async function buscarTodosLivros(): Promise<Livro[]> {
  return await db.livros.toArray();
}

export async function buscarLivroPorId(id: number): Promise<Livro | undefined> {
  return await db.livros.get(id);
}

export async function salvarCapitulo(capitulo: Capitulo): Promise<number> {
  const id = await db.capitulos.add(capitulo);
  return Number(id);
}

export async function buscarCapitulosPorLivro(livroId: number): Promise<Capitulo[]> {
  return await db.capitulos.where('livroId').equals(livroId).sortBy('numero');
}

export async function salvarResumo(resumo: Resumo): Promise<number> {
  const id = await db.resumos.add(resumo);
  return Number(id);
}

export async function buscarResumoPorCapitulo(capituloId: number): Promise<Resumo | undefined> {
  return await db.resumos.where('capituloId').equals(capituloId).first();
}

export async function salvarQuiz(quiz: Quiz): Promise<number> {
  const id = await db.quizzes.add(quiz);
  return Number(id);
}

export async function buscarQuizzesPorCapitulo(capituloId: number): Promise<Quiz[]> {
  return await db.quizzes.where('capituloId').equals(capituloId).toArray();
}