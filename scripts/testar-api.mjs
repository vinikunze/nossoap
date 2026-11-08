// Roteiro de verificações da API contra o servidor local.
// Uso: com `npm run dev` rodando e o banco local recém-criado:
//   node scripts/testar-api.mjs
// Cria dados de teste no banco LOCAL (.wrangler/). Nunca rode contra o remoto.

const BASE = process.env.BASE ?? 'http://localhost:5173';
let ok = 0, falhou = 0;

async function pedir(metodo, caminho, corpo, cabecalhos = {}) {
  const r = await fetch(`${BASE}/api/${caminho}`, {
    method: metodo,
    headers: { ...(corpo === undefined ? {} : { 'content-type': 'application/json' }), ...cabecalhos },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return { status: r.status, dados: await r.json().catch(() => null) };
}

function conferir(nome, condicao, detalhe) {
  if (condicao) { ok++; console.log(`  ok  ${nome}`); }
  else { falhou++; console.log(`FALHOU ${nome}`, detalhe ?? ''); }
}

const chave = () => crypto.randomUUID();
const { dados: inicial } = await pedir('GET', 'dados');
const cozinha = inicial.comodos.find((c) => c.nome === 'Cozinha');
conferir('seis cômodos padrão', inicial.comodos.length >= 6, inicial.comodos.length);

// Cadastro
const k = chave();
const novo = await pedir('POST', 'itens', { chave: k, comodo_id: cozinha.id, nome: '  Talheres   24 peças ', quantidade: 2, prioridade: 'essencial', estimado_centavos: 8990, link: 'amazon.com.br/dp/1', obs: 'inox' });
conferir('cria item (201)', novo.status === 201, novo);
conferir('limpa espaços do nome', novo.dados?.nome === 'Talheres 24 peças', novo.dados?.nome);
conferir('completa https no link', novo.dados?.link === 'https://amazon.com.br/dp/1', novo.dados?.link);
const id = novo.dados.id;

const repetido = await pedir('POST', 'itens', { chave: k, comodo_id: cozinha.id, nome: 'Outro nome' });
conferir('mesma chave não duplica', repetido.status === 200 && repetido.dados.id === id, repetido);

const padrao = await pedir('POST', 'itens', { chave: chave(), comodo_id: cozinha.id, nome: 'Pratos' });
conferir('padrões: quantidade 1, prioridade logo, sem preço', padrao.dados?.quantidade === 1 && padrao.dados?.prioridade === 'logo' && padrao.dados?.estimado_centavos === null, padrao.dados);

// Validação
const casos = [
  ['sem nome', { chave: chave(), comodo_id: cozinha.id, nome: '  ' }],
  ['link javascript:', { chave: chave(), comodo_id: cozinha.id, nome: 'x', link: 'javascript:alert(1)' }],
  ['quantidade zero', { chave: chave(), comodo_id: cozinha.id, nome: 'x', quantidade: 0 }],
  ['preço quebrado', { chave: chave(), comodo_id: cozinha.id, nome: 'x', estimado_centavos: 10.5 }],
  ['prioridade inventada', { chave: chave(), comodo_id: cozinha.id, nome: 'x', prioridade: 'urgente' }],
  ['cômodo inexistente', { chave: chave(), comodo_id: 9999, nome: 'x' }],
  ['chave curta', { chave: 'abc', comodo_id: cozinha.id, nome: 'x' }],
];
for (const [nome, corpo] of casos) {
  const r = await pedir('POST', 'itens', corpo);
  conferir(`recusa ${nome} (400)`, r.status === 400 && typeof r.dados?.erro === 'string', r);
}

// Comprar e desfazer
const comp = await pedir('POST', `itens/${id}/comprar`, { pago_centavos: 15000 });
conferir('marca comprado com preço', comp.dados?.comprado === 1 && comp.dados?.pago_centavos === 15000 && !!comp.dados?.comprado_em, comp);
const ed = await pedir('PUT', `itens/${id}`, { ...comp.dados, nome: 'Talheres', pago_centavos: 14000 });
conferir('edita preço pago de item comprado', ed.dados?.pago_centavos === 14000 && ed.dados?.nome === 'Talheres', ed);
const desf = await pedir('POST', `itens/${id}/desfazer`);
conferir('desfazer limpa comprado e preço pago', desf.dados?.comprado === 0 && desf.dados?.pago_centavos === null && desf.dados?.comprado_em === null, desf);
const ed2 = await pedir('PUT', `itens/${id}`, { ...desf.dados, pago_centavos: 999 });
conferir('item não comprado não guarda preço pago', ed2.dados?.pago_centavos === null, ed2);
const semPreco = await pedir('POST', `itens/${padrao.dados.id}/comprar`, { pago_centavos: null });
conferir('comprar sem informar preço', semPreco.dados?.comprado === 1 && semPreco.dados?.pago_centavos === null, semPreco);

// Segurança
const csrf = await pedir('POST', 'itens', { chave: chave(), comodo_id: cozinha.id, nome: 'x' }, { origin: 'https://site-malicioso.com' });
conferir('recusa outra origem (403)', csrf.status === 403, csrf);
const nada = await pedir('GET', 'itens/abc');
conferir('id inválido dá 404', nada.status === 404, nada);
const rota = await pedir('GET', 'nao-existe');
conferir('rota desconhecida dá 404', rota.status === 404, rota);

// Cômodos
const varanda = await pedir('POST', 'comodos', { nome: 'Varanda', icone: 'flor' });
conferir('cria cômodo', varanda.status === 201 && varanda.dados?.nome === 'Varanda', varanda);
const dup = await pedir('POST', 'comodos', { nome: 'Varanda', icone: 'flor' });
conferir('nome de cômodo repetido (409)', dup.status === 409, dup);
const iconeRuim = await pedir('POST', 'comodos', { nome: 'Garagem', icone: '<script>' });
conferir('ícone inválido (400)', iconeRuim.status === 400, iconeRuim);
const apagarCheio = await pedir('DELETE', `comodos/${cozinha.id}`);
conferir('não apaga cômodo com itens (409)', apagarCheio.status === 409, apagarCheio);
const arq = await pedir('PATCH', `comodos/${varanda.dados.id}`, { ativo: 0 });
conferir('arquiva cômodo', arq.dados?.ativo === 0, arq);
const noArquivado = await pedir('POST', 'itens', { chave: chave(), comodo_id: varanda.dados.id, nome: 'Vaso' });
conferir('não cadastra em cômodo arquivado (400)', noArquivado.status === 400, noArquivado);
const ids = [varanda.dados.id, ...inicial.comodos.map((c) => c.id)];
const ord = await pedir('POST', 'comodos/ordem', { ids });
const depois = await pedir('GET', 'dados');
conferir('reordena cômodos', ord.status === 200 && depois.dados.comodos[0].id === varanda.dados.id, depois.dados.comodos.map((c) => c.nome));
await pedir('POST', 'comodos/ordem', { ids: inicial.comodos.map((c) => c.id).concat(varanda.dados.id) });
const areaRepetida = await pedir('PATCH', `comodos/${varanda.dados.id}`, { area: 'cozinha' });
conferir('lugar da planta já usado (409)', areaRepetida.status === 409, areaRepetida);
const areaRuim = await pedir('PATCH', `comodos/${varanda.dados.id}`, { area: 'garagem' });
conferir('lugar da planta inventado (400)', areaRuim.status === 400, areaRuim);
const semArea = await pedir('PATCH', `comodos/${varanda.dados.id}`, { area: null });
conferir('cômodo sem maquete', semArea.status === 200 && semArea.dados.area === null, semArea);
const apagarVazio = await pedir('DELETE', `comodos/${varanda.dados.id}`);
conferir('apaga cômodo vazio', apagarVazio.status === 200, apagarVazio);

// Limpeza
for (const i of [id, padrao.dados.id]) await pedir('DELETE', `itens/${i}`);
const fim = await pedir('GET', 'dados');
conferir('apaga itens', !fim.dados.itens.some((i) => i.id === id), fim.dados.itens.length);

console.log(`\n${ok} ok, ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
