<script lang="ts">
  // Marcar como comprado. Já vem com o estimado preenchido: se pagaram isso
  // mesmo, é um toque só. Dá para marcar sem informar o preço.
  import { untrack } from 'svelte';
  import type { Item } from '../../shared/tipos';
  import { estimadoTotal } from '../../shared/resumo';
  import { estado } from '../lib/estado.svelte';
  import { api } from '../lib/api';
  import CampoValor from '../lib/CampoValor.svelte';

  let { item, fechar }: { item: Item; fechar: () => void } = $props();

  const original = untrack(() => item);
  let pago = $state<number | null>(estimadoTotal(original));
  let salvando = $state(false);
  let erro = $state('');

  async function confirmar(comPreco: boolean) {
    salvando = true;
    erro = '';
    try {
      const atualizado = await api.comprar(original.id, comPreco ? pago : null);
      estado.guardar(atualizado);
      fechar();
      estado.avisar(`“${original.nome}” comprado!`, {
        acao: { rotulo: 'Desfazer', fazer: () => estado.desfazer(atualizado) },
      });
    } catch (e) {
      erro = e instanceof Error ? e.message : 'Não deu para marcar.';
      salvando = false;
    }
  }
</script>

<div class="corpo">
  <p class="nome">{#if original.quantidade > 1}<span class="num">{original.quantidade}× </span>{/if}{original.nome}</p>
  <CampoValor bind:valor={pago} rotulo="Quanto pagaram (total)"
    dica={original.estimado_centavos !== null ? 'Preenchido com o preço estimado. Ajuste se foi diferente.' : ''} />
  {#if erro}<p class="erro" role="alert">{erro}</p>{/if}
  <button class="botao bloco" onclick={() => confirmar(true)} disabled={salvando || pago === null}>
    {salvando ? 'Salvando…' : 'Marcar como comprado'}
  </button>
  <button class="botao secundario bloco" onclick={() => confirmar(false)} disabled={salvando}>
    Comprado, sem informar o preço
  </button>
</div>

<style>
  .corpo { display: grid; gap: var(--esp-4); }
  .nome { font-size: var(--fs-500); font-weight: var(--fw-semi); }
  .erro { font-size: var(--fs-200); color: var(--vermelho); padding: var(--esp-3); border-radius: var(--r-1); background: var(--vermelho-suave); }
</style>
