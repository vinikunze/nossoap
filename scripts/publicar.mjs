// Publica o app a partir da sessão do Claude.
//
// Por que não `wrangler deploy` direto: o envio dos arquivos estáticos usa
// uma senha temporária própria no cabeçalho Authorization, e o proxy desta
// sessão troca esse cabeçalho pelo token da Cloudflare, o que dá 401.
// Aqui os arquivos do site vão EMBUTIDOS no Worker, e só o Worker é enviado,
// com o token. Para duas pessoas, servir do Worker não muda nada.
//
// Uso (na raiz do repositório):
//   CLOUDFLARE_API_TOKEN=<qualquer coisa: o proxy troca> \
//   CLOUDFLARE_ACCOUNT_ID=<id> node scripts/publicar.mjs
//
// Publicar pelo painel (Workers Builds) continua funcionando com o
// wrangler.jsonc normal: este script é só o caminho alternativo.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const rodar = (cmd) => execSync(cmd, { stdio: 'inherit' });

rodar('npx vite build');

const raiz = 'dist/client';
const arquivos = {};
(function andar(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) { andar(caminho); continue; }
    const tipo = TIPOS[extname(nome)];
    if (!tipo) continue; // .assetsignore e afins
    arquivos[`/${relative(raiz, caminho).split('\\').join('/')}`] = {
      tipo,
      b64: readFileSync(caminho).toString('base64'),
    };
  }
})(raiz);
if (!arquivos['/index.html']) throw new Error('Build sem index.html');

mkdirSync('.publicar', { recursive: true });
writeFileSync('.publicar/arquivos.js', `export const ARQUIVOS = ${JSON.stringify(arquivos)};\n`);
writeFileSync('.publicar/entrada.ts', `// Gerado por scripts/publicar.mjs. Não editar.
import api from '../worker/index';
// @ts-ignore gerado
import { ARQUIVOS } from './arquivos.js';

const cache = new Map<string, Uint8Array>();
function bytes(caminho: string): Uint8Array {
  let b = cache.get(caminho);
  if (!b) {
    b = Uint8Array.from(atob(ARQUIVOS[caminho].b64), (c) => c.charCodeAt(0));
    cache.set(caminho, b);
  }
  return b;
}

export default {
  async fetch(req: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return api.fetch(req, env, ctx);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Método não permitido', { status: 405 });
    // Rota desconhecida cai no index.html: é um app de página única.
    const caminho = ARQUIVOS[url.pathname] ? url.pathname : '/index.html';
    const imutavel = caminho.startsWith('/assets/'); // nome com hash (JS, CSS, fontes): nunca muda
    return new Response(req.method === 'HEAD' ? null : bytes(caminho), {
      headers: {
        'content-type': ARQUIVOS[caminho].tipo,
        'cache-control': imutavel ? 'public, max-age=31536000, immutable' : 'no-cache',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
      },
    });
  },
};
`);

// Mesma configuração do wrangler.jsonc, sem os arquivos estáticos e sem o login simulado.
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, ''));
delete config.$schema;
delete config.assets;
delete config.access;
config.main = 'entrada.ts';
config.d1_databases = config.d1_databases.map((d) => ({ ...d, migrations_dir: '../migrations' }));
writeFileSync('.publicar/wrangler.json', JSON.stringify(config, null, 2));

console.log(`\n${Object.keys(arquivos).length} arquivos embutidos. Publicando…\n`);
rodar('npx wrangler deploy --config .publicar/wrangler.json');
