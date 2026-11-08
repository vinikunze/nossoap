<script lang="ts">
  import { onMount } from 'svelte';
  import { estado } from './lib/estado.svelte';
  import Gaveta from './lib/Gaveta.svelte';
  import Aviso from './lib/Aviso.svelte';
  import Icone from './lib/Icone.svelte';
  import Inicio from './telas/Inicio.svelte';
  import Lista from './telas/Lista.svelte';
  import Ajustes from './telas/Ajustes.svelte';
  import FormItem from './telas/FormItem.svelte';
  import Comprar from './telas/Comprar.svelte';
  import { porComodo } from '../shared/resumo';
  import { House, ListChecks, Settings, Plus } from '@lucide/svelte';

  const TELAS = [
    { id: 'inicio', nome: 'Início', icone: House },
    { id: 'lista', nome: 'Lista', icone: ListChecks },
    { id: 'ajustes', nome: 'Ajustes', icone: Settings },
  ] as const;

  // Rotas pelo endereço: #inicio, #lista, #comodo/3, #ajustes.
  // O botão voltar do celular funciona sem esforço.
  const lerRota = () => {
    const [tela = 'inicio', param] = location.hash.slice(1).split('/');
    return { tela: tela || 'inicio', comodoId: tela === 'comodo' ? Number(param) : null };
  };
  let rota = $state(lerRota());
  let pronto = $state(false);
  let erroInicial = $state('');

  onMount(() => {
    const aoMudar = () => {
      rota = lerRota();
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', aoMudar);
    estado.carregar()
      .then(() => (pronto = true))
      .catch((e) => (erroInicial = e.message));
    return () => window.removeEventListener('hashchange', aoMudar);
  });

  const comodoAberto = $derived(rota.comodoId ? estado.comodo(rota.comodoId) : undefined);
  const abaAtiva = $derived(rota.tela === 'comodo' ? 'lista' : rota.tela);
  const titulo = $derived(
    rota.tela === 'comodo' ? comodoAberto?.nome ?? 'Cômodo' : TELAS.find((t) => t.id === rota.tela)?.nome ?? 'Início',
  );
  const resumos = $derived(porComodo(estado.comodos, estado.itens));

  function novo() {
    estado.gaveta = { tipo: 'novo', comodo_id: comodoAberto?.ativo ? comodoAberto.id : undefined };
  }

  const fechar = () => (estado.gaveta = null);
</script>

<div class="casca">
  <nav class="lateral" aria-label="Telas">
    <div class="logo">
      <span class="palavra">nosso ap<span class="ponto">.</span></span>
      <span class="casal">Vinícius &amp; Sophia</span>
    </div>
    {#each TELAS.slice(0, 2) as t (t.id)}
      <a href="#{t.id}" aria-current={rota.tela === t.id ? 'page' : undefined}>
        <t.icone size={20} /> {t.nome}
      </a>
    {/each}
    {#if pronto && resumos.length}
      <p class="sobretitulo grupo">Cômodos</p>
      {#each resumos as r (r.comodo.id)}
        <a href="#comodo/{r.comodo.id}" class="comodo" aria-current={rota.comodoId === r.comodo.id ? 'page' : undefined}>
          <Icone nome={r.comodo.icone} />
          <span class="nome-comodo">{r.comodo.nome}</span>
          <span class="pct num">{r.progresso}%</span>
        </a>
      {/each}
    {/if}
    <div class="pe">
      <a href="#ajustes" aria-current={rota.tela === 'ajustes' ? 'page' : undefined}>
        <Settings size={20} /> Ajustes
      </a>
    </div>
  </nav>

  <div class="principal">
    <header class="topo">
      {#if rota.tela === 'inicio'}
        <h1 class="titulo marca">nosso ap<span class="ponto">.</span></h1>
      {:else}
        <h1 class="titulo">{titulo}</h1>
      {/if}
      {#if pronto && rota.tela !== 'ajustes'}
        <button class="botao so-computador" onclick={novo}><Plus size={18} /> Novo item</button>
      {/if}
    </header>

    <main>
      {#if erroInicial}
        <div class="cartao erro-inicial" role="alert">
          <p>{erroInicial}</p>
          <div class="botoes-erro">
            <button class="botao" onclick={() => location.reload()}>Tentar de novo</button>
            <a class="botao secundario" href="/cdn-cgi/access/logout">Sair</a>
          </div>
        </div>
      {:else if !pronto}
        <p class="vazio">Carregando…</p>
      {:else if rota.tela === 'inicio'}
        <Inicio />
      {:else if rota.tela === 'lista'}
        <Lista />
      {:else if rota.tela === 'comodo'}
        {#if comodoAberto}
          {#key comodoAberto.id}<Lista comodo={comodoAberto} />{/key}
        {:else}
          <p class="cartao vazio">Esse cômodo não existe mais. <a href="#lista">Ver a lista</a></p>
        {/if}
      {:else if rota.tela === 'ajustes'}
        <Ajustes />
      {:else}
        <p class="cartao vazio">Página não encontrada. <a href="#inicio">Voltar ao início</a></p>
      {/if}
    </main>
  </div>

  <nav class="inferior" aria-label="Telas">
    {#each TELAS as t (t.id)}
      <a href="#{t.id}" aria-current={abaAtiva === t.id ? 'page' : undefined}>
        <t.icone size={22} />
        <span>{t.nome}</span>
      </a>
    {/each}
  </nav>

  {#if pronto && rota.tela !== 'ajustes'}
    <button class="fab" onclick={novo} aria-label="Novo item"><Plus size={28} /></button>
  {/if}
</div>

{#if estado.gaveta}
  {@const g = estado.gaveta}
  <Gaveta titulo={g.tipo === 'novo' ? 'Novo item' : g.tipo === 'comprar' ? 'Comprado!' : 'Item'} {fechar}>
    {#if g.tipo === 'novo'}
      <FormItem comodoInicial={g.comodo_id} {fechar} />
    {:else if g.tipo === 'editar'}
      {#key g.item.id}<FormItem editar={g.item} {fechar} />{/key}
    {:else}
      {#key g.item.id}<Comprar item={g.item} {fechar} />{/key}
    {/if}
  </Gaveta>
{/if}

<Aviso />

<style>
  .casca { min-height: 100dvh; }
  .principal {
    max-width: 880px;
    margin: 0 auto;
    padding: 0 var(--esp-4) calc(var(--barra-inferior) + 96px + env(safe-area-inset-bottom));
  }
  .topo {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--esp-2);
    min-height: 64px;
    padding: calc(var(--esp-3) + env(safe-area-inset-top)) 0 var(--esp-3);
    background: var(--fundo);
  }
  .titulo { font-size: var(--fs-600); font-weight: var(--fw-bold); letter-spacing: -0.01em; }
  .marca, .palavra { color: var(--marinho); letter-spacing: -0.03em; }
  .ponto { color: var(--dourado); }
  .so-computador { display: none !important; }
  .erro-inicial { display: grid; gap: var(--esp-4); color: var(--texto-2); }
  .botoes-erro { display: flex; flex-wrap: wrap; gap: var(--esp-2); }

  .inferior {
    position: fixed;
    z-index: 30;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    height: calc(var(--barra-inferior) + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--superficie);
    border-top: 1px solid var(--borda);
  }
  .inferior a {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    color: var(--texto-3);
    text-decoration: none;
    font-size: var(--fs-100);
    font-weight: var(--fw-medium);
  }
  .inferior a[aria-current='page'] { color: var(--marinho); font-weight: var(--fw-bold); }

  .fab {
    position: fixed;
    z-index: 31;
    right: var(--esp-4);
    bottom: calc(var(--barra-inferior) + var(--esp-4) + env(safe-area-inset-bottom));
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    border: 0;
    background: var(--marinho);
    color: var(--dourado-claro);
    box-shadow: 0 8px 24px rgb(20 33 61 / 0.3);
    transition: transform var(--mov);
  }
  .fab:active { transform: scale(0.94); }

  .lateral { display: none; }

  @media (min-width: 1024px) {
    .inferior, .fab { display: none !important; }
    .so-computador { display: inline-flex !important; }
    .lateral {
      position: fixed;
      inset: 0 auto 0 0;
      width: var(--lateral);
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--esp-5) var(--esp-3);
      background: var(--superficie);
      border-right: 1px solid var(--borda);
      overflow-y: auto;
    }
    .logo { display: grid; padding: 0 var(--esp-3) var(--esp-5); }
    .palavra { font-size: var(--fs-600); font-weight: var(--fw-bold); line-height: 1; }
    .casal { font-size: var(--fs-100); font-weight: var(--fw-semi); letter-spacing: 0.06em; text-transform: uppercase; color: var(--texto-3); margin-top: 6px; }
    .lateral a {
      display: flex;
      align-items: center;
      gap: var(--esp-3);
      min-height: 44px;
      padding: 0 var(--esp-3);
      border-radius: var(--r-1);
      color: var(--texto-2);
      text-decoration: none;
      font-weight: var(--fw-medium);
    }
    .lateral a:hover { background: var(--superficie-2); }
    .lateral a[aria-current='page'] { background: var(--marinho-suave); color: var(--marinho); font-weight: var(--fw-semi); }
    .grupo { padding: var(--esp-4) var(--esp-3) var(--esp-1); }
    .comodo { font-size: var(--fs-300); }
    .comodo :global(svg) { color: var(--dourado-texto); flex: none; }
    .nome-comodo { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pct { font-size: var(--fs-100); color: var(--texto-3); }
    .pe { margin-top: auto; padding-top: var(--esp-4); }
    .principal { margin-left: var(--lateral); padding: 0 var(--esp-6) var(--esp-6); max-width: calc(1040px + var(--lateral)); }
  }
</style>
