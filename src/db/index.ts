import Dexie, { type Table } from 'dexie';

export interface Livro {}

export interface Capitulo {}

export interface Resumo {}

export interface Quiz {}

export class EasyReadDatabase extends Dexie {
  livros!: Table<Livro>;
  capitulos!: Table<Capitulo>;
  resumos!: Table<Resumo>;
  quizzes!: Table<Quiz>;

  constructor() {
    super('EasyReadDB');
    this.version(2).stores({
      livros: '++id',
      capitulos: '++id',
      resumos: '++id',
      quizzes: '++id'
    });
  }
}

export const db = new EasyReadDatabase();