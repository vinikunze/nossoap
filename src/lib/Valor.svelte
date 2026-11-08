<script lang="ts">
  import { formatar, formatarCompacto } from '../../shared/dinheiro';

  let { centavos, compacto = false }: { centavos: number; compacto?: boolean } = $props();
</script>

<span class="num">{compacto ? formatarCompacto(centavos) : formatar(centavos)}</span>
