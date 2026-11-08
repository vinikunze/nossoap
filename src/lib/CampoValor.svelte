<script lang="ts">
  // Campo de dinheiro que funciona como caixa eletrônico: os dígitos entram
  // pela direita ("4550" vira R$ 45,50). Vazio = sem valor (null).
  import { centavosDosDigitos, formatar } from '../../shared/dinheiro';

  let { valor = $bindable(), rotulo, dica = '' }: { valor: number | null; rotulo: string; dica?: string } = $props();

  const mostrado = $derived(valor === null ? '' : formatar(valor));

  function digitou(e: Event) {
    const alvo = e.currentTarget as HTMLInputElement;
    const c = centavosDosDigitos(alvo.value);
    valor = c === 0 ? null : c;
    alvo.value = valor === null ? '' : formatar(valor);
  }
</script>

<label class="campo">
  <span>{rotulo}</span>
  <input class="entrada num" inputmode="numeric" autocomplete="off" placeholder="R$ 0,00" value={mostrado} oninput={digitou} />
  {#if dica}<small>{dica}</small>{/if}
</label>

<style>
  small { font-size: var(--fs-100); color: var(--texto-3); }
</style>
