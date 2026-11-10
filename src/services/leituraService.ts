// Progresso de leitura: quais páginas a pessoa leu e onde parou.
import {
  buscarLivroPorId,
  buscarPaginasLidas,
  buscarRevisoesPorLivro,
  buscarUltimaPaginaLida,
  marcarPaginaLida,
} from './dbService';

export interface Progresso {
  totalPaginas: number;
  paginasLidas: number;
  ultimaPaginaLida: number;
  percentual: number;
  // Página para o botão "Continuar leitura"
  paginaParaContinuar: number;
}

// Chamar quando a pessoa sai de uma página para a próxima
export async function registrarLeitura(livroId: number, pagina: number): Promise<void> {
  await marcarPaginaLida(livroId, pagina);
}

export async function buscarProgresso(livroId: number): Promise<Progresso> {
  const livro = await buscarLivroPorId(livroId);
  const total = livro?.totalPaginas ?? 0;
  const lidas = await buscarPaginasLidas(livroId);
  const ultima = await buscarUltimaPaginaLida(livroId);

  return {
    totalPaginas: total,
    paginasLidas: lidas.length,
    ultimaPaginaLida: ultima,
    percentual: total ? Math.round((lidas.length / total) * 100) : 0,
    paginaParaContinuar: Math.min(Math.max(ultima + 1, 1), Math.max(total, 1)),
  };
}

// Intervalo sugerido para a próxima revisão:
// do fim da última revisão + 1 até a última página lida.
// Devolve null se não há página nova lida desde a última revisão.
export async function sugerirIntervalo(livroId: number): Promise<{ inicio: number; fim: number } | null> {
  const ultimaLida = await buscarUltimaPaginaLida(livroId);
  if (ultimaLida === 0) return null;

  const revisoes = await buscarRevisoesPorLivro(livroId);
  const fimUltimaRevisao = revisoes.reduce((maior, r) => Math.max(maior, r.fim), 0);

  const inicio = fimUltimaRevisao + 1;
  if (inicio > ultimaLida) return null;

  return { inicio, fim: ultimaLida };
}

export { buscarPagina, buscarPaginas } from './dbService';
