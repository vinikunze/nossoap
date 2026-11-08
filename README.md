# nosso ap.

Lista do que falta comprar para montar o apartamento do Vini e da Sophia, com
a maquete 3D do apartamento. App privado, só para os dois.

Especificação e decisões: [`ESPEC.md`](ESPEC.md).

Tudo na Cloudflare, plano gratuito, no mesmo desenho do app de finanças
(`assessor-do-casal/app`): um **Worker** serve o site (Svelte) e a API
(`worker/index.ts`), o banco é **D1** e o login é o **Access** na frente de
tudo.

## Pastas

| Pasta | O que tem |
|---|---|
| `shared/` | Lógica pura, usada pela tela e pela API: dinheiro em centavos, resumo (falta/gasto/progresso), busca, sugestões por cômodo e **a planta** (`planta.ts`: paredes, cômodos, lugar de cada móvel) |
| `worker/` | API. Confere o login, valida tudo, grava no D1 |
| `src/` | Telas (Svelte 5). A maquete 3D é `src/lib/planta3d.ts` (Three.js, carregado só quando aparece) |
| `migrations/` | Estrutura do banco |
| `tests/` | Testes da lógica (`npm test`) |
| `scripts/testar-api.mjs` | 33 verificações da API contra o servidor local |

## Rodar no computador

```bash
npm install
npm run db:local        # cria o banco de teste em .wrangler/
npm run dev             # http://localhost:5173 — já "logado" como o Vini
node scripts/testar-api.mjs   # com o dev rodando
npm test                # lógica pura
npm run check           # tipos
```

O login é simulado pelo bloco `access.dev` do `wrangler.jsonc`, que só vale
no computador.

## Publicar

Banco D1 `nosso-ap` (`1ca5a1b0-485d-4974-88da-6b53d484d5d3`) já criado, com a
migração `0001` aplicada. Endereço previsto:
**https://nossoap.vinihkunze.workers.dev**.

**Pelo painel (é o que está ligado):** Workers Builds no Worker `nossoap`,
branch `claude/stoic-galileo-l3n991`, raiz `/`, build `npm run build`, deploy
`npx wrangler deploy`. Cada push publica. O login é o Access do próprio Worker
(aba **Access**), com os dois e-mails.

**O site vai embutido dentro do Worker** (`scripts/embutir.mjs`, que roda no
fim do `npm run build`). Servido como "arquivos estáticos", a Cloudflare põe um
Worker roteador na frente e ele não repassa o login (`ctx.access`) para a API:
o app ficava em "Sessão expirada". O `embutir.mjs` também aponta o
`wrangler deploy` para `.publicar/wrangler.json`. No computador, `npm run dev`
continua normal.

**De outro lugar:** `node scripts/publicar.mjs` com `CLOUDFLARE_API_TOKEN` e
`CLOUDFLARE_ACCOUNT_ID`.

**Mudança no banco** não é aplicada pelo deploy. Crie `migrations/000N_nome.sql`
e aplique no remoto (MCP da Cloudflare ou `npm run db:remote`). Ao aplicar pelo
MCP, registre também em `d1_migrations`.

## Decisões que não são óbvias

- **Dinheiro em centavos inteiros**, sempre. Preço estimado é **por unidade**;
  preço pago é o **total**.
- **`itens.chave`** é gerada no aparelho: se a rede cair e o app reenviar, o
  banco devolve o item já criado em vez de duplicar.
- **Resumo calculado no aparelho**: a lista inteira vem numa chamada só
  (`/api/dados`). Para algumas centenas de itens é instantâneo e não gasta cota.
- **"Falta gastar" não conta item sem preço**; a tela diz quantos estão sem preço.
- **Progresso arredonda para baixo**: 100% só quando tudo foi comprado.
- **Móvel na maquete pelo nome**: vale a palavra que aparece primeiro no nome
  ("Luminária de mesa" é luminária). Coisas de cama, mesa e banho nunca viram
  móvel ("Jogo de cama" não é cama). Ver `shared/planta.ts`.
- **A API confere o e-mail de novo** (`EMAILS_PERMITIDOS`), além do Access.
- **Link da loja só http/https**: `javascript:` num link clicável seria porta
  para código malicioso.
- **Sem service worker**, pelo mesmo motivo do app de finanças: o Access
  redireciona para o login e um cache offline no meio disso dá tela em branco.
