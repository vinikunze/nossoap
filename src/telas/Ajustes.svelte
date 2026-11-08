<script lang="ts">
  // Cômodos (criar, renomear, trocar ícone, reordenar, arquivar) e conta.
  import { ChevronUp, ChevronDown, Pencil, LogOut, Plus, Archive, Trash } from '@lucide/svelte';
  import type { Comodo } from '../../shared/tipos';
  import { estado } from '../lib/estado.svelte';
  import { api } from '../lib/api';
  import Icone, { NOMES_ICONES } from '../lib/Icone.svelte';

  // id do cômodo aberto para editar; 0 = criando um novo.
  let aberto = $state<number | null>(null);
  let nome = $state('');
  let icone = $state<string>('casa');
  let salvando = $state(false);
  let erro = $state('');

  const ativos = $derived(estado.comodos.filter((c) => c.ativo));
  const arquivados = $derived(estado.comodos.filter((c) => !c.ativo));
  const qtdItens = (id: number) => estado.itens.filter((i) => i.comodo_id === id).length;

  function abrir(c?: Comodo) {
    aberto = c?.id ?? 0;
    nome = c?.nome ?? '';
    icone = c?.icone ?? 'casa';
    erro = '';
  }

  async function salvar(e: SubmitEvent) {
    e.preventDefault();
    if (!nome.trim()) return (erro = 'Dê um nome ao cômodo.');
    salvando = true;
    erro = '';
    try {
      const c = aberto ? await api.editarComodo(aberto, { nome: nome.trim(), icone }) : await api.criarComodo(nome.trim(), icone);
      estado.guardarComodo(c);
      aberto = null;
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Não deu para salvar.';
    } finally {
      salvando = false;
    }
  }

  async function arquivar(c: Comodo, ativo: 0 | 1) {
    try {
      estado.guardarComodo(await api.editarComodo(c.id, { ativo }));
      aberto = null;
      estado.avisar(ativo ? `${c.nome} voltou.` : `${c.nome} foi arquivado. Os itens dele continuam na lista.`);
    } catch (e) {
      estado.erro(e);
    }
  }

  async function apagar(c: Comodo) {
    try {
      await api.apagarComodo(c.id);
      estado.comodos = estado.comodos.filter((x) => x.id !== c.id);
      aberto = null;
      estado.avisar(`${c.nome} foi apagado.`);
    } catch (e) {
      estado.erro(e);
    }
  }

  async function mover(i: number, delta: number) {
    const lista = [...ativos];
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    const ids = [...lista, ...arquivados].map((c) => c.id);
    // Muda na tela na hora; se o servidor recusar, volta como estava.
    const antes = estado.comodos;
    estado.comodos = ids.map((id, n) => ({ ...antes.find((c) => c.id === id)!, ordem: n + 1 }));
    try {
      await api.ordenarComodos(ids);
    } catch (e) {
      estado.comodos = antes;
      estado.erro(e);
    }
  }
</script>

{#snippet formulario(c?: Comodo)}
  <form class="form" onsubmit={salvar} novalidate>
    <label class="campo">
      <span>Nome do cômodo</span>
      <input class="entrada" bind:value={nome} maxlength="40" placeholder="Ex.: Varanda" />
    </label>
    <fieldset>
      <legend>Ícone</legend>
      <div class="icones">
        {#each NOMES_ICONES as n (n)}
          <button type="button" class="icone" aria-pressed={icone === n} aria-label={n.replace('_', ' ')} onclick={() => (icone = n)}>
            <Icone nome={n} />
          </button>
        {/each}
      </div>
    </fieldset>
    {#if erro}<p class="erro" role="alert">{erro}</p>{/if}
    <div class="botoes">
      <button class="botao" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : c ? 'Salvar' : 'Criar cômodo'}</button>
      <button class="botao secundario" type="button" onclick={() => (aberto = null)}>Cancelar</button>
    </div>
    {#if c}
      <div class="botoes">
        <button class="botao contorno" type="button" onclick={() => arquivar(c, 0)}><Archive size={18} /> Arquivar</button>
        {#if qtdItens(c.id) === 0}
          <button class="botao perigo" type="button" onclick={() => apagar(c)}><Trash size={18} /> Apagar</button>
        {/if}
      </div>
      <p class="obs">Arquivar esconde o cômodo da tela inicial e do cadastro, mas os itens dele continuam guardados.</p>
    {/if}
  </form>
{/snippet}

<section>
  <h2 class="secao">Cômodos</h2>
  <ul class="cartao lista">
    {#each ativos as c, i (c.id)}
      <li>
        {#if aberto === c.id}
          {@render formulario(c)}
        {:else}
          <div class="linha">
            <span class="icone-comodo"><Icone nome={c.icone} /></span>
            <span class="nome">{c.nome}<small class="num">{qtdItens(c.id)} {qtdItens(c.id) === 1 ? 'item' : 'itens'}</small></span>
            <button class="mini" onclick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir {c.nome}"><ChevronUp size={20} /></button>
            <button class="mini" onclick={() => mover(i, 1)} disabled={i === ativos.length - 1} aria-label="Descer {c.nome}"><ChevronDown size={20} /></button>
            <button class="mini" onclick={() => abrir(c)} aria-label="Editar {c.nome}"><Pencil size={18} /></button>
          </div>
        {/if}
      </li>
    {/each}
    <li>
      {#if aberto === 0}
        {@render formulario()}
      {:else}
        <button class="novo" onclick={() => abrir()}><Plus size={18} /> Novo cômodo</button>
      {/if}
    </li>
  </ul>

  {#if arquivados.length}
    <h3 class="sobretitulo arq">Arquivados</h3>
    <ul class="cartao lista">
      {#each arquivados as c (c.id)}
        <li>
          <div class="linha">
            <span class="icone-comodo"><Icone nome={c.icone} /></span>
            <span class="nome">{c.nome}<small class="num">{qtdItens(c.id)} {qtdItens(c.id) === 1 ? 'item' : 'itens'}</small></span>
            <button class="link" onclick={() => arquivar(c, 1)}>Reativar</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section>
  <h2 class="secao">Conta</h2>
  <div class="cartao conta">
    <p>Entrou como <strong>{estado.email}</strong></p>
    <!-- Sai do Access: a próxima visita pede o código por e-mail de novo. -->
    <a class="botao secundario" href="/cdn-cgi/access/logout"><LogOut size={18} /> Sair</a>
  </div>
</section>

<style>
  .secao { font-size: var(--fs-500); font-weight: var(--fw-semi); margin: var(--esp-2) 0 var(--esp-3); }
  section + section .secao { margin-top: var(--esp-6); }
  .lista { list-style: none; margin: 0; padding: 0 var(--esp-3); }
  .lista li { border-bottom: 1px solid var(--borda); }
  .lista li:last-child { border-bottom: 0; }
  .linha { display: flex; align-items: center; gap: var(--esp-2); min-height: 64px; }
  .nome { flex: 1; display: grid; font-weight: var(--fw-medium); margin-left: var(--esp-1); }
  .nome small { font-size: var(--fs-200); color: var(--texto-3); font-weight: var(--fw-normal); }
  .mini { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: var(--r-1); background: none; color: var(--texto-2); }
  .mini:hover:not(:disabled) { background: var(--superficie-2); }
  .mini:disabled { opacity: 0.3; cursor: default; }
  .novo { display: flex; align-items: center; gap: var(--esp-2); width: 100%; min-height: 56px; border: 0; background: none; color: var(--marinho); font-weight: var(--fw-semi); }
  .arq { margin: var(--esp-5) 0 var(--esp-2); }

  .form { display: grid; gap: var(--esp-4); padding: var(--esp-4) 0; }
  fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
  legend { font-size: var(--fs-200); color: var(--texto-2); font-weight: var(--fw-medium); padding: 0; margin-bottom: var(--esp-2); }
  .icones { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: var(--esp-2); }
  .icone { display: grid; place-items: center; height: 44px; border-radius: var(--r-1); border: 1px solid var(--borda); background: var(--superficie); color: var(--texto-2); }
  .icone[aria-pressed='true'] { background: var(--marinho); border-color: var(--marinho); color: var(--dourado-claro); }
  .botoes { display: flex; flex-wrap: wrap; gap: var(--esp-2); }
  .obs { font-size: var(--fs-200); color: var(--texto-3); }
  .erro { font-size: var(--fs-200); color: var(--vermelho); padding: var(--esp-3); border-radius: var(--r-1); background: var(--vermelho-suave); }

  .conta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--esp-3); }
  .conta p { overflow-wrap: anywhere; }
</style>
