import Dexie, { type Table } from 'dexie';
import type { Livro, Capitulo, Resumo, Quiz } from '../types/index';

export class EasyReadDatabase extends Dexie {
  livros!: Table<Livro>;
  capitulos!: Table<Capitulo>;
  resumos!: Table<Resumo>;
  quizzes!: Table<Quiz>;

  constructor() {
    super('EasyReadDB');

    this.version(3).stores({
      livros: '++id, titulo, autor',
      capitulos: '++id, livroId, numero, titulo',
      resumos: '++id, capituloId, dataCriacao',
      quizzes: '++id, capituloId'
    });
  }
}

export const db = new EasyReadDatabase();