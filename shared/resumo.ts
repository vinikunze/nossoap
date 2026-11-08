// Contas da tela inicial e dos cômodos. Tudo calculado no aparelho a partir
// da lista: para duas pessoas e algumas centenas de itens, é instantâneo e
// não gasta cota do banco.

import type { Comodo, Item } from './tipos';

export interface Totais {
  /** Itens na lista (comprados ou não). */
  itens: number;
  comprados: number;
  /** Soma dos estimados (× quantidade) do que ainda não foi comprado. */
  falta_centavos: number;
  /** Itens não comprados sem preço estimado: o "falta" não conta com eles. */
  sem_preco: number;
  /** Soma do que pagaram nos itens comprados. */
  gasto_centavos: number;
  /** Porcentagem inteira de itens comprados (0 a 100). */
  progresso: number;
}

/** Quanto se espera gastar com o item: estimado por unidade × quantidade. */
export function estimadoTotal(i: Pick<Item, 'estimado_centavos' | 'quantidade'>): number | null {
  return i.estimado_centavos === null ? null : i.estimado_centavos * i.quantidade;
}

export function totais(itens: Item[]): Totais {
  let comprados = 0, falta = 0, semPreco = 0, gasto = 0;
  for (const i of itens) {
    if (i.comprado) {
      comprados++;
      gasto += i.pago_centavos ?? 0;
    } else {
      const e = estimadoTotal(i);
      if (e === null) semPreco++;
      else falta += e;
    }
  }
  return {
    itens: itens.length,
    comprados,
    falta_centavos: falta,
    sem_preco: semPreco,
    gasto_centavos: gasto,
    // Arredonda para baixo: 99,6% não pode aparecer como "100%" com item faltando.
    progresso: itens.length === 0 ? 0 : Math.floor((comprados / itens.length) * 100),
  };
}

export interface ResumoComodo extends Totais {
  comodo: Comodo;
}

/** Totais de cada cômodo ativo, na ordem dos cômodos. */
export function porComodo(comodos: Comodo[], itens: Item[]): ResumoComodo[] {
  const grupos = new Map<number, Item[]>();
  for (const i of itens) {
    const g = grupos.get(i.comodo_id);
    if (g) g.push(i);
    else grupos.set(i.comodo_id, [i]);
  }
  return comodos
    .filter((c) => c.ativo)
    .map((c) => ({ comodo: c, ...totais(grupos.get(c.id) ?? []) }));
}

const PESO = { essencial: 0, logo: 1, um_dia: 2 } as const;

/**
 * Ordem da lista: o que falta antes do comprado; entre os que faltam,
 * essencial primeiro; depois por nome. Comprados: o mais recente primeiro.
 */
export function ordenar(itens: Item[]): Item[] {
  return [...itens].sort((a, b) => {
    if (a.comprado !== b.comprado) return a.comprado - b.comprado;
    if (a.comprado) return (b.comprado_em ?? '').localeCompare(a.comprado_em ?? '');
    if (a.prioridade !== b.prioridade) return PESO[a.prioridade] - PESO[b.prioridade];
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
