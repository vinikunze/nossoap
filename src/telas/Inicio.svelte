<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { totais, porComodo, ordenar } from '../../shared/resumo';
  import { estado } from '../lib/estado.svelte';
  import Valor from '../lib/Valor.svelte';
  import Icone from '../lib/Icone.svelte';
  import LinhaItem from '../lib/LinhaItem.svelte';

  const MAX_ESSENCIAIS = 6;

  const geral = $derived(totais(estado.itens));
  const comodos = $derived(porComodo(estado.comodos, estado.itens));
  const essenciais = $derived(ordenar(estado.itens.filter((i) => !i.comprado && i.prioridade === 'essencial')));
</script>

<section class="heroi">
  <p class="rotulo">Falta gastar</p>
  <p class="grande num"><Valor centavos={geral.falta_centavos} /></p>
  {#if geral.sem_preco}
    <p class="nota">+ {geral.sem_preco} {geral.sem_preco === 1 ? 'item ainda sem preço' : 'itens ainda sem preço'}</p>
  {/if}
  <div class="rodape">
    <div>
      <p class="rotulo">Já gastaram</p>
      <p class="medio num"><Valor centavos={geral.gasto_centavos} /></p>
    </div>
    <div class="direita">
      <p class="rotulo">Casa montada</p>
      <p class="medio num">{geral.progresso}%</p>
    </div>
  </div>
  <div class="barra clara" role="progressbar" aria-valuenow={geral.progresso} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso geral">
    <i style:width="{geral.progresso}%"></i>
  </div>
  <p class="nota num">{geral.comprados} de {geral.itens} {geral.itens === 1 ? 'item comprado' : 'itens comprados'}</p>
</section>

<h2 class="secao">Cômodos</h2>
<div class="grade">
  {#each comodos as r (r.comodo.id)}
    <a class="cartao comodo" href="#comodo/{r.comodo.id}">
      <div class="linha">
        <span class="icone-comodo"><Icone nome={r.comodo.icone} /></span>
        <span class="nome">{r.comodo.nome}</span>
        <span class="seta"><ChevronRight size={18} /></span>
      </div>
      <div class="barra" aria-hidden="true"><i class:completa={r.itens > 0 && r.progresso === 100} style:width="{r.progresso}%"></i></div>
      <div class="linha pequena">
        <span class="num">{r.comprados} de {r.itens}</span>
        {#if r.falta_centavos}<span class="num">falta <Valor centavos={r.falta_centavos} compacto /></span>{/if}
      </div>
    </a>
  {/each}
</div>

<h2 class="secao">Essenciais que faltam</h2>
{#if essenciais.length}
  <ul class="cartao lista">
    {#each essenciais.slice(0, MAX_ESSENCIAIS) as item (item.id)}<LinhaItem {item} mostrarComodo />{/each}
  </ul>
  {#if essenciais.length > MAX_ESSENCIAIS}
    <a class="link mais" href="#lista">Ver todos os {essenciais.length} na lista</a>
  {/if}
{:else if estado.itens.length === 0}
  <p class="cartao vazio">
    A lista está vazia. Abra um cômodo para ver sugestões do que comprar, ou toque em <strong>+</strong>.
  </p>
{:else}
  <p class="cartao vazio">Nenhum essencial faltando. Já dá para mudar! 🏠</p>
{/if}

<style>
  .heroi {
    display: grid;
    gap: var(--esp-2);
    padding: var(--esp-5);
    border-radius: var(--r-3);
    background: var(--heroi);
    color: #fff;
    box-shadow: var(--sombra-alta);
  }
  .rotulo { font-size: var(--fs-100); font-weight: var(--fw-semi); letter-spacing: 0.06em; text-transform: uppercase; color: rgb(255 255 255 / 0.78); }
  .grande { font-size: var(--fs-800); font-weight: var(--fw-bold); color: var(--dourado-claro); line-height: 1.1; }
  .medio { font-size: var(--fs-500); font-weight: var(--fw-semi); }
  .nota { font-size: var(--fs-200); color: rgb(255 255 255 / 0.78); }
  .rodape { display: flex; justify-content: space-between; gap: var(--esp-4); margin-top: var(--esp-3); }
  .direita { text-align: right; }
  .barra.clara { background: rgb(255 255 255 / 0.16); }
  .barra.clara > i { background: var(--dourado-claro); }

  .secao { font-size: var(--fs-500); font-weight: var(--fw-semi); margin: var(--esp-6) 0 var(--esp-3); }

  .grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--esp-3); }
  .comodo { display: grid; gap: var(--esp-3); color: var(--texto); text-decoration: none; transition: border-color var(--mov), transform var(--mov); }
  .comodo:hover { border-color: var(--dourado); }
  .comodo:active { transform: scale(0.99); }
  .linha { display: flex; align-items: center; gap: var(--esp-3); }
  .seta { display: grid; color: var(--texto-3); }
  .nome { flex: 1; font-weight: var(--fw-semi); }
  .pequena { justify-content: space-between; font-size: var(--fs-200); color: var(--texto-3); }

  .lista { list-style: none; margin: 0; padding: 0 var(--esp-3) 0 var(--esp-1); }
  .mais { display: inline-block; margin-top: var(--esp-3); }
</style>
