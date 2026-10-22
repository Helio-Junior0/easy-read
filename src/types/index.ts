//Livros
export interface Livro {
    id?: number;
    titulo: string;
    autor: string;
}

//Capitulos
export interface Capitulo {
    id?: number;
    livroId: number;
    numero: number;
    titulo: string;
    texto: string;
}

//Resumo
export interface Resumo {
    id?: number;
    capituloId: number;
    conteudo: string;
    dataCriacao: Date;
}

//Quiz
export interface Quiz {
    id?: number;
    capituloId: number;
    pergunta: string;
    opcoes: string[];
    respostaCorreta: string;
}