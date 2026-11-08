<script lang="ts">
  // A lista inteira, agrupada por cômodo, ou um cômodo só (com comodo=).
  // A tela do cômodo é a que se usa dentro da loja.
  import { Search, X, Sparkles, Plus } from '@lucide/svelte';
  import type { Comodo, Prioridade } from '../../shared/tipos';
  import { PRIORIDADES } from '../../shared/tipos';
  import { ordenar, totais } from '../../shared/resumo';
  import { combina } from '../../shared/texto';
  import { sugestoesPara, type Sugestao } from '../../shared/sugestoes';
  import { estado } from '../lib/estado.svelte';
  import { api, novaChave } from '../lib/api';
  import LinhaItem from '../lib/LinhaItem.svelte';
  import Icone from '../lib/Icone.svelte';
  import Valor from '../lib/Valor.svelte';
  import Planta3D from '../lib/Planta3D.svelte';
  import { area as areaDaPlanta } from '../../shared/planta';

  let { comodo }: { comodo?: Comodo } = $props();

  let busca = $state('');
  let prioridade = $state<Prioridade | null>(null);
  let mostrarComprados = $state(false);

  const doLugar = $derived(comodo ? estado.itens.filter((i) => i.comodo_id === comodo.id) : estado.itens);
  const resumo = $derived(totais(doLugar));
  const filtrados = $derived(
    ordenar(
      doLugar.filter(
        (i) =>
          (mostrarComprados || !i.comprado) &&
          (!prioridade || i.prioridade === prioridade) &&
          (!busca || combina(`${i.nome} ${i.obs ?? ''}`, busca)),
      ),
    ),
  );
  const filtrando = $derived(!!busca || !!prioridade);

  // Na lista inteira: grupos na ordem dos cômodos. Item de cômodo arquivado
  // continua aparecendo no grupo dele.
  const grupos = $derived.by(() => {
    if (comodo) return [];
    return estado.comodos
      .map((c) => ({ comodo: c, itens: filtrados.filter((i) => i.comodo_id === c.id) }))
      .filter((g) => g.itens.length > 0);
  });

  const sugestoes = $derived(comodo ? sugestoesPara(comodo.nome, doLugar.map((i) => i.nome)) : []);
  let adicionando = $state<string | null>(null);

  async function adicionar(s: Sugestao) {
    if (!comodo || adicionando) return;
    adicionando = s.nome;
    try {
      const item = await api.criarItem({
        chave: novaChave(),
        comodo_id: comodo.id,
        nome: s.nome,
        quantidade: s.quantidade ?? 1,
        prioridade: s.prioridade,
        estimado_centavos: null,
        link: null,
        obs: null,
      });
      estado.guardar(item);
    } catch (e) {
      estado.erro(e);
    } finally {
      adicionando = null;
    }
  }
</script>

{#if comodo && areaDaPlanta(comodo.area)}
  <div class="maquete"><Planta3D modo={areaDaPlanta(comodo.area)!.id} /></div>
{/if}

{#if comodo}
  <section class="cartao topo-comodo">
    <div class="linha">
      <span class="icone-comodo"><Icone nome={comodo.icone} tamanho={22} /></span>
      <div class="info">
        <p class="num"><strong>{resumo.comprados}</strong> de {resumo.itens} {resumo.itens === 1 ? 'item comprado' : 'itens comprados'}</p>
        <p class="falta">
          Falta gastar <strong><Valor centavos={resumo.falta_centavos} /></strong>
          {#if resumo.sem_preco}<span class="obs">· {resumo.sem_preco} sem preço</span>{/if}
        </p>
      </div>
      <span class="pct num">{resumo.progresso}%</span>
    </div>
    <div class="barra" role="progressbar" aria-valuenow={resumo.progresso} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do cômodo">
      <i class:completa={resumo.progresso === 100} style:width="{resumo.progresso}%"></i>
    </div>
    {#if !comodo.ativo}<p class="obs">Este cômodo está arquivado. Reative em Ajustes para cadastrar itens nele.</p>{/if}
  </section>
{/if}

<div class="filtros">
  <label class="busca">
    <Search size={18} />
    <span class="sr">Buscar</span>
    <input class="entrada" type="search" placeholder="Buscar item" bind:value={busca} />
    {#if busca}
      <button class="limpar" onclick={() => (busca = '')} aria-label="Limpar busca"><X size={16} /></button>
    {/if}
  </label>
  <div class="chips" role="group" aria-label="Filtrar">
    {#each PRIORIDADES as p (p.valor)}
      <button class="chip" aria-pressed={prioridade === p.valor} onclick={() => (prioridade = prioridade === p.valor ? null : p.valor)}>
        {p.nome}
      </button>
    {/each}
    <button class="chip" aria-pressed={mostrarComprados} onclick={() => (mostrarComprados = !mostrarComprados)}>
      Comprados ({resumo.comprados})
    </button>
  </div>
</div>

{#if doLugar.length === 0}
  <section class="cartao vazio-grande">
    <p><strong>{comodo ? 'Nada neste cômodo ainda.' : 'A lista está vazia.'}</strong></p>
    <p>Toque em <strong>+</strong> para cadastrar o primeiro item{comodo && sugestoes.length ? ', ou escolha nas sugestões abaixo' : ''}.</p>
  </section>
{:else if filtrados.length === 0}
  <p class="cartao vazio">
    {#if filtrando}Nenhum item com esse filtro.{:else}Tudo comprado por aqui. 🎉{/if}
  </p>
{:else if comodo}
  <ul class="cartao lista">
    {#each filtrados as item (item.id)}<LinhaItem {item} />{/each}
  </ul>
{:else}
  {#each grupos as g (g.comodo.id)}
    <section class="grupo">
      <a class="cabeca" href="#comodo/{g.comodo.id}">
        <Icone nome={g.comodo.icone} tamanho={18} />
        <h2>{g.comodo.nome}</h2>
        <span class="n num">{g.itens.length}</span>
      </a>
      <ul class="cartao lista">
        {#each g.itens as item (item.id)}<LinhaItem {item} />{/each}
      </ul>
    </section>
  {/each}
{/if}

{#if comodo?.ativo && sugestoes.length}
  <details class="sugestoes" open={doLugar.length < 3}>
    <summary><Sparkles size={18} /> Sugestões para {comodo.nome.toLowerCase()} <span class="n num">{sugestoes.length}</span></summary>
    <p class="obs">Toque para pôr na lista. Depois dá para ajustar preço, quantidade e link.</p>
    <div class="chips soltos">
      {#each sugestoes as s (s.nome)}
        <button class="chip" onclick={() => adicionar(s)} disabled={adicionando !== null}>
          <Plus size={14} />
          {#if s.quantidade}{s.quantidade}× {/if}{s.nome}
        </button>
      {/each}
    </div>
  </details>
{/if}

<style>
  .maquete { margin-bottom: var(--esp-4); }
  .topo-comodo { display: grid; gap: var(--esp-3); margin-bottom: var(--esp-4); }
  .linha { display: flex; align-items: center; gap: var(--esp-3); }
  .info { flex: 1; display: grid; gap: 2px; }
  .falta { font-size: var(--fs-300); color: var(--texto-2); }
  .pct { font-size: var(--fs-600); font-weight: var(--fw-bold); color: var(--marinho); }
  .obs { font-size: var(--fs-200); color: var(--texto-3); }

  .filtros { display: grid; gap: var(--esp-3); margin-bottom: var(--esp-4); }
  .busca { position: relative; display: flex; align-items: center; }
  .busca > :global(svg) { position: absolute; left: 14px; color: var(--texto-3); pointer-events: none; }
  .busca input { padding-left: 42px; padding-right: 40px; }
  .limpar {
    position: absolute;
    right: 4px;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 0;
    background: none;
    color: var(--texto-3);
  }
  .chips { display: flex; gap: var(--esp-2); overflow-x: auto; scrollbar-width: none; margin: 0 calc(-1 * var(--esp-4)); padding: 0 var(--esp-4); }
  .chips::-webkit-scrollbar { display: none; }
  .soltos { flex-wrap: wrap; overflow: visible; margin: 0; padding: 0; }

  .lista { list-style: none; margin: 0; padding: 0 var(--esp-3) 0 var(--esp-1); }
  .grupo { margin-bottom: var(--esp-5); }
  .cabeca {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    padding: 0 var(--esp-1) var(--esp-2);
    color: var(--texto);
    text-decoration: none;
  }
  .cabeca :global(svg) { color: var(--dourado-texto); }
  .cabeca h2 { font-size: var(--fs-400); font-weight: var(--fw-semi); }
  .cabeca:hover h2 { text-decoration: underline; text-underline-offset: 3px; }
  .n { font-size: var(--fs-100); font-weight: var(--fw-semi); color: var(--texto-3); background: var(--superficie-2); border-radius: 999px; padding: 1px 8px; }

  .vazio-grande { display: grid; gap: var(--esp-1); text-align: center; padding: var(--esp-6) var(--esp-4); color: var(--texto-2); }

  .sugestoes { margin-top: var(--esp-5); display: grid; gap: var(--esp-3); }
  .sugestoes summary {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    min-height: 44px;
    font-weight: var(--fw-semi);
    cursor: pointer;
    list-style: none;
  }
  .sugestoes summary::-webkit-details-marker { display: none; }
  .sugestoes summary :global(svg) { color: var(--dourado-texto); }
  .sugestoes .obs { margin-bottom: var(--esp-3); }
  .sugestoes .chip:disabled { opacity: 0.6; }

  @media (min-width: 1024px) {
    .chips { margin: 0; padding: 0; flex-wrap: wrap; }
  }
</style>
