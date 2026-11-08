<script lang="ts">
  // Cadastrar ou editar um item. Só nome e cômodo são obrigatórios: o resto
  // dá para completar depois, quando pesquisarem preço.
  import { untrack } from 'svelte';
  import { Minus, Plus, Trash, Undo2 } from '@lucide/svelte';
  import type { Item, Prioridade } from '../../shared/tipos';
  import { PRIORIDADES } from '../../shared/tipos';
  import { linkValido } from '../../shared/texto';
  import { formatar } from '../../shared/dinheiro';
  import { estado } from '../lib/estado.svelte';
  import { api, novaChave } from '../lib/api';
  import CampoValor from '../lib/CampoValor.svelte';
  import Icone from '../lib/Icone.svelte';

  let { editar, comodoInicial, fechar }: { editar?: Item; comodoInicial?: number; fechar: () => void } = $props();

  // Valores iniciais: lidos uma vez ao abrir. A gaveta é recriada a cada item.
  const base = untrack(() => editar);
  const chave = novaChave(); // a mesma em todas as tentativas deste cadastro
  let nome = $state(base?.nome ?? '');
  let comodoId = $state<number | null>(base?.comodo_id ?? untrack(() => comodoInicial) ?? estado.ativos[0]?.id ?? null);
  let quantidade = $state(base?.quantidade ?? 1);
  let prioridade = $state<Prioridade>(base?.prioridade ?? 'logo');
  let estimado = $state<number | null>(base?.estimado_centavos ?? null);
  let pago = $state<number | null>(base?.pago_centavos ?? null);
  let link = $state(base?.link ?? '');
  let obs = $state(base?.obs ?? '');
  let salvando = $state(false);
  let erro = $state('');
  let confirmarApagar = $state(false);

  // O cômodo atual aparece mesmo se estiver arquivado, para não sumir da escolha.
  const opcoes = $derived(estado.comodos.filter((c) => c.ativo || c.id === base?.comodo_id));
  const linkRuim = $derived(link.trim() !== '' && linkValido(link) === null);
  const totalEstimado = $derived(estimado !== null && quantidade > 1 ? estimado * quantidade : null);

  async function salvar(e: SubmitEvent) {
    e.preventDefault();
    erro = '';
    if (!nome.trim()) return (erro = 'Dê um nome ao item.');
    if (comodoId === null) return (erro = 'Escolha um cômodo.');
    if (linkRuim) return (erro = 'Esse link não parece um endereço de site.');
    salvando = true;
    const dados = {
      comodo_id: comodoId,
      nome: nome.trim(),
      quantidade,
      prioridade,
      estimado_centavos: estimado,
      pago_centavos: pago,
      link: link.trim() || null,
      obs: obs.trim() || null,
    };
    try {
      const item = base ? await api.editarItem(base.id, dados) : await api.criarItem({ ...dados, chave });
      estado.guardar(item);
      estado.avisar(base ? 'Item salvo.' : `“${item.nome}” entrou na lista.`);
      fechar();
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Não deu para salvar.';
    } finally {
      salvando = false;
    }
  }

  async function apagar() {
    if (!base) return;
    if (!confirmarApagar) return (confirmarApagar = true);
    salvando = true;
    try {
      await api.apagarItem(base.id);
      estado.tirar(base.id);
      estado.avisar(`“${base.nome}” foi apagado.`);
      fechar();
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Não deu para apagar.';
      salvando = false;
    }
  }

  async function desmarcar() {
    if (!base) return;
    await estado.desfazer(base);
    fechar();
  }

  const dataCompra = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
</script>

<form onsubmit={salvar} novalidate>
  <label class="campo">
    <span>Nome</span>
    <input class="entrada" bind:value={nome} maxlength="120" placeholder="Ex.: Jogo de talheres 24 peças" autocomplete="off" />
  </label>

  <fieldset>
    <legend>Cômodo</legend>
    <div class="opcoes">
      {#each opcoes as c (c.id)}
        <button type="button" class="chip" aria-pressed={comodoId === c.id} onclick={() => (comodoId = c.id)}>
          <Icone nome={c.icone} tamanho={16} /> {c.nome}
        </button>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>Prioridade</legend>
    <div class="opcoes tres">
      {#each PRIORIDADES as p (p.valor)}
        <button type="button" class="chip prio" aria-pressed={prioridade === p.valor} onclick={() => (prioridade = p.valor)}>
          <strong>{p.nome}</strong><small>{p.dica}</small>
        </button>
      {/each}
    </div>
  </fieldset>

  <div class="dupla">
    <div class="campo">
      <span id="rot-qtd">Quantidade</span>
      <div class="passo" role="group" aria-labelledby="rot-qtd">
        <button type="button" onclick={() => (quantidade = Math.max(1, quantidade - 1))} disabled={quantidade <= 1} aria-label="Menos um">
          <Minus size={18} />
        </button>
        <input class="num" type="number" min="1" max="999" inputmode="numeric" bind:value={quantidade} aria-labelledby="rot-qtd"
          onblur={() => (quantidade = Math.min(999, Math.max(1, Math.round(Number(quantidade) || 1))))} />
        <button type="button" onclick={() => (quantidade = Math.min(999, quantidade + 1))} aria-label="Mais um">
          <Plus size={18} />
        </button>
      </div>
    </div>
    <CampoValor bind:valor={estimado} rotulo="Preço estimado (cada)"
      dica={totalEstimado !== null ? `Total: ${formatar(totalEstimado)}` : ''} />
  </div>

  <label class="campo">
    <span>Link da loja</span>
    <input class="entrada" type="url" inputmode="url" bind:value={link} placeholder="Cole o link do produto" autocomplete="off" aria-invalid={linkRuim} />
    {#if linkRuim}<small class="ruim">Esse link não parece um endereço de site.</small>{/if}
  </label>

  <label class="campo">
    <span>Observação</span>
    <textarea class="entrada" bind:value={obs} maxlength="500" placeholder="Cor, medida, modelo…"></textarea>
  </label>

  {#if base?.comprado}
    <section class="comprado">
      <p><strong>Comprado</strong>{#if base.comprado_em} em {dataCompra(base.comprado_em)}{/if}</p>
      <CampoValor bind:valor={pago} rotulo="Quanto pagaram (total)" />
      <button type="button" class="botao secundario" onclick={desmarcar} disabled={salvando}>
        <Undo2 size={18} /> Desmarcar comprado
      </button>
    </section>
  {/if}

  {#if erro}<p class="erro" role="alert">{erro}</p>{/if}

  <div class="acoes">
    <button class="botao bloco" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : base ? 'Salvar' : 'Adicionar à lista'}</button>
    {#if base}
      <button type="button" class="botao perigo bloco" onclick={apagar} disabled={salvando}>
        <Trash size={18} /> {confirmarApagar ? 'Toque de novo para apagar' : 'Apagar item'}
      </button>
    {/if}
  </div>
</form>

<style>
  form { display: grid; gap: var(--esp-4); }
  fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 6px; min-width: 0; }
  legend { font-size: var(--fs-200); color: var(--texto-2); font-weight: var(--fw-medium); padding: 0; margin-bottom: 6px; }
  .opcoes { display: flex; flex-wrap: wrap; gap: var(--esp-2); }
  .opcoes :global(svg) { flex: none; }
  .tres { display: grid; grid-template-columns: repeat(3, 1fr); }
  .prio { display: grid; justify-items: center; gap: 0; padding: var(--esp-2); min-height: 56px; white-space: normal; text-align: center; }
  .prio small { font-size: var(--fs-100); opacity: 0.85; font-weight: var(--fw-normal); }

  .dupla { display: grid; grid-template-columns: auto 1fr; gap: var(--esp-3); align-items: start; }
  .passo {
    display: flex;
    align-items: center;
    height: 48px;
    border: 1px solid var(--borda);
    border-radius: var(--r-1);
    background: var(--superficie);
  }
  .passo button { display: grid; place-items: center; width: 44px; height: 100%; border: 0; background: none; color: var(--marinho); }
  .passo button:disabled { color: var(--texto-3); opacity: 0.5; }
  .passo input {
    width: 3.5ch;
    border: 0;
    background: none;
    text-align: center;
    font-weight: var(--fw-semi);
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .passo input::-webkit-inner-spin-button, .passo input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

  .comprado { display: grid; gap: var(--esp-3); padding: var(--esp-4); border-radius: var(--r-2); background: var(--verde-suave); }
  .comprado p { color: var(--verde); }

  .ruim, .erro { font-size: var(--fs-200); color: var(--vermelho); }
  .erro { padding: var(--esp-3); border-radius: var(--r-1); background: var(--vermelho-suave); }
  .acoes { display: grid; gap: var(--esp-2); margin-top: var(--esp-2); }
</style>
