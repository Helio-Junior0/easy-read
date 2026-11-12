// Login do administrador.
//
// A senha fica só na variável de ambiente ADMIN_PASSWORD do Netlify.
// Depois do login, o navegador recebe um token assinado que vale por algumas horas
// e precisa ser enviado no cabeçalho Authorization para adicionar ou excluir livros.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas

function segredo(): string | null {
  const senha = process.env.ADMIN_PASSWORD;
  return senha && senha.length >= 8 ? senha : null;
}

export function adminConfigurado(): boolean {
  return segredo() !== null;
}

function assinar(dados: string, chave: string): string {
  return createHmac('sha256', chave).update(dados).digest('base64url');
}

function iguais(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function senhaConfere(senha: unknown): boolean {
  const chave = segredo();
  return !!chave && typeof senha === 'string' && iguais(senha, chave);
}

export function criarToken(agora = Date.now()): { token: string; expiraEm: number } {
  const chave = segredo();
  if (!chave) throw new Error('ADMIN_PASSWORD não configurada.');
  const expiraEm = agora + DURACAO_MS;
  const dados = Buffer.from(JSON.stringify({ exp: expiraEm })).toString('base64url');
  return { token: `${dados}.${assinar(dados, chave)}`, expiraEm };
}

export function tokenValido(token: string | null | undefined, agora = Date.now()): boolean {
  const chave = segredo();
  if (!chave || !token) return false;

  const [dados, assinatura, ...resto] = token.split('.');
  if (!dados || !assinatura || resto.length > 0) return false;
  if (!iguais(assinatura, assinar(dados, chave))) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(dados, 'base64url').toString('utf8')) as { exp?: number };
    return typeof exp === 'number' && exp > agora;
  } catch {
    return false;
  }
}

// Lê "Authorization: Bearer <token>"
export function requisicaoDeAdmin(req: Request): boolean {
  const cabecalho = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(cabecalho);
  return tokenValido(m?.[1]);
}

export function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
