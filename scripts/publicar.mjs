// Publica o app a partir de um computador ou da sessão do Claude.
// O painel (Workers Builds) faz a mesma coisa sozinho a cada push:
// `npm run build` (Vite + embutir o site no Worker) e `npx wrangler deploy`.
//
// Uso (na raiz do repositório):
//   CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> node scripts/publicar.mjs

import { execSync } from 'node:child_process';

const rodar = (cmd) => execSync(cmd, { stdio: 'inherit' });
rodar('npm run build');
rodar('npx wrangler deploy');
