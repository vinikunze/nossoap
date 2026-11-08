// API do app. Roda na Cloudflare, atrás do Access: só chega aqui quem fez
// login. Mesmo assim, confere o e-mail contra a lista do casal, para que um
// erro de configuração no Access não abra a lista para ninguém.

import { linkValido } from '../shared/texto';
import type { Prioridade } from '../shared/tipos';

interface Env {
  DB: D1Database;
  EMAILS_PERMITIDOS: string;
}

interface AccessCtx {
  access?: { aud: string; getIdentity(): Promise<{ email?: string } | undefined> };
}

const PRIORIDADES: Prioridade[] = ['essencial', 'logo', 'um_dia'];

const CAMPOS_ITEM = `id, comodo_id, nome, quantidade, prioridade, estimado_centavos, pago_centavos,
  link, obs, comprado, comprado_em, criado_em`;

class Erro extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function quemEsta(env: Env, ctx: AccessCtx): Promise<string> {
  if (!ctx.access) throw new Erro(401, 'Login necessário.');
  const identidade = await ctx.access.getIdentity();
  const email = identidade?.email?.trim().toLowerCase();
  const permitidos = env.EMAILS_PERMITIDOS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!email || !permitidos.includes(email)) throw new Erro(403, 'Este e-mail não tem acesso ao app.');
  return email;
}

// ---------- validação ----------

function texto(v: unknown, campo: string, max: number): string {
  if (typeof v !== 'string' || v.trim().length === 0) throw new Erro(400, `Preencha ${campo}.`);
  const t = v.trim().replace(/\s+/g, ' ');
  if (t.length > max) throw new Erro(400, `${campo} pode ter até ${max} caracteres.`);
  return t;
}

function textoOpcional(v: unknown, campo: string, max: number): string | null {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return null;
  if (typeof v !== 'string') throw new Erro(400, `${campo} inválido.`);
  const t = v.trim();
  if (t.length > max) throw new Erro(400, `${campo} pode ter até ${max} caracteres.`);
  return t;
}

function centavosOpcional(v: unknown, aceitaZero: boolean): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < (aceitaZero ? 0 : 1) || v > 100_000_000_000) {
    throw new Erro(400, 'Valor inválido.');
  }
  return v;
}

function quantidade(v: unknown): number {
  if (v === undefined) return 1;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 999) throw new Erro(400, 'Quantidade vai de 1 a 999.');
  return v;
}

function prioridade(v: unknown): Prioridade {
  if (v === undefined) return 'logo';
  if (!PRIORIDADES.includes(v as Prioridade)) throw new Erro(400, 'Prioridade inválida.');
  return v as Prioridade;
}

function link(v: unknown): string | null {
  const t = textoOpcional(v, 'Link', 2000);
  if (t === null) return null;
  const l = linkValido(t);
  if (!l) throw new Erro(400, 'Esse link não parece um endereço de site.');
  return l;
}

function icone(v: unknown): string {
  if (typeof v !== 'string' || !/^[a-z_]{1,20}$/.test(v)) throw new Erro(400, 'Ícone inválido.');
  return v;
}

function id(v: string | undefined): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Erro(404, 'Não encontrado.');
  return n;
}

async function comodoAtivo(env: Env, v: unknown): Promise<number> {
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new Erro(400, 'Escolha um cômodo.');
  const c = await env.DB.prepare('SELECT ativo FROM comodos WHERE id = ?').bind(v).first<{ ativo: number }>();
  if (!c) throw new Erro(400, 'Esse cômodo não existe.');
  if (!c.ativo) throw new Erro(400, 'Esse cômodo está arquivado.');
  return v;
}

async function corpo(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    if (b && typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
  } catch { /* cai no erro abaixo */ }
  throw new Erro(400, 'Corpo da requisição inválido.');
}

const agora = () => new Date().toISOString();

// ---------- itens ----------

async function lerItem(env: Env, itemId: number) {
  const i = await env.DB.prepare(`SELECT ${CAMPOS_ITEM} FROM itens WHERE id = ?`).bind(itemId).first();
  if (!i) throw new Erro(404, 'Item não encontrado.');
  return i;
}

async function criarItem(env: Env, req: Request, email: string): Promise<Response> {
  const b = await corpo(req);
  const chave = b.chave;
  if (typeof chave !== 'string' || chave.length < 8 || chave.length > 64) throw new Erro(400, 'Chave inválida.');

  // Reenvio do mesmo cadastro (a rede caiu no meio): devolve o que já existe.
  const ja = await env.DB.prepare(`SELECT ${CAMPOS_ITEM} FROM itens WHERE chave = ?`).bind(chave).first();
  if (ja) return json(ja);

  const novo = await env.DB.prepare(
    `INSERT INTO itens (chave, comodo_id, nome, quantidade, prioridade, estimado_centavos, link, obs, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${CAMPOS_ITEM}`,
  ).bind(
    chave,
    await comodoAtivo(env, b.comodo_id),
    texto(b.nome, 'o nome', 120),
    quantidade(b.quantidade),
    prioridade(b.prioridade),
    centavosOpcional(b.estimado_centavos, false),
    link(b.link),
    textoOpcional(b.obs, 'Observação', 500),
    email,
  ).first();
  return json(novo, 201);
}

async function editarItem(env: Env, req: Request, itemId: number): Promise<Response> {
  const b = await corpo(req);
  const atual = await env.DB.prepare('SELECT comodo_id, comprado FROM itens WHERE id = ?').bind(itemId)
    .first<{ comodo_id: number; comprado: number }>();
  if (!atual) throw new Erro(404, 'Item não encontrado.');
  // Item pode continuar num cômodo que foi arquivado depois; só não pode ir para um.
  const comodo = b.comodo_id === atual.comodo_id ? atual.comodo_id : await comodoAtivo(env, b.comodo_id);
  const item = await env.DB.prepare(
    `UPDATE itens SET comodo_id = ?, nome = ?, quantidade = ?, prioridade = ?, estimado_centavos = ?,
       pago_centavos = ?, link = ?, obs = ?, atualizado_em = ?
     WHERE id = ? RETURNING ${CAMPOS_ITEM}`,
  ).bind(
    comodo,
    texto(b.nome, 'o nome', 120),
    quantidade(b.quantidade),
    prioridade(b.prioridade),
    centavosOpcional(b.estimado_centavos, false),
    // Preço pago só existe em item comprado.
    atual.comprado ? centavosOpcional(b.pago_centavos, true) : null,
    link(b.link),
    textoOpcional(b.obs, 'Observação', 500),
    agora(),
    itemId,
  ).first();
  return json(item);
}

async function comprar(env: Env, req: Request, email: string, itemId: number): Promise<Response> {
  const b = await corpo(req);
  const item = await env.DB.prepare(
    `UPDATE itens SET comprado = 1, comprado_em = ?, comprado_por = ?, pago_centavos = ?, atualizado_em = ?
     WHERE id = ? RETURNING ${CAMPOS_ITEM}`,
  ).bind(agora(), email, centavosOpcional(b.pago_centavos, true), agora(), itemId).first();
  if (!item) throw new Erro(404, 'Item não encontrado.');
  return json(item);
}

async function desfazerCompra(env: Env, itemId: number): Promise<Response> {
  const item = await env.DB.prepare(
    `UPDATE itens SET comprado = 0, comprado_em = NULL, comprado_por = NULL, pago_centavos = NULL, atualizado_em = ?
     WHERE id = ? RETURNING ${CAMPOS_ITEM}`,
  ).bind(agora(), itemId).first();
  if (!item) throw new Erro(404, 'Item não encontrado.');
  return json(item);
}

// ---------- cômodos ----------

const CAMPOS_COMODO = 'id, nome, icone, ordem, ativo';

async function erroDeNomeRepetido<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new Erro(409, 'Já existe um cômodo com esse nome.');
    throw e;
  }
}

async function criarComodo(env: Env, req: Request): Promise<Response> {
  const b = await corpo(req);
  const nome = texto(b.nome, 'o nome', 40);
  const ic = icone(b.icone);
  const c = await erroDeNomeRepetido(() =>
    env.DB.prepare(
      `INSERT INTO comodos (nome, icone, ordem) VALUES (?, ?, (SELECT coalesce(max(ordem), 0) + 1 FROM comodos))
       RETURNING ${CAMPOS_COMODO}`,
    ).bind(nome, ic).first(),
  );
  return json(c, 201);
}

async function editarComodo(env: Env, req: Request, comodoId: number): Promise<Response> {
  const b = await corpo(req);
  const atual = await env.DB.prepare(`SELECT ${CAMPOS_COMODO} FROM comodos WHERE id = ?`).bind(comodoId)
    .first<{ nome: string; icone: string; ativo: number }>();
  if (!atual) throw new Erro(404, 'Cômodo não encontrado.');
  const nome = b.nome === undefined ? atual.nome : texto(b.nome, 'o nome', 40);
  const ic = b.icone === undefined ? atual.icone : icone(b.icone);
  let ativo = atual.ativo;
  if (b.ativo !== undefined) {
    if (b.ativo !== 0 && b.ativo !== 1) throw new Erro(400, 'Valor inválido.');
    ativo = b.ativo;
  }
  const c = await erroDeNomeRepetido(() =>
    env.DB.prepare(`UPDATE comodos SET nome = ?, icone = ?, ativo = ? WHERE id = ? RETURNING ${CAMPOS_COMODO}`)
      .bind(nome, ic, ativo, comodoId).first(),
  );
  return json(c);
}

async function ordenarComodos(env: Env, req: Request): Promise<Response> {
  const b = await corpo(req);
  const ids = b.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || !ids.every((x) => Number.isInteger(x) && x > 0)) {
    throw new Erro(400, 'Ordem inválida.');
  }
  await env.DB.batch(ids.map((cid, i) => env.DB.prepare('UPDATE comodos SET ordem = ? WHERE id = ?').bind(i + 1, cid)));
  return json({ ok: true });
}

async function apagarComodo(env: Env, comodoId: number): Promise<Response> {
  const n = await env.DB.prepare('SELECT count(*) AS n FROM itens WHERE comodo_id = ?').bind(comodoId).first<{ n: number }>();
  if (n && n.n > 0) throw new Erro(409, 'Esse cômodo tem itens. Arquive em vez de apagar, ou mova os itens antes.');
  await env.DB.prepare('DELETE FROM comodos WHERE id = ?').bind(comodoId).run();
  return json({ ok: true });
}

// ---------- rotas ----------

async function api(req: Request, env: Env, ctx: AccessCtx): Promise<Response> {
  const url = new URL(req.url);
  const partes = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [recurso, param, acao] = partes;
  const m = req.method;

  // Proteção contra outro site usando a sessão de vocês (CSRF).
  if (m !== 'GET' && req.headers.get('origin') && req.headers.get('origin') !== url.origin) {
    throw new Erro(403, 'Origem não permitida.');
  }

  const email = await quemEsta(env, ctx);

  if (recurso === 'eu' && m === 'GET') return json({ email });

  // Tudo de uma vez: a lista inteira cabe numa resposta pequena.
  if (recurso === 'dados' && m === 'GET') {
    const [comodos, itens] = await env.DB.batch([
      env.DB.prepare(`SELECT ${CAMPOS_COMODO} FROM comodos ORDER BY ordem, nome`),
      env.DB.prepare(`SELECT ${CAMPOS_ITEM} FROM itens ORDER BY id LIMIT 5000`),
    ]);
    return json({ comodos: comodos.results, itens: itens.results });
  }

  if (recurso === 'itens') {
    if (!param && m === 'POST') return criarItem(env, req, email);
    if (param && !acao && m === 'GET') return json(await lerItem(env, id(param)));
    if (param && !acao && m === 'PUT') return editarItem(env, req, id(param));
    if (param && !acao && m === 'DELETE') {
      await env.DB.prepare('DELETE FROM itens WHERE id = ?').bind(id(param)).run();
      return json({ ok: true });
    }
    if (param && acao === 'comprar' && m === 'POST') return comprar(env, req, email, id(param));
    if (param && acao === 'desfazer' && m === 'POST') return desfazerCompra(env, id(param));
  }

  if (recurso === 'comodos') {
    if (!param && m === 'POST') return criarComodo(env, req);
    if (param === 'ordem' && m === 'POST') return ordenarComodos(env, req);
    if (param && m === 'PATCH') return editarComodo(env, req, id(param));
    if (param && m === 'DELETE') return apagarComodo(env, id(param));
  }

  throw new Erro(404, 'Rota não encontrada.');
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext & AccessCtx): Promise<Response> {
    try {
      return await api(req, env, ctx);
    } catch (e) {
      if (e instanceof Erro) return json({ erro: e.message }, e.status);
      console.error(e);
      return json({ erro: 'Erro inesperado. Tente de novo.' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
