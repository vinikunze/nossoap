// Formato dos dados que a API devolve. Usado pela tela e pela API.

export type Prioridade = 'essencial' | 'logo' | 'um_dia';

export const PRIORIDADES: { valor: Prioridade; nome: string; dica: string }[] = [
  { valor: 'essencial', nome: 'Essencial', dica: 'Antes de mudar' },
  { valor: 'logo', nome: 'Logo', dica: 'No primeiro mês' },
  { valor: 'um_dia', nome: 'Um dia', dica: 'Sem pressa' },
];

export const nomeDaPrioridade = (p: Prioridade) => PRIORIDADES.find((x) => x.valor === p)?.nome ?? '';

export interface Comodo {
  id: number;
  nome: string;
  icone: string;
  ordem: number;
  ativo: number;
}

export interface Item {
  id: number;
  comodo_id: number;
  nome: string;
  quantidade: number;
  prioridade: Prioridade;
  /** Por unidade. */
  estimado_centavos: number | null;
  /** Total pago (todas as unidades). */
  pago_centavos: number | null;
  link: string | null;
  obs: string | null;
  comprado: number;
  comprado_em: string | null;
  criado_em: string;
}
