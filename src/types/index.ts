// Livro que existe no catálogo (public/livros/catalogo.json)
export interface LivroCatalogo {
  slug: string;
  titulo: string;
  autor: string;
  descricao?: string;
  categoria?: string;
  licenca?: string;
  // 'fixo' = veio com o app; 'admin' = adicionado pelo painel
  origem?: 'fixo' | 'admin';
  arquivo: string; // de onde baixar o .md, ex.: "livros/pro-git.md" ou "api/livros/pro-git"
}

// Livro já baixado para o IndexedDB
export interface Livro extends LivroCatalogo {
  id?: number;
  totalPaginas: number;
  baixadoEm: Date;
}

// Uma página do livro, gerada pela função paginar()
export interface Pagina {
  livroId: number;
  numero: number; // começa em 1
  md: string;
  // Título do capítulo (último "# Título") em que a página está
  capitulo?: string;
}

// Registro de que a pessoa leu uma página
export interface Leitura {
  livroId: number;
  pagina: number;
  lidaEm: Date;
}

// Pergunta de quiz gerada pela IA
export interface PerguntaQuiz {
  pergunta: string;
  opcoes: string[];
  respostaCorreta: string; // sempre igual a uma das opções
  pagina: number;          // página de onde a pergunta saiu
}

// Mantido para o useQuiz, que espera o tipo Quiz
export type Quiz = PerguntaQuiz;

// Resumo + quiz de um intervalo de páginas (cache do que a IA gerou)
export interface Revisao {
  id?: number;
  livroId: number;
  inicio: number;
  fim: number;
  resumo: string;
  perguntas: PerguntaQuiz[];
  criadaEm: Date;
}

// Resultado de uma vez que a pessoa fez o quiz
export interface Tentativa {
  id?: number;
  revisaoId: number;
  livroId: number;
  acertos: number;
  total: number;
  feitaEm: Date;
}
