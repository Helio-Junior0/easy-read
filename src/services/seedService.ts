import { db } from '../db/index';
import initialData from '../data/initialData.json';

export async function popularBancoSeVazio(): Promise<boolean> {
  const quantidadeLivros = await db.livros.count();

  if (quantidadeLivros > 0) {
    return false;
  }

  await db.transaction('rw', [db.livros, db.capitulos, db.resumos, db.quizzes], async () => {
    await db.livros.bulkAdd(initialData.livros);
    await db.capitulos.bulkAdd(initialData.capitulos);

    const resumosParaInserir = initialData.resumos.map((resumo) => ({
      ...resumo,
      dataCriacao: new Date(resumo.dataCriacao)
    }));
    await db.resumos.bulkAdd(resumosParaInserir);

    await db.quizzes.bulkAdd(initialData.quizzes);
  });

  return true;
}