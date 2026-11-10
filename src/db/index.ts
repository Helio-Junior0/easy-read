import Dexie, { type Table } from 'dexie';
import type { Livro, Pagina, Leitura, Revisao, Tentativa } from '../types/index';

export class EasyReadDatabase extends Dexie {
  livros!: Table<Livro, number>;
  paginas!: Table<Pagina, [number, number]>;
  leituras!: Table<Leitura, [number, number]>;
  revisoes!: Table<Revisao, number>;
  tentativas!: Table<Tentativa, number>;

  constructor() {
    super('EasyReadDB');

    // Versão antiga (capítulos). Fica aqui para o Dexie saber migrar quem já tem o banco.
    this.version(3).stores({
      livros: '++id, titulo, autor',
      capitulos: '++id, livroId, numero, titulo',
      resumos: '++id, capituloId, dataCriacao',
      quizzes: '++id, capituloId'
    });

    // Versão 4: livro em Markdown dividido em páginas + resumo/quiz gerados pela IA.
    // A tabela livros muda de índices, então ela é recriada (apagada na v4 e criada de novo na v5).
    this.version(4).stores({
      livros: null,
      capitulos: null,
      resumos: null,
      quizzes: null
    });

    this.version(5).stores({
      livros: '++id, &slug',
      paginas: '[livroId+numero], livroId',
      leituras: '[livroId+pagina], livroId',
      revisoes: '++id, livroId, [livroId+inicio+fim]',
      tentativas: '++id, revisaoId, livroId'
    });
  }
}

export const db = new EasyReadDatabase();
