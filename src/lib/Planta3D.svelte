<script lang="ts">
  // Moldura da maquete 3D. Carrega o Three.js só aqui (import dinâmico) e
  // repassa a lista a cada mudança: marcar um item como comprado deixa o
  // móvel sólido na hora.
  import { onMount } from 'svelte';
  import { Plus, Minus, RotateCcw } from '@lucide/svelte';
  import type { AreaId } from '../../shared/planta';
  import { AREAS } from '../../shared/planta';
  import { totais } from '../../shared/resumo';
  import { estado } from './estado.svelte';
  import type { InfoArea, Planta } from './planta3d';

  let { modo }: { modo: 'geral' | AreaId } = $props();

  let host: HTMLDivElement;
  let planta: Planta | null = null;
  let situacao = $state<'carregando' | 'pronta' | 'sem3d'>('carregando');
  // Toque (celular) ou mouse: a explicação dos gestos muda.
  const toque = matchMedia('(pointer: coarse)').matches;
  const dica = $derived(
    (toque ? 'Toque' : 'Clique') +
      (modo === 'geral' ? ' num cômodo para entrar' : ' num móvel para abrir') +
      (toque ? ' · arraste de lado para girar' : ' · arraste para girar · Ctrl + rodinha para zoom'),
  );

  const infos = $derived<InfoArea[]>(
    AREAS.map((a) => {
      const c = estado.comodos.find((x) => x.area === a.id && x.ativo);
      const itens = c ? estado.itens.filter((i) => i.comodo_id === c.id) : [];
      return { id: a.id, rotulo: c?.nome ?? a.nome, progresso: totais(itens).progresso, itens, temComodo: !!c };
    }),
  );

  function temWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  onMount(() => {
    let cancelado = false;
    if (!temWebGL()) {
      situacao = 'sem3d';
      return;
    }
    import('./planta3d')
      .then(({ criarPlanta }) => {
        if (cancelado) return;
        planta = criarPlanta(host, {
          modo,
          areas: $state.snapshot(infos) as InfoArea[],
          aoEscolherArea: (id) => {
            const c = estado.comodos.find((x) => x.area === id && x.ativo);
            if (c) location.hash = `comodo/${c.id}`;
          },
          aoEscolherItem: (item) => {
            const atual = estado.itens.find((i) => i.id === item.id);
            if (atual) estado.gaveta = { tipo: 'editar', item: atual };
          },
        });
        situacao = 'pronta';
      })
      .catch(() => (situacao = 'sem3d'));
    return () => {
      cancelado = true;
      planta?.destruir();
      planta = null;
    };
  });

  // Mudou a lista: redesenha os móveis.
  $effect(() => {
    const dados = $state.snapshot(infos) as InfoArea[];
    if (situacao === 'pronta') planta?.atualizar(dados);
  });
</script>

<div class="planta" class:geral={modo === 'geral'}>
  <div class="palco" bind:this={host}></div>
  {#if situacao === 'carregando'}
    <p class="aviso3d">Montando a maquete…</p>
  {:else if situacao === 'sem3d'}
    <p class="aviso3d">Este aparelho não conseguiu desenhar em 3D. A lista funciona normalmente.</p>
  {/if}
  {#if situacao === 'pronta'}
    <div class="legenda" aria-hidden="true">
      <span><i class="solido"></i> comprado</span>
      <span><i class="vazado"></i> falta comprar</span>
    </div>
  {/if}
  <!-- Botões à esquerda: no celular, o botão + (novo item) fica no canto direito da tela. -->
  <div class="barra3d">
    {#if situacao === 'pronta'}
      <div class="botoes3d">
        <button onclick={() => planta?.aproximar(1.25)} aria-label="Afastar a maquete"><Minus size={18} /></button>
        <button onclick={() => planta?.aproximar(0.8)} aria-label="Aproximar a maquete"><Plus size={18} /></button>
        <button onclick={() => planta?.recentrar()} aria-label="Voltar para a vista inicial"><RotateCcw size={17} /></button>
      </div>
    {/if}
    <p class="como">{situacao === 'pronta' ? dica : ''}</p>
  </div>
</div>

<style>
  .planta {
    position: relative;
    border-radius: var(--r-3);
    border: 1px solid var(--borda);
    background:
      radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f3f0e8 70%, #ebe7dd 100%);
    overflow: hidden;
    box-shadow: var(--sombra);
  }
  .palco {
    position: relative;
    height: clamp(260px, 42vh, 420px);
    overflow: hidden;
    /* Segurar o dedo na maquete não abre menu nem seleciona texto. */
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  .geral .palco { height: clamp(300px, 52vh, 520px); }
  @media (max-width: 700px) { .geral .palco { height: clamp(380px, 62vh, 560px); } }
  .aviso3d {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: var(--esp-5);
    text-align: center;
    color: var(--texto-3);
    font-size: var(--fs-300);
  }
  .legenda {
    position: absolute;
    top: var(--esp-3);
    left: var(--esp-3);
    display: flex;
    gap: var(--esp-3);
    padding: 6px 10px;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.85);
    font-size: var(--fs-100);
    color: var(--texto-2);
    pointer-events: none;
  }
  .legenda span { display: inline-flex; align-items: center; gap: 6px; }
  .legenda i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
  .legenda .solido { background: var(--dourado); }
  .legenda .vazado { background: rgb(27 45 85 / 0.16); border: 1.5px solid var(--dourado-barra); }
  /* Faixa embaixo da maquete: a explicação dos gestos e os botões de zoom.
     Fica fora da área do 3D para nunca cobrir o desenho. */
  .barra3d {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
    min-height: 52px;
    padding: var(--esp-1) var(--esp-4) var(--esp-1) var(--esp-2);
    border-top: 1px solid var(--borda);
    background: rgb(255 255 255 / 0.7);
  }
  .como { font-size: var(--fs-100); color: var(--texto-3); line-height: 1.35; }
  .botoes3d { display: flex; gap: var(--esp-1); flex: none; }
  .botoes3d button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--borda);
    border-radius: var(--r-1);
    background: var(--superficie);
    color: var(--marinho);
  }
  .botoes3d button:hover { background: var(--superficie-2); }
  .botoes3d button:active { transform: scale(0.95); }

  /* Elementos criados pelo planta3d.ts. */
  .palco :global(.rotulos3d) { position: absolute; inset: 0; pointer-events: none; }
  .palco :global(.rotulo3d) {
    position: absolute;
    top: 0;
    left: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 0;
    border-radius: 999px;
    background: var(--marinho);
    color: #fff;
    font-size: var(--fs-100);
    white-space: nowrap;
    max-width: 150px;
    box-shadow: 0 4px 12px rgb(20 33 61 / 0.25);
    pointer-events: auto;
    transition: background var(--mov);
  }
  .palco :global(.rotulo3d strong) { overflow: hidden; text-overflow: ellipsis; font-weight: var(--fw-semi); }
  .palco :global(.rotulo3d span) { color: var(--dourado-claro); font-weight: var(--fw-bold); }
  .palco :global(.rotulo3d:hover:not(:disabled)) { background: var(--marinho-forte); }
  .palco :global(.rotulo3d.entrada3d) { background: var(--dourado-claro); color: var(--marinho-forte); font-weight: var(--fw-bold); pointer-events: none; }
    .palco :global(.rotulo3d:disabled) { background: rgb(255 255 255 / 0.9); color: var(--texto-3); box-shadow: none; cursor: default; }
  .palco :global(.dica3d) {
    position: absolute;
    top: 0;
    left: 0;
    max-width: 240px;
    padding: 6px 10px;
    border-radius: var(--r-1);
    background: var(--marinho-forte);
    color: #fff;
    font-size: var(--fs-200);
    pointer-events: none;
    z-index: 2;
  }
</style>
