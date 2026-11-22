// Netlify Function: recebe o Markdown das páginas lidas e devolve resumo + quiz gerados pelo Gemini.
//
// Endereço: POST /api/gerar-revisao
// Variáveis de ambiente (Netlify > Site configuration > Environment variables):
//   GEMINI_API_KEY  -> obrigatória (Google AI Studio). Nunca colocar no código.
//   GEMINI_MODEL    -> opcional, padrão "gemini-3.5-flash-lite". Se o modelo escolhido
//                      não estiver disponível para a chave, a função tenta os de MODELOS_RESERVA.
//   LIMITE_DIARIO      -> opcional, revisões novas por dia no app inteiro (padrão 150).
//   LIMITE_POR_PESSOA  -> opcional, revisões novas por dia por pessoa/internet (padrão 10).
//
// Para economizar a cota do Gemini:
// - toda revisão gerada fica guardada no Netlify Blobs; se outra pessoa pedir as mesmas
//   páginas do mesmo livro, recebe a guardada sem chamar a IA (não conta no limite);
// - só pedidos que chamam a IA contam no limite diário geral e no limite por pessoa;
// - o administrador logado não tem limite (para as demonstrações);
// - a contagem zera à meia-noite do horário do Pacífico, junto com a cota do Google.
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
import { requisicaoDeAdmin } from '../lib/auth';
import {
  MAX_PAGINAS_POR_REVISAO,
  quantidadeDePerguntas,
  validarRevisaoGerada,
  type PedidoRevisao,
  type RevisaoGerada,
} from '../../src/shared/revisaoFormato';

// O Google recomenda os modelos mais novos para projetos novos; o Flash-Lite é o mais rápido
// (cabe nos 10 segundos do Netlify) e o que tem a cota grátis mais folgada.
const MODELO_PADRAO = 'gemini-3.5-flash-lite';
const MODELOS_RESERVA = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];

class LimiteDaIA extends Error {}
class DemorouDemais extends Error {}
// Modelo inexistente ou não liberado para esta chave: dá para tentar outro
class ModeloIndisponivel extends Error {}
// Erro do Gemini com a explicação que ele mesmo mandou (vai para a tela, para facilitar o conserto)
class ErroDoGemini extends Error {}

// O Netlify (plano grátis) encerra a função em 10 segundos. Desistimos um pouco antes
// para devolver uma mensagem clara em vez de um erro sem explicação.
const TEMPO_MAXIMO_MS = 9_000;

// O "raciocínio" do Gemini 2.5 Flash deixa a resposta lenta demais para os 10 segundos.
// Para resumo e quiz de um trecho ele não é necessário, então fica desligado.
function configuracaoDoModelo(modelo: string): Record<string, unknown> {
  return /^gemini-2\.5-flash/.test(modelo) ? { thinkingConfig: { thinkingBudget: 0 } } : {};
}
const MAX_CARACTERES = 200_000;
const TENTATIVAS = 1; // cada tentativa gasta um pedido da cota
const LIMITE_DIARIO_PADRAO = 150;
const LIMITE_POR_PESSOA_PADRAO = 10;

export const config = { path: '/api/gerar-revisao' };

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function validarPedido(dados: unknown): PedidoRevisao {
  const p = dados as PedidoRevisao;
  if (
    !p ||
    typeof p.titulo !== 'string' ||
    !Number.isInteger(p.inicio) ||
    !Number.isInteger(p.fim) ||
    p.inicio < 1 ||
    p.fim < p.inicio ||
    !Array.isArray(p.paginas) ||
    p.paginas.length === 0
  ) {
    throw new Error('Pedido inválido.');
  }
  if (p.paginas.length > MAX_PAGINAS_POR_REVISAO) {
    throw new Error(`Máximo de ${MAX_PAGINAS_POR_REVISAO} páginas por revisão.`);
  }
  const tamanho = p.paginas.reduce((soma, pg) => soma + (typeof pg.md === 'string' ? pg.md.length : 0), 0);
  if (tamanho > MAX_CARACTERES) throw new Error('Trecho grande demais para uma revisão.');
  p.nova = p.nova === true;
  return p;
}

export function montarPrompt(pedido: PedidoRevisao): string {
  const qtd = quantidadeDePerguntas(pedido.paginas.length);
  const trecho = pedido.paginas
    .map((p) => `<pagina numero="${p.numero}">\n${p.md}\n</pagina>`)
    .join('\n\n');

  return [
    `Você é um professor ajudando um estudante de TI a revisar o livro "${pedido.titulo}"${pedido.autor ? `, de ${pedido.autor}` : ''}.`,
    `O estudante leu as páginas ${pedido.inicio} a ${pedido.fim}. O texto delas está abaixo, em Markdown.`,
    '',
    'Tarefas:',
    '1. Escreva um resumo em português do Brasil, de 1 a 3 parágrafos, só com o que está nessas páginas. Destaque conceitos, comandos e termos técnicos importantes.',
    `2. Crie ${qtd} perguntas de múltipla escolha com 4 opções cada, que testem se o estudante entendeu o trecho (não decoreba de detalhes irrelevantes).`,
    '',
    'Regras:',
    '- Use somente informações do trecho. Não invente nada que não esteja nele.',
    '- "respostaCorreta" deve ser exatamente igual, letra por letra, a uma das "opcoes".',
    '- As opções erradas devem ser plausíveis, e a posição da opção correta deve variar.',
    '- "pagina" é o número da página de onde a resposta foi tirada.',
    '- Código e comandos podem aparecer nas perguntas e opções.',
    '',
    trecho,
  ].join('\n');
}

const ESQUEMA_RESPOSTA = {
  type: 'OBJECT',
  properties: {
    resumo: { type: 'STRING' },
    perguntas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          pergunta: { type: 'STRING' },
          opcoes: { type: 'ARRAY', items: { type: 'STRING' } },
          respostaCorreta: { type: 'STRING' },
          pagina: { type: 'INTEGER' },
        },
        required: ['pergunta', 'opcoes', 'respostaCorreta', 'pagina'],
      },
    },
  },
  required: ['resumo', 'perguntas'],
};

// Lê a explicação que o Google manda junto com o erro ({ error: { message } })
function explicacaoDoErro(texto: string): string {
  try {
    const msg = (JSON.parse(texto) as { error?: { message?: string } }).error?.message;
    if (msg) return msg.slice(0, 200);
  } catch {
    // não era JSON
  }
  return texto.slice(0, 200);
}

async function chamarGemini(prompt: string, chave: string, modelo: string, prazo: number): Promise<unknown> {
  const restante = prazo - Date.now();
  if (restante <= 500) throw new DemorouDemais('Sem tempo para chamar o Gemini.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
      signal: AbortSignal.timeout(restante),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: ESQUEMA_RESPOSTA,
          ...configuracaoDoModelo(modelo),
        },
      }),
    });
  } catch (erro) {
    const nome = (erro as Error)?.name;
    if (nome === 'TimeoutError' || nome === 'AbortError') throw new DemorouDemais('Gemini demorou demais.');
    throw erro;
  }

  if (resposta.status === 429) throw new LimiteDaIA('Cota do Gemini esgotada.');
  if (!resposta.ok) {
    const detalhe = explicacaoDoErro(await resposta.text().catch(() => ''));
    const ehModelo = resposta.status === 404 || (resposta.status === 400 && /model/i.test(detalhe));
    const texto = `Gemini (${modelo}) respondeu ${resposta.status}: ${detalhe}`;
    throw ehModelo ? new ModeloIndisponivel(texto) : new ErroDoGemini(texto);
  }

  const dados = (await resposta.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const candidato = dados.candidates?.[0];
  const texto = candidato?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? '';
  if (!texto) throw new ErroDoGemini(`Gemini (${modelo}) respondeu vazio (${candidato?.finishReason ?? 'sem motivo'}).`);
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErroDoGemini(`Gemini (${modelo}) respondeu fora do formato (${candidato?.finishReason ?? 'sem motivo'}).`);
  }
}

export async function gerarRevisao(
  pedido: PedidoRevisao,
  chave: string,
  modelo = MODELO_PADRAO,
): Promise<RevisaoGerada> {
  const prompt = montarPrompt(pedido);
  const prazo = Date.now() + TEMPO_MAXIMO_MS;
  // O modelo escolhido primeiro; se ele não existir para esta chave, os de reserva
  const modelos = [...new Set([modelo, ...MODELOS_RESERVA])];
  let ultimoErro: unknown;

  for (const atual of modelos) {
    for (let i = 0; i < TENTATIVAS; i++) {
      try {
        const bruto = await chamarGemini(prompt, chave, atual, prazo);
        return validarRevisaoGerada(bruto, pedido.inicio, pedido.fim);
      } catch (erro) {
        if (!(erro instanceof ModeloIndisponivel)) {
          if (erro instanceof LimiteDaIA || erro instanceof DemorouDemais) throw erro;
          ultimoErro = erro;
          continue;
        }
        console.warn(erro.message);
        ultimoErro = erro;
        break; // próximo modelo
      }
    }
    if (!(ultimoErro instanceof ModeloIndisponivel)) break;
  }
  throw ultimoErro;
}

// ---------- Cache compartilhado e limites (Netlify Blobs) ----------

const loja = () => getStore({ name: 'revisoes', consistency: 'strong' });

function sha256(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}

// A chave depende do texto das páginas: mesmo livro e mesmas páginas = mesma revisão
export function chaveDoCache(pedido: PedidoRevisao): string {
  const conteudo = pedido.paginas.map((p) => `${p.numero}\u0000${p.md}`).join('\u0001');
  return `cache/${sha256(`${pedido.titulo}\u0002${conteudo}`)}`;
}

// Data no fuso do Pacífico, que é quando a cota do Gemini zera
export function hoje(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(agora);
}

function numeroDaVariavel(nome: string, padrao: number): number {
  const valor = Number(process.env[nome]);
  return Number.isInteger(valor) && valor >= 0 ? valor : padrao;
}

async function lerContagem(chave: string): Promise<number> {
  const valor = await loja().get(chave, { type: 'text' });
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

// Reserva um uso antes de chamar a IA (a chamada gasta a cota mesmo se falhar).
// Devolve a mensagem de erro, ou null se ainda há limite.
async function reservarUso(pessoa: string): Promise<string | null> {
  const dia = hoje();
  const chaveGeral = `uso/${dia}/total`;
  const chavePessoa = `uso/${dia}/pessoa/${pessoa}`;

  const [geral, daPessoa] = await Promise.all([lerContagem(chaveGeral), lerContagem(chavePessoa)]);

  if (geral >= numeroDaVariavel('LIMITE_DIARIO', LIMITE_DIARIO_PADRAO)) {
    return 'O limite de revisões novas de hoje acabou. As revisões já geradas continuam disponíveis, e amanhã libera de novo.';
  }
  const limitePessoa = numeroDaVariavel('LIMITE_POR_PESSOA', LIMITE_POR_PESSOA_PADRAO);
  if (daPessoa >= limitePessoa) {
    return `Você já gerou ${limitePessoa} revisões novas hoje. As que você já tem continuam disponíveis, e amanhã libera de novo.`;
  }

  await Promise.all([
    loja().set(chaveGeral, String(geral + 1)),
    loja().set(chavePessoa, String(daPessoa + 1)),
  ]);
  return null;
}

// Identifica a pessoa pelo endereço de internet, guardado só como hash
function identificarPessoa(req: Request, context?: Context): string {
  const ip =
    context?.ip ||
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'desconhecido';
  return sha256(`easyread:${ip}`).slice(0, 32);
}

export default async (req: Request, context?: Context): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { erro: 'Use POST.' });

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return json(500, { erro: 'GEMINI_API_KEY não configurada no Netlify.' });

  let pedido: PedidoRevisao;
  try {
    pedido = validarPedido(await req.json());
  } catch (erro) {
    return json(400, { erro: (erro as Error).message });
  }

  const chaveCache = chaveDoCache(pedido);

  try {
    // 1. Já foi gerada para estas páginas? Devolve sem gastar cota.
    if (!pedido.nova) {
      const guardada = await loja().get(chaveCache, { type: 'json' });
      if (guardada) {
        try {
          return json(200, { ...validarRevisaoGerada(guardada, pedido.inicio, pedido.fim), reaproveitada: true });
        } catch {
          // guardada com problema: gera de novo
        }
      }
    }

    // 2. Confere os limites (admin não tem limite)
    if (!requisicaoDeAdmin(req)) {
      const bloqueio = await reservarUso(identificarPessoa(req, context));
      if (bloqueio) return json(429, { erro: bloqueio });
    }

    // 3. Chama a IA e guarda para as próximas pessoas
    const revisao = await gerarRevisao(pedido, chave, process.env.GEMINI_MODEL || MODELO_PADRAO);
    await loja().setJSON(chaveCache, revisao).catch((e) => console.error('Não foi possível guardar a revisão:', e));
    return json(200, revisao);
  } catch (erro) {
    if (erro instanceof LimiteDaIA) {
      return json(429, { erro: 'A cota da IA acabou por hoje. As revisões já geradas continuam disponíveis.' });
    }
    if (erro instanceof DemorouDemais) {
      return json(504, { erro: 'A IA demorou demais para responder. Tente de novo, ou escolha menos páginas.' });
    }
    console.error('Falha ao gerar revisão:', erro);
    // Mostra o motivo na tela: sem isso só dá para descobrir olhando os logs do Netlify
    const motivo =
      erro instanceof ErroDoGemini || erro instanceof ModeloIndisponivel
        ? erro.message
        : (erro as Error)?.message?.slice(0, 200) || 'erro desconhecido';
    return json(502, { erro: `A IA não conseguiu gerar a revisão agora. Motivo: ${motivo}` });
  }
};
