# nosso ap. — lista de compras do apartamento (especificação)

Decidido com o Vini em 08/11/2026. Reconstrução **do zero**: o app de viagem
que existia neste repositório foi apagado (continua no histórico do git).
Este arquivo é a referência; o que não está aqui ainda não foi decidido.

## Em uma frase

Um app só do Vini e da Sophia para listar **o que falta comprar para montar o
apartamento**, organizado por cômodo, com quanto vai custar e quanto já foi.

## Quem usa

- Só os dois. Não é produto, não é para vender.
- Cada um tem o **próprio login**, os dois veem **a mesma lista**.
- Quem cadastrou e quem marcou como comprado ficam gravados no banco, mas não
  aparecem na tela.

## Organização: por cômodo

Cada item mora em **um cômodo**. Cômodos prontos (lista do Vini, 08/11/2026),
editáveis (renomear, criar, reordenar, arquivar):

Cozinha · Lavanderia · Sala de estar · Quarto · Banheiro ·
Quarto de visita / Escritório

Cada cômodo mostra uma **barra de progresso**: itens comprados ÷ itens da lista.

## Item

| Campo | Obrigatório | Observação |
|---|---|---|
| Nome | sim | "Jogo de talheres 24 peças" |
| Cômodo | sim | |
| Quantidade | sim (padrão 1) | |
| Prioridade | sim (padrão "logo") | **Essencial** (antes de mudar) · **Logo** (primeiro mês) · **Um dia** |
| Preço estimado | não | por unidade, em centavos |
| Preço pago | não | total pago, preenchido ao marcar comprado |
| Link da loja | não | um link; abre em nova aba |
| Observação | não | cor, medida, modelo |
| Comprado | sim (padrão não) | com a data em que foi marcado |

## Telas

Barra inferior no celular, barra lateral no computador.

1. **Início**
   - Quanto falta gastar (soma dos estimados dos itens não comprados).
   - Quanto já gastaram (soma dos pagos).
   - Progresso geral e por cômodo.
   - Essenciais que ainda faltam.
2. **Lista**
   - Agrupada por cômodo, com filtro por prioridade e "mostrar comprados".
   - Busca por nome.
   - Marcar comprado com um toque; ao marcar, pergunta o preço pago (pode pular).
3. **Cômodo** (ao tocar num cômodo): só os itens dele, bom para usar dentro
   da loja.
4. **Ajustes**: cômodos, sair.

Um botão **+** sempre visível para cadastrar item em segundos. O detalhe do
item abre numa **gaveta que sobe de baixo** no celular e num painel lateral no
computador, igual ao app de finanças.

## Visual

**Branco, dourado e azul-marinho** (Vini, 08/11/2026). Tema claro único.

- Marinho é a cor de ação (botões, item ativo) e do destaque da tela inicial.
- Dourado é a marca: barras de progresso, ícones dos cômodos, o ponto do logo.
- O dourado claro não tem contraste para texto no branco; texto dourado usa um
  tom mais escuro. Todos os textos passam de 4,5:1.
- Ícone de linha para cada cômodo. Valores sempre com centavos.

## Maquete 3D (pedido do Vini, 08/11/2026)

A planta do apartamento (Apartamento Padrão, 48,29 m², pé-direito 2,80 m) foi
redesenhada em metros em `shared/planta.ts`.

- **Início**: o apartamento inteiro em 3D, cortado a 1,1 m de altura como uma
  planta de arquiteto, com o nome e o % de cada cômodo. Tocar num cômodo entra
  nele. No celular a vista gira 90° para a planta ocupar a tela em pé.
- **Cômodo**: só ele, com paredes inteiras; as que ficam na frente da câmera
  ficam transparentes. A câmera escolhe sozinha o ângulo em que o cômodo
  aparece maior. Arrastar gira.
- **Os itens da lista aparecem na maquete**: o nome do item decide o lugar
  ("Geladeira Brastemp" vai para o lugar da geladeira). Comprado = sólido, com
  cor; falta comprar = fantasma azul com contorno dourado. Item que não é móvel
  (talheres, pratos, toalhas) vira um pacotinho no apoio do cômodo (na
  cozinha, sobre a bancada). Tocar num móvel abre o item.
- Pia, vaso, box, tanque e bancadas vêm com o apartamento: aparecem sempre.
- Cada cômodo da lista é ligado a um lugar da planta (Ajustes → editar cômodo
  → "Na planta 3D"). Cômodo criado por vocês pode ficar sem maquete.
- **Correções da planta com o Vini (08/11/2026)**: não existe mureta no alto
  entre a cozinha e a sala nem bancada (ilha) entre as duas; existe a parede
  entre a lavanderia e a sala, ao lado do sofá. A porta de entrada fica no
  alto, ao lado da mesa de jantar. Portas desenhadas abertas, com o arco no
  chão (entrada, banheiro, quarto de casal, quarto de visita); janelas em azul
  na lavanderia, sala, banheiro e nos dois quartos. Tudo em `PORTAS` e
  `JANELAS` em `shared/planta.ts`.
- O Three.js só é baixado quando a maquete aparece (145 KB comprimido); a
  lista sozinha tem 40 KB.

## Conta e instalação

- Login pelo **Cloudflare Access**, com **código por e-mail** (zero
  configuração; Google exigiria credencial OAuth).
- **Instalável** na tela do celular (ícone, abre sem barra do navegador).
- **Nenhuma notificação.**

## Infraestrutura: tudo na Cloudflare, plano gratuito

Mesmo desenho do `assessor-do-casal/app`.

| Peça | Produto Cloudflare |
|---|---|
| Site e app instalável | Workers (arquivos estáticos) |
| API | Worker (`worker/index.ts`) |
| Banco | D1 (SQLite) |
| Login | Access (Zero Trust Free), só os dois e-mails |
| Backup | D1 Time Travel (qualquer minuto dos últimos 7 dias) |

**Limites do plano gratuito** (os mesmos conferidos para o app de finanças em
05/11/2026): 100 mil requisições/dia no Worker (arquivos estáticos não
contam); D1 com 5 milhões de linhas lidas e 100 mil escritas por dia, 500 MB
por banco. Uma lista de algumas centenas de itens fica milhares de vezes
abaixo. Os limites são **por conta**: o app de finanças e o `crmsmartmold`
dividem a mesma cota, e ainda sobra muito.

**Segunda trava**: a API confere o e-mail de novo (`EMAILS_PERMITIDOS`), além
do Access. Se o Access for mal configurado, a API continua fechada.

**Construção**: Svelte 5 + Vite + `@cloudflare/vite-plugin`, TypeScript,
dinheiro em centavos inteiros, ícones `@lucide/svelte`. Publicação pelo
Workers Builds (push no GitHub publica) ou pelo `scripts/publicar.mjs`, como
no app de finanças.

## Ordem de entrega

1. Feito em 08/11/2026: banco, API, Lista, cadastrar/editar/marcar comprado,
   Início, filtros, busca, sugestões por cômodo, Ajustes de cômodos, ícone
   instalável e maquete 3D.
2. Falta: publicar (passos do Vini no painel da Cloudflare, ver Pendências).

## Fora do escopo (por enquanto)

- Integração com o app de finanças (lançar o gasto lá ao marcar comprado).
  Os apps ficam separados; dá para ligar depois.
- Foto do produto (precisaria do R2, que tem 10 GB grátis).
- Arrastar móveis na maquete para mudar de lugar (o lugar de cada móvel é fixo).
- Comparar várias lojas para o mesmo item.
- Marcar presentes recebidos (chá de casa nova).
- Inspirações / itens "em dúvida".
- IA, WhatsApp, notificações.

## Pendências

- **Vini, na Cloudflare** (o banco D1 `nosso-ap` já foi criado e preparado):
  1. Workers & Pages → Create → Import a repository → `vinikunze/nossoap`.
     Build: `npm run build`. Deploy: `npx wrangler deploy`. Raiz: `/`.
     Branch de produção: a que tiver este código.
  2. Zero Trust → Access → Applications → Add → Self-hosted: domínio
     `nossoap.vinihkunze.workers.dev`, política "Allow" com os dois e-mails,
     login por código no e-mail (One-time PIN).
  3. Abrir o endereço no celular e "Adicionar à tela de início".
- Sem o passo 2 o site abre, mas a API recusa tudo (não há login), então
  nenhum dado fica exposto.
