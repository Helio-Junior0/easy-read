// Livros adicionados pelo painel de admin, guardados no Netlify Blobs.
//
// GET    /api/livros          -> catálogo (público)
// GET    /api/livros/:slug    -> o .md do livro (público)
// POST   /api/livros          -> adiciona um livro (admin)
// DELETE /api/livros/:slug    -> exclui um livro (admin)
import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
import { json, requisicaoDeAdmin } from '../lib/auth';
import {
  gerarSlug,
  slugValido,
  validarArquivoMd,
  validarDadosLivro,
  type EnvioLivro,
} from '../../src/shared/livroFormato';

export const config = { path: ['/api/livros', '/api/livros/:slug'] };

interface MetaLivro {
  slug: string;
  titulo: string;
  autor: string;
  descricao?: string;
  categoria?: string;
  licenca?: string;
  arquivo: string;
  adicionadoEm: string;
}

const loja = () => getStore({ name: 'livros', consistency: 'strong' });
const chaveMeta = (slug: string) => `meta/${slug}`;
const chaveMd = (slug: string) => `md/${slug}`;

async function listar(): Promise<MetaLivro[]> {
  const store = loja();
  const { blobs } = await store.list({ prefix: 'meta/' });
  const metas = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: 'json' }) as Promise<MetaLivro | null>),
  );
  return metas
    .filter((m): m is MetaLivro => !!m)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

async function adicionar(req: Request): Promise<Response> {
  const envio = (await req.json().catch(() => null)) as EnvioLivro | null;
  if (!envio || typeof envio.md !== 'string' || typeof envio.nomeArquivo !== 'string') {
    return json(400, { erro: 'Envio inválido.' });
  }

  const erro = validarDadosLivro(envio) ?? validarArquivoMd(envio.nomeArquivo, envio.md);
  if (erro) return json(400, { erro });

  const slug = gerarSlug(envio.titulo);
  const store = loja();

  if (await store.get(chaveMeta(slug), { type: 'json' })) {
    return json(409, { erro: 'Já existe um livro com esse título. Exclua o antigo ou mude o título.' });
  }

  const limpar = (v?: string) => (v?.trim() ? v.trim() : undefined);
  const meta: MetaLivro = {
    slug,
    titulo: envio.titulo.trim(),
    autor: envio.autor.trim(),
    descricao: limpar(envio.descricao),
    categoria: limpar(envio.categoria),
    licenca: limpar(envio.licenca),
    arquivo: `api/livros/${slug}`,
    adicionadoEm: new Date().toISOString(),
  };

  // Primeiro o texto, depois o registro no catálogo
  await store.set(chaveMd(slug), envio.md.replace(/\r\n?/g, '\n'));
  await store.setJSON(chaveMeta(slug), meta);

  return json(201, meta);
}

export default async (req: Request, context: Context): Promise<Response> => {
  const slug = context.params?.slug;

  try {
    if (!slug) {
      if (req.method === 'GET') return json(200, { livros: await listar() });
      if (req.method === 'POST') {
        if (!requisicaoDeAdmin(req)) return json(401, { erro: 'Faça login como administrador.' });
        return await adicionar(req);
      }
      return json(405, { erro: 'Método não permitido.' });
    }

    if (!slugValido(slug)) return json(404, { erro: 'Livro não encontrado.' });

    if (req.method === 'GET') {
      const md = await loja().get(chaveMd(slug), { type: 'text' });
      if (md === null) return json(404, { erro: 'Livro não encontrado.' });
      return new Response(md, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    if (req.method === 'DELETE') {
      if (!requisicaoDeAdmin(req)) return json(401, { erro: 'Faça login como administrador.' });
      const store = loja();
      await store.delete(chaveMeta(slug));
      await store.delete(chaveMd(slug));
      return json(200, { ok: true });
    }

    return json(405, { erro: 'Método não permitido.' });
  } catch (erro) {
    console.error('Erro em /api/livros:', erro);
    return json(500, { erro: 'Não foi possível acessar os livros agora.' });
  }
};
