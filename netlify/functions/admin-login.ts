// POST /api/admin/login  { senha }  ->  { token, expiraEm }
// GET  /api/admin/login             ->  { logado } (confere o token enviado)
import { adminConfigurado, criarToken, json, requisicaoDeAdmin, senhaConfere } from '../lib/auth';

export const config = { path: '/api/admin/login' };

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export default async (req: Request): Promise<Response> => {
  if (!adminConfigurado()) {
    return json(500, { erro: 'ADMIN_PASSWORD não configurada no Netlify (mínimo de 8 caracteres).' });
  }

  if (req.method === 'GET') return json(200, { logado: requisicaoDeAdmin(req) });
  if (req.method !== 'POST') return json(405, { erro: 'Use POST.' });

  const corpo = (await req.json().catch(() => null)) as { senha?: unknown } | null;

  if (!senhaConfere(corpo?.senha)) {
    // Atrasa a resposta para dificultar tentativas em sequência
    await espera(process.env.VITEST ? 0 : 800);
    return json(401, { erro: 'Senha incorreta.' });
  }

  return json(200, criarToken());
};
