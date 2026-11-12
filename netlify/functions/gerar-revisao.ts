// Netlify Function: recebe o Markdown das páginas lidas e devolve resumo + quiz gerados pelo Gemini.
//
// Endereço: POST /api/gerar-revisao
// Variáveis de ambiente (Netlify > Site configuration > Environment variables):
//   GEMINI_API_KEY  -> obrigatória (Google AI Studio). Nunca colocar no código.
//   GEMINI_MODEL    -> opcional, padrão "gemini-2.5-flash".
import {
  MAX_PAGINAS_POR_REVISAO,
  quantidadeDePerguntas,
  validarRevisaoGerada,
  type PedidoRevisao,
  type RevisaoGerada,
} from '../../src/shared/revisaoFormato';

const MODELO_PADRAO = 'gemini-2.5-flash';
const MAX_CARACTERES = 200_000;
const TENTATIVAS = 2;

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

async function chamarGemini(prompt: string, chave: string, modelo: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: ESQUEMA_RESPOSTA,
      },
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`Gemini respondeu ${resposta.status}: ${detalhe.slice(0, 300)}`);
  }

  const dados = (await resposta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const texto = dados.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return JSON.parse(texto);
}

export async function gerarRevisao(
  pedido: PedidoRevisao,
  chave: string,
  modelo = MODELO_PADRAO,
): Promise<RevisaoGerada> {
  const prompt = montarPrompt(pedido);
  let ultimoErro: unknown;

  for (let i = 0; i < TENTATIVAS; i++) {
    try {
      const bruto = await chamarGemini(prompt, chave, modelo);
      return validarRevisaoGerada(bruto, pedido.inicio, pedido.fim);
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  throw ultimoErro;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { erro: 'Use POST.' });

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return json(500, { erro: 'GEMINI_API_KEY não configurada no Netlify.' });

  let pedido: PedidoRevisao;
  try {
    pedido = validarPedido(await req.json());
  } catch (erro) {
    return json(400, { erro: (erro as Error).message });
  }

  try {
    const revisao = await gerarRevisao(pedido, chave, process.env.GEMINI_MODEL || MODELO_PADRAO);
    return json(200, revisao);
  } catch (erro) {
    console.error('Falha ao gerar revisão:', erro);
    return json(502, { erro: 'A IA não conseguiu gerar a revisão agora. Tente de novo em instantes.' });
  }
};
