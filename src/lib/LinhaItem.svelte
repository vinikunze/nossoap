<script lang="ts">
  // Uma linha da lista. O círculo marca como comprado (ou desfaz);
  // o resto da linha abre o item para editar.
  import { Check, ExternalLink } from '@lucide/svelte';
  import type { Item } from '../../shared/tipos';
  import { nomeDaPrioridade } from '../../shared/tipos';
  import { estimadoTotal } from '../../shared/resumo';
  import { dominio } from '../../shared/texto';
  import { estado } from './estado.svelte';
  import Valor from './Valor.svelte';

  let { item, mostrarComodo = false }: { item: Item; mostrarComodo?: boolean } = $props();

  const total = $derived(item.comprado ? item.pago_centavos : estimadoTotal(item));
  const comodo = $derived(mostrarComodo ? estado.comodo(item.comodo_id)?.nome : undefined);

  function alternar() {
    if (item.comprado) estado.desfazer(item);
    else estado.gaveta = { tipo: 'comprar', item };
  }
</script>

<li class:feito={item.comprado}>
  <button
    class="marcar"
    onclick={alternar}
    aria-label={item.comprado ? `Desmarcar ${item.nome}` : `Marcar ${item.nome} como comprado`}
    aria-pressed={!!item.comprado}
  >
    <span class="circulo">{#if item.comprado}<Check size={16} strokeWidth={3} />{/if}</span>
  </button>
  <button class="corpo" onclick={() => (estado.gaveta = { tipo: 'editar', item })}>
    <span class="nome">
      {#if item.quantidade > 1}<span class="qtd num">{item.quantidade}×</span>{/if}
      {item.nome}
    </span>
    <span class="meta">
      {#if item.comprado}
        <span class="selo comprado">Comprado</span>
      {:else if item.prioridade === 'essencial'}
        <span class="selo essencial">{nomeDaPrioridade(item.prioridade)}</span>
      {:else if item.prioridade === 'um_dia'}
        <span class="selo">{nomeDaPrioridade(item.prioridade)}</span>
      {/if}
      {#if comodo}<span>{comodo}</span>{/if}
      {#if item.link}<span>{dominio(item.link)}</span>{/if}
    </span>
  </button>
  <span class="valor">
    {#if total !== null}<Valor centavos={total} />{:else}<span class="sem">sem preço</span>{/if}
  </span>
  {#if item.link}
    <a class="abrir" href={item.link} target="_blank" rel="noopener noreferrer" aria-label="Abrir o link de {item.nome}">
      <ExternalLink size={18} />
    </a>
  {/if}
</li>

<style>
  li {
    display: flex;
    align-items: center;
    gap: var(--esp-1);
    min-height: 60px;
    border-bottom: 1px solid var(--borda);
  }
  li:last-child { border-bottom: 0; }
  .marcar {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    background: none;
    padding: 0;
  }
  .circulo {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--texto-3);
    color: #fff;
    transition: background var(--mov), border-color var(--mov);
  }
  .marcar:hover .circulo { border-color: var(--marinho); }
  .feito .circulo { background: var(--verde); border-color: var(--verde); }
  .corpo {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
    padding: var(--esp-2) 0;
    border: 0;
    background: none;
    text-align: left;
  }
  .nome { font-weight: var(--fw-medium); overflow-wrap: anywhere; }
  .feito .nome { color: var(--texto-3); text-decoration: line-through; text-decoration-color: var(--texto-3); }
  .qtd { color: var(--dourado-texto); font-weight: var(--fw-bold); margin-right: 2px; }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px var(--esp-2);
    font-size: var(--fs-200);
    color: var(--texto-3);
  }
  .meta:empty { display: none; }
  .valor { flex: none; font-size: var(--fs-300); font-weight: var(--fw-semi); padding-left: var(--esp-2); }
  .feito .valor { color: var(--texto-3); font-weight: var(--fw-medium); }
  .sem { font-size: var(--fs-200); font-weight: var(--fw-normal); color: var(--texto-3); }
  .abrir {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 44px;
    color: var(--marinho);
    border-radius: var(--r-1);
  }
  .abrir:hover { background: var(--superficie-2); }
</style>
