// Formato da conversa entre o app e a função gerar-revisao.
// Este arquivo é usado pelos dois lados (navegador e Netlify Function),
// então não pode importar nada do Vue, do Dexie nem do navegador.

export interface PaginaEnviada {
  numero: number;
  md: string;
}

export interface PedidoRevisao {
  titulo: string;
  autor: string;
  inicio: number;
  fim: number;
  paginas: PaginaEnviada[];
  // true = ignora a revisão já gerada para estas páginas e pede uma nova à IA
  nova?: boolean;
}

export interface PerguntaGerada {
  pergunta: string;
  opcoes: string[];
  respostaCorreta: string;
  pagina: number;
}

export interface RevisaoGerada {
  resumo: string;
  perguntas: PerguntaGerada[];
}

export const MAX_PAGINAS_POR_REVISAO = 50;

// Revisão de poucas páginas gasta um pedido à IA à toa
export const MIN_PAGINAS_POR_REVISAO = 3;

// Mínimo de páginas exigido para um livro (livro curto pode ter menos de 3 páginas)
export function minimoDePaginas(totalPaginas: number): number {
  return Math.max(1, Math.min(MIN_PAGINAS_POR_REVISAO, totalPaginas));
}

// Quantas perguntas pedir para a IA, conforme o tamanho do trecho
export function quantidadeDePerguntas(totalPaginas: number): number {
  return Math.min(8, Math.max(3, Math.ceil(totalPaginas / 2)));
}

// Confere a resposta da IA e devolve uma versão limpa.
// Perguntas com problema são descartadas; se não sobrar nenhuma, lança erro.
export function validarRevisaoGerada(dados: unknown, inicio: number, fim: number): RevisaoGerada {
  if (!dados || typeof dados !== 'object') throw new Error('Resposta da IA vazia.');
  const bruto = dados as Record<string, unknown>;

  const resumo = typeof bruto.resumo === 'string' ? bruto.resumo.trim() : '';
  if (!resumo) throw new Error('A IA não devolveu o resumo.');

  const lista = Array.isArray(bruto.perguntas) ? bruto.perguntas : [];
  const perguntas: PerguntaGerada[] = [];

  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;

    const pergunta = typeof p.pergunta === 'string' ? p.pergunta.trim() : '';
    const opcoes = Array.isArray(p.opcoes)
      ? p.opcoes.filter((o): o is string => typeof o === 'string').map((o) => o.trim()).filter(Boolean)
      : [];
    const respostaCorreta = typeof p.respostaCorreta === 'string' ? p.respostaCorreta.trim() : '';

    if (!pergunta || opcoes.length < 2 || new Set(opcoes).size !== opcoes.length) continue;
    if (!opcoes.includes(respostaCorreta)) continue;

    const paginaNum = Number(p.pagina);
    const pagina = Number.isInteger(paginaNum) && paginaNum >= inicio && paginaNum <= fim ? paginaNum : inicio;

    perguntas.push({ pergunta, opcoes, respostaCorreta, pagina });
  }

  if (perguntas.length === 0) throw new Error('A IA não devolveu nenhuma pergunta válida.');

  return { resumo, perguntas };
}
