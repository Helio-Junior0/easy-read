// Resumo + quiz de um intervalo de páginas, gerados pela IA.
//
// 1. Se já existe revisão salva para o mesmo intervalo, devolve ela (funciona offline).
// 2. Senão, junta o Markdown das páginas e manda para a função /api/gerar-revisao.
// 3. Valida a resposta, salva no IndexedDB e devolve.
import type { Revisao } from '../types/index';
import {
  MAX_PAGINAS_POR_REVISAO,
  validarRevisaoGerada,
  type PedidoRevisao,
} from '../shared/revisaoFormato';
import {
  buscarLivroPorId,
  buscarPaginas,
  buscarRevisao,
  buscarRevisaoPorId,
  salvarRevisao,
  salvarTentativa,
} from './dbService';

export const URL_GERAR_REVISAO = '/api/gerar-revisao';

export type TipoErroRevisao = 'offline' | 'intervalo' | 'servidor';

export class ErroRevisao extends Error {
  tipo: TipoErroRevisao;

  constructor(tipo: TipoErroRevisao, mensagem: string) {
    super(mensagem);
    this.name = 'ErroRevisao';
    this.tipo = tipo;
  }
}

interface OpcoesGerar {
  // true = ignora a revisão salva e pede uma nova para a IA
  gerarNova?: boolean;
}

export async function obterRevisao(
  livroId: number,
  inicio: number,
  fim: number,
  opcoes: OpcoesGerar = {},
): Promise<Revisao> {
  const livro = await buscarLivroPorId(livroId);
  if (!livro) throw new ErroRevisao('intervalo', 'Livro não encontrado. Baixe o livro primeiro.');

  if (!Number.isInteger(inicio) || !Number.isInteger(fim) || inicio < 1 || fim < inicio || fim > livro.totalPaginas) {
    throw new ErroRevisao('intervalo', `Escolha páginas entre 1 e ${livro.totalPaginas}.`);
  }
  if (fim - inicio + 1 > MAX_PAGINAS_POR_REVISAO) {
    throw new ErroRevisao('intervalo', `Escolha no máximo ${MAX_PAGINAS_POR_REVISAO} páginas por revisão.`);
  }

  if (!opcoes.gerarNova) {
    const salva = await buscarRevisao(livroId, inicio, fim);
    if (salva) return salva;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ErroRevisao('offline', 'Sem internet. Conecte-se para gerar a revisão destas páginas.');
  }

  const paginas = await buscarPaginas(livroId, inicio, fim);
  const pedido: PedidoRevisao = {
    titulo: livro.titulo,
    autor: livro.autor,
    inicio,
    fim,
    paginas: paginas.map((p) => ({ numero: p.numero, md: p.md })),
  };

  let resposta: Response;
  try {
    resposta = await fetch(URL_GERAR_REVISAO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
    });
  } catch {
    throw new ErroRevisao('offline', 'Não foi possível falar com o servidor. Verifique a internet.');
  }

  const corpo = await resposta.json().catch(() => null);
  if (resposta.status === 404) {
    throw new ErroRevisao(
      'servidor',
      'Função de IA não encontrada. Para testar a IA no computador, rode o projeto com "npx netlify dev" em vez de "npm run dev".',
    );
  }
  if (!resposta.ok) {
    const mensagem = (corpo as { erro?: string } | null)?.erro ?? 'A IA não conseguiu gerar a revisão agora.';
    throw new ErroRevisao('servidor', mensagem);
  }

  let gerada;
  try {
    gerada = validarRevisaoGerada(corpo, inicio, fim);
  } catch (erro) {
    throw new ErroRevisao('servidor', (erro as Error).message);
  }

  // Se pediu uma nova, a antiga do mesmo intervalo continua no histórico
  const revisao: Omit<Revisao, 'id'> = {
    livroId,
    inicio,
    fim,
    resumo: gerada.resumo,
    perguntas: gerada.perguntas,
    criadaEm: new Date(),
  };
  const id = await salvarRevisao(revisao);
  return { ...revisao, id };
}

// Chamar quando a pessoa termina o quiz
export async function registrarResultado(revisaoId: number, acertos: number): Promise<void> {
  const revisao = await buscarRevisaoPorId(revisaoId);
  if (!revisao) throw new Error('Revisão não encontrada.');
  await salvarTentativa({
    revisaoId,
    livroId: revisao.livroId,
    acertos,
    total: revisao.perguntas.length,
  });
}

export { buscarRevisoesPorLivro, buscarTentativasPorRevisao } from './dbService';
