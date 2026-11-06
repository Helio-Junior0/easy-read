import { db } from '../db';
import initialData from '../data/initialData.json';
import type { Livro, Capitulo } from '../types';

export async function popularBancoSeVazio(): Promise<void> {
  try {
    const countLivros = await db.livros.count();
    if (countLivros === 0) {
      await db.livros.bulkAdd(initialData as unknown as Livro[]);

      const todosCapitulos: Capitulo[] = [];
      for (const livro of initialData) {
        if (livro.capitulos && Array.isArray(livro.capitulos)) {
          for (const cap of livro.capitulos) {
            todosCapitulos.push({
              ...cap,
              livroId: livro.id
            } as unknown as Capitulo);
          }
        }
      }

      if (todosCapitulos.length > 0) {
        await db.capitulos.bulkAdd(todosCapitulos);
      }
    }
  } catch (error) {
    console.error(error);
  }
}