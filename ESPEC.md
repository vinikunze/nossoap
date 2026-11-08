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

Cada item mora em **um cômodo**. Cômodos prontos, editáveis (renomear, criar,
reordenar, arquivar):

Cozinha · Sala · Quarto · Banheiro · Lavanderia · Escritório · Área externa ·
Geral (o que não é de um cômodo só: ferramentas, produtos de limpeza…)

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

Proposta: mesma família visual do app de finanças ("nós.", preto e dourado),
para os dois apps parecerem irmãos. Ver "Pendências".

- Ícone de linha para cada cômodo.
- Valores sempre com centavos.
- Tema escuro único, como no app de finanças.

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

1. **Primeiro**: banco, API, Lista, cadastrar/editar/marcar comprado, Início.
2. Depois: filtros, busca, Ajustes de cômodos, ícone instalável.

## Fora do escopo (por enquanto)

- Integração com o app de finanças (lançar o gasto lá ao marcar comprado).
  Os apps ficam separados; dá para ligar depois.
- Foto do produto (precisaria do R2, que tem 10 GB grátis).
- Comparar várias lojas para o mesmo item.
- Marcar presentes recebidos (chá de casa nova).
- Inspirações / itens "em dúvida".
- IA, WhatsApp, notificações.

## Pendências

- **Visual**: repetir o preto e dourado do app de finanças ou ter cor própria?
- **Nome**: "nosso ap." serve?
- **Vini, na Cloudflare** (o Zero Trust já deve estar ativo por causa do app
  de finanças):
  1. Ligar este repositório a um Worker novo (Workers Builds).
  2. Criar uma aplicação no Access para o endereço novo, com os dois e-mails.
- **Cômodos**: a lista acima bate com o apartamento de vocês? (tem
  escritório? varanda?)
