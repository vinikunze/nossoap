<script lang="ts" module>
  import {
    CookingPot, WashingMachine, Sofa, BedDouble, Bath, Laptop, BedSingle, Armchair, Tv, Trees,
    Flower2, Package, Lamp, DoorOpen, Baby, Car, Shirt, Utensils, House, Wrench,
  } from '@lucide/svelte';

  // Nome guardado no banco → desenho. Nomes em português para o banco não
  // depender da biblioteca de ícones: trocar a biblioteca é mexer só aqui.
  export const ICONES = {
    panela: CookingPot, lavadora: WashingMachine, sofa: Sofa, cama: BedDouble, banheira: Bath,
    notebook: Laptop, cama_solteiro: BedSingle, poltrona: Armchair, tv: Tv, arvore: Trees,
    flor: Flower2, caixa: Package, luminaria: Lamp, porta: DoorOpen, bebe: Baby, carro: Car,
    roupa: Shirt, talheres: Utensils, casa: House, ferramenta: Wrench,
  } as const;

  export const NOMES_ICONES = Object.keys(ICONES) as (keyof typeof ICONES)[];
</script>

<script lang="ts">
  let { nome, tamanho = 20 }: { nome: string; tamanho?: number } = $props();
  const Comp = $derived(ICONES[nome as keyof typeof ICONES] ?? House);
</script>

<Comp size={tamanho} strokeWidth={1.75} aria-hidden="true" />
