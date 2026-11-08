// A planta do apartamento (Apartamento Padrão, 48,29 m², pé-direito 2,80 m),
// redesenhada em metros a partir da imagem que o Vini mandou em 08/11/2026.
//
// Eixos: x para a direita, z para baixo na imagem (a "frente" do prédio).
// Origem no canto de cima, à esquerda, da cozinha. As medidas são as da
// planta arredondadas: servem para a maquete ficar parecida, não para obra.
//
// Cada cômodo tem PEÇAS: móveis com um lugar fixo. Peça "fixa" já vem com o
// apartamento (pia, vaso, box, tanque, bancada) e aparece sempre. As outras
// só aparecem quando um item da lista combina com elas pelo nome: "Geladeira
// Brastemp" vai para o lugar da geladeira. Item que não combina com nenhuma
// peça (talheres, pratos, toalhas) vira um pacotinho no APOIO do cômodo.

import type { Item } from './tipos';
import { normalizar } from './texto';

export type AreaId = 'cozinha' | 'servico' | 'sala' | 'bwc' | 'quarto1' | 'quarto2';

/** Retângulo no chão, em metros: canto (x, z), largura w (em x) e fundo d (em z). */
export interface Ret {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Para onde a frente do móvel aponta. */
export type Frente = 'x+' | 'x-' | 'z+' | 'z-';

export type Modelo =
  | 'geladeira' | 'fogao' | 'microondas' | 'bancada' | 'armario_aereo' | 'tanque' | 'lavadora' | 'varal'
  | 'sofa' | 'mesa' | 'cadeiras' | 'tapete' | 'rack' | 'tv' | 'mesa_centro' | 'luminaria' | 'cortina' | 'planta'
  | 'quadro' | 'cama_casal' | 'cama_solteiro' | 'criados' | 'guarda_roupa' | 'comoda' | 'escrivaninha' | 'cadeira'
  | 'pia_banheiro' | 'vaso' | 'box' | 'espelho' | 'lixeira';

export interface Peca {
  id: string;
  modelo: Modelo;
  ret: Ret;
  /** Altura da peça. */
  h: number;
  /** Altura do chão até a base (armário aéreo, TV na parede). */
  y?: number;
  frente?: Frente;
  /** Já vem com o apartamento: aparece sempre, não depende da lista. */
  fixa?: boolean;
  /** Bancada com a cuba da pia. */
  pia?: boolean;
  /** Palavras que, no começo de uma palavra do nome do item, levam o item a esta peça. */
  chaves?: string[];
}

export interface Area {
  id: AreaId;
  /** Nome na planta original. */
  nome: string;
  ret: Ret;
  piso: 'madeira' | 'ceramica';
  pecas: Peca[];
  /** Onde ficam os pacotinhos dos itens pequenos, e a que altura. */
  apoio: Ret & { y: number };
}

export const LARGURA = 11.2;
export const FUNDO = 6.15;

/**
 * Paredes: segmentos [x1, z1, x2, z2]. Os vãos das portas já estão abertos.
 * Conferido com o Vini em 08/11/2026 sobre a imagem da planta: não existe
 * mureta no alto entre a cozinha e a sala nem bancada (ilha) entre as duas;
 * existe a parede entre a lavanderia e a sala, ao lado do sofá; a porta de
 * entrada fica no alto, ao lado da mesa de jantar.
 */
export const PAREDES: [number, number, number, number][] = [
  // contorno
  [0, 0, 2.5, 0], // cozinha, até a porta de entrada
  [3.45, 0, 8.2, 0], // sala e banheiro (entrada de 2,50 a 3,45)
  [8.2, 0, 8.2, 1.85],
  [8.2, 1.85, 11.2, 1.85],
  [11.2, 1.85, 11.2, 6.15],
  [11.2, 6.15, 5.25, 6.15],
  [5.25, 6.15, 5.25, 4.6],
  [5.25, 4.6, 0, 4.6],
  [0, 4.6, 0, 0],
  // internas
  [2.45, 3.25, 2.45, 4.6], // lavanderia × sala, ao lado do sofá
  [5.25, 0, 5.25, 1.85], // banheiro × sala
  [6.1, 1.85, 8.2, 1.85], // banheiro × circulação (porta de 5,25 a 6,10)
  [6.1, 2.85, 8.2, 2.85], // quarto 02 × circulação (porta de 5,25 a 6,10)
  [5.25, 2.85, 5.25, 4.6], // sala × quarto 02
  [8.2, 2.85, 8.2, 6.15], // quarto 02 × quarto 01 (porta do quarto 01 de 1,85 a 2,85)
];

export interface Porta {
  id: string;
  nome: string;
  /** Parede em que está: 'x' = parede deitada (z fixo), 'z' = parede em pé (x fixo). */
  eixo: 'x' | 'z';
  /** O z (eixo 'x') ou o x (eixo 'z') da parede. */
  linha: number;
  /** Começo e fim do vão, ao longo da parede. */
  de: number;
  ate: number;
  /** A dobradiça fica no começo ou no fim do vão. */
  dobradica: 'inicio' | 'fim';
  /** Para que lado abre: +1 = para +z (ou +x), -1 = para -z (ou -x). */
  abre: 1 | -1;
}

/** Portas, com a folha desenhada aberta e o arco no chão, como na planta. */
export const PORTAS: Porta[] = [
  { id: 'entrada', nome: 'Entrada', eixo: 'x', linha: 0, de: 2.5, ate: 3.45, dobradica: 'inicio', abre: 1 },
  { id: 'bwc', nome: 'Banheiro', eixo: 'x', linha: 1.85, de: 5.28, ate: 6.08, dobradica: 'inicio', abre: -1 },
  { id: 'quarto2', nome: 'Quarto 02', eixo: 'x', linha: 2.85, de: 5.28, ate: 6.08, dobradica: 'inicio', abre: 1 },
  { id: 'quarto1', nome: 'Quarto 01', eixo: 'z', linha: 8.2, de: 1.9, ate: 2.8, dobradica: 'inicio', abre: 1 },
];

export interface Janela {
  /** Trecho de parede [x1, z1, x2, z2] que vira janela. */
  trecho: [number, number, number, number];
  /** Altura do peitoril (do chão até o vidro). */
  peitoril: number;
}

/** Janelas, onde a imagem da planta mostra os traços azul-esverdeados. */
export const JANELAS: Janela[] = [
  { trecho: [0.6, 4.6, 1.7, 4.6], peitoril: 1.1 }, // área de serviço
  { trecho: [3.0, 4.6, 4.5, 4.6], peitoril: 0.9 }, // sala
  { trecho: [8.2, 0.6, 8.2, 1.15], peitoril: 1.5 }, // banheiro
  { trecho: [6.1, 6.15, 7.3, 6.15], peitoril: 1.0 }, // quarto 02
  { trecho: [8.85, 6.15, 10.15, 6.15], peitoril: 1.0 }, // quarto 01
];

/** Corredor entre a sala e os quartos. Não é cômodo da lista. */
export const CIRCULACAO: Ret = { x: 5.25, z: 1.85, w: 2.95, d: 1.0 };

const CORTINA = ['cortina', 'persiana', 'blackout'];
const LUZ = ['luminaria', 'abajur', 'lustre', 'pendente', 'luz'];

export const AREAS: Area[] = [
  {
    id: 'cozinha',
    nome: 'Cozinha',
    ret: { x: 0, z: 0, w: 2.45, d: 3.35 },
    piso: 'ceramica',
    pecas: [
      { id: 'geladeira', modelo: 'geladeira', ret: { x: 0.04, z: 0.05, w: 0.7, d: 0.68 }, h: 1.8, frente: 'x+', chaves: ['geladeira', 'refrigerador', 'frigobar', 'freezer'] },
      { id: 'bancada1', modelo: 'bancada', ret: { x: 0.04, z: 0.75, w: 0.6, d: 0.8 }, h: 0.9, frente: 'x+', fixa: true },
      { id: 'fogao', modelo: 'fogao', ret: { x: 0.04, z: 1.57, w: 0.6, d: 0.56 }, h: 0.9, frente: 'x+', chaves: ['fogao', 'cooktop'] },
      { id: 'bancada2', modelo: 'bancada', ret: { x: 0.04, z: 2.15, w: 0.6, d: 1.15 }, h: 0.9, frente: 'x+', fixa: true, pia: true },
      { id: 'microondas', modelo: 'microondas', ret: { x: 0.08, z: 0.85, w: 0.4, d: 0.52 }, y: 0.9, h: 0.3, frente: 'x+', chaves: ['micro'] },
      { id: 'armario', modelo: 'armario_aereo', ret: { x: 0.04, z: 0.75, w: 0.35, d: 2.55 }, y: 1.5, h: 0.7, frente: 'x+', chaves: ['armario', 'paneleiro'] },
    ],
    apoio: { x: 1.2, z: 2.3, w: 1.0, d: 0.9, y: 0 },
  },
  {
    id: 'servico',
    nome: 'Á. Serviço',
    ret: { x: 0, z: 3.35, w: 2.45, d: 1.25 },
    piso: 'ceramica',
    pecas: [
      { id: 'tanque', modelo: 'tanque', ret: { x: 0.04, z: 3.42, w: 0.58, d: 0.55 }, h: 0.88, frente: 'x+', fixa: true },
      { id: 'lavadora', modelo: 'lavadora', ret: { x: 0.04, z: 3.99, w: 0.62, d: 0.58 }, h: 0.88, frente: 'x+', chaves: ['maquina de lavar', 'lavadora', 'lava e seca', 'lava-e-seca', 'lava roupa', 'secadora'] },
      { id: 'varal', modelo: 'varal', ret: { x: 0.75, z: 3.5, w: 1.1, d: 0.9 }, y: 2.1, h: 0.05, chaves: ['varal'] },
    ],
    apoio: { x: 0.9, z: 3.65, w: 1.0, d: 0.8, y: 0 },
  },
  {
    id: 'sala',
    nome: 'Sala',
    ret: { x: 2.45, z: 0, w: 2.8, d: 4.6 },
    piso: 'madeira',
    pecas: [
      { id: 'mesa_centro', modelo: 'mesa_centro', ret: { x: 3.75, z: 3.15, w: 0.6, d: 0.6 }, h: 0.42, chaves: ['mesa de centro', 'mesinha', 'mesa lateral'] },
      { id: 'mesa', modelo: 'mesa', ret: { x: 3.85, z: 0.2, w: 0.62, d: 1.3 }, h: 0.76, frente: 'x+', chaves: ['mesa'] },
      { id: 'cadeiras', modelo: 'cadeiras', ret: { x: 3.42, z: 0.25, w: 1.48, d: 1.2 }, h: 0.9, frente: 'x+', chaves: ['cadeira', 'banqueta'] },
      { id: 'sofa', modelo: 'sofa', ret: { x: 2.52, z: 2.55, w: 0.9, d: 1.9 }, h: 0.85, frente: 'x+', chaves: ['sofa', 'poltrona'] },
      { id: 'tapete', modelo: 'tapete', ret: { x: 3.5, z: 2.5, w: 1.45, d: 1.95 }, h: 0.015, chaves: ['tapete'] },
      { id: 'rack', modelo: 'rack', ret: { x: 4.85, z: 2.95, w: 0.36, d: 1.4 }, h: 0.5, frente: 'x-', chaves: ['rack', 'painel', 'aparador', 'estante'] },
      { id: 'tv', modelo: 'tv', ret: { x: 5.05, z: 3.05, w: 0.08, d: 1.2 }, y: 0.55, h: 0.7, frente: 'x-', chaves: ['tv', 'televis', 'smart tv'] },
      { id: 'luminaria', modelo: 'luminaria', ret: { x: 2.58, z: 2.08, w: 0.36, d: 0.36 }, h: 1.6, chaves: LUZ },
      { id: 'cortina', modelo: 'cortina', ret: { x: 2.85, z: 4.48, w: 1.85, d: 0.08 }, h: 2.3, frente: 'z-', chaves: CORTINA },
      { id: 'planta', modelo: 'planta', ret: { x: 4.85, z: 4.1, w: 0.34, d: 0.34 }, h: 0.95, chaves: ['planta', 'vaso de planta'] },
      { id: 'quadro', modelo: 'quadro', ret: { x: 2.51, z: 2.9, w: 0.04, d: 1.1 }, y: 1.35, h: 0.6, frente: 'x+', chaves: ['quadro'] },
    ],
    apoio: { x: 2.6, z: 1.2, w: 0.75, d: 0.75, y: 0 },
  },
  {
    id: 'bwc',
    nome: 'Bwc',
    ret: { x: 5.25, z: 0, w: 2.95, d: 1.85 },
    piso: 'ceramica',
    pecas: [
      { id: 'pia', modelo: 'pia_banheiro', ret: { x: 5.36, z: 0.05, w: 0.65, d: 0.48 }, h: 0.85, frente: 'z+', fixa: true },
      { id: 'vaso', modelo: 'vaso', ret: { x: 6.55, z: 0.05, w: 0.42, d: 0.66 }, h: 0.78, frente: 'z+', fixa: true },
      { id: 'box', modelo: 'box', ret: { x: 7.25, z: 0.05, w: 0.9, d: 1.05 }, h: 2.0, frente: 'z+', fixa: true },
      { id: 'espelho', modelo: 'espelho', ret: { x: 5.41, z: 0.05, w: 0.55, d: 0.04 }, y: 1.15, h: 0.75, frente: 'z+', chaves: ['espelho'] },
      { id: 'tapete', modelo: 'tapete', ret: { x: 7.3, z: 1.18, w: 0.75, d: 0.45 }, h: 0.015, chaves: ['tapete'] },
      { id: 'lixeira', modelo: 'lixeira', ret: { x: 6.12, z: 0.12, w: 0.25, d: 0.25 }, h: 0.35, chaves: ['lixeira', 'cesto'] },
    ],
    apoio: { x: 5.45, z: 0.75, w: 0.9, d: 0.8, y: 0 },
  },
  {
    id: 'quarto2',
    nome: 'Quarto 02',
    ret: { x: 5.25, z: 2.85, w: 2.95, d: 3.3 },
    piso: 'madeira',
    pecas: [
      { id: 'estante', modelo: 'guarda_roupa', ret: { x: 6.45, z: 2.92, w: 1.7, d: 0.55 }, h: 2.0, frente: 'z+', chaves: ['guarda-roupa', 'guarda roupa', 'roupeiro', 'armario', 'estante', 'prateleira'] },
      { id: 'cama', modelo: 'cama_solteiro', ret: { x: 5.35, z: 3.98, w: 0.95, d: 2.05 }, h: 0.5, frente: 'z-', chaves: ['cama', 'colchao', 'bicama', 'sofa-cama', 'sofa cama'] },
      { id: 'escrivaninha', modelo: 'escrivaninha', ret: { x: 7.5, z: 3.75, w: 0.62, d: 1.2 }, h: 0.76, frente: 'x-', chaves: ['escrivaninha', 'mesa'] },
      { id: 'cadeira', modelo: 'cadeira', ret: { x: 6.95, z: 4.1, w: 0.5, d: 0.5 }, h: 0.95, frente: 'x+', chaves: ['cadeira', 'poltrona'] },
      { id: 'luminaria', modelo: 'luminaria', ret: { x: 7.7, z: 3.82, w: 0.2, d: 0.2 }, y: 0.76, h: 0.42, chaves: LUZ },
      { id: 'tapete', modelo: 'tapete', ret: { x: 6.45, z: 4.35, w: 0.95, d: 1.35 }, h: 0.015, chaves: ['tapete'] },
      { id: 'cortina', modelo: 'cortina', ret: { x: 5.95, z: 6.03, w: 1.5, d: 0.08 }, h: 2.3, frente: 'z-', chaves: CORTINA },
    ],
    apoio: { x: 6.5, z: 5.25, w: 0.95, d: 0.7, y: 0 },
  },
  {
    id: 'quarto1',
    nome: 'Quarto 01',
    ret: { x: 8.2, z: 1.85, w: 3.0, d: 4.3 },
    piso: 'madeira',
    pecas: [
      { id: 'guarda_roupa', modelo: 'guarda_roupa', ret: { x: 9.15, z: 1.93, w: 2.0, d: 0.58 }, h: 2.1, frente: 'z+', chaves: ['guarda-roupa', 'guarda roupa', 'roupeiro', 'armario'] },
      { id: 'criados', modelo: 'criados', ret: { x: 10.72, z: 3.08, w: 0.42, d: 2.54 }, h: 0.55, frente: 'x-', chaves: ['cabeceira', 'criado'] },
      { id: 'cama', modelo: 'cama_casal', ret: { x: 9.2, z: 3.55, w: 1.98, d: 1.6 }, h: 0.5, frente: 'x-', chaves: ['cama', 'colchao', 'box'] },
      { id: 'abajur', modelo: 'luminaria', ret: { x: 10.8, z: 3.15, w: 0.25, d: 0.25 }, y: 0.55, h: 0.42, chaves: LUZ },
      { id: 'comoda', modelo: 'comoda', ret: { x: 8.28, z: 3.6, w: 0.45, d: 1.3 }, h: 0.85, frente: 'x+', chaves: ['comoda', 'sapateira', 'aparador'] },
      { id: 'tv', modelo: 'tv', ret: { x: 8.28, z: 3.75, w: 0.06, d: 1.0 }, y: 1.15, h: 0.6, frente: 'x+', chaves: ['tv', 'televis', 'smart tv'] },
      { id: 'tapete', modelo: 'tapete', ret: { x: 8.85, z: 3.4, w: 0.6, d: 1.9 }, h: 0.015, chaves: ['tapete'] },
      { id: 'espelho', modelo: 'espelho', ret: { x: 8.28, z: 5.35, w: 0.04, d: 0.5 }, y: 0.35, h: 1.5, frente: 'x+', chaves: ['espelho'] },
      { id: 'cortina', modelo: 'cortina', ret: { x: 8.7, z: 6.03, w: 1.6, d: 0.08 }, h: 2.3, frente: 'z-', chaves: CORTINA },
    ],
    apoio: { x: 9.3, z: 5.35, w: 1.4, d: 0.6, y: 0 },
  },
];

export const area = (id: string | null | undefined): Area | undefined => AREAS.find((a) => a.id === id);

/** Coisas de cama, mesa e banho nunca viram móvel: "Jogo de cama" não é cama. */
const TECIDOS = ['jogo de', 'roupa de', 'lencol', 'edredom', 'travesseiro', 'almofada', 'toalha', 'protetor'];
/** Estas só como palavra inteira: "colcha" não pode pegar "colchão". */
const TECIDOS_PALAVRA = ['colcha', 'colchas', 'manta', 'mantas', 'capa', 'capas'];

/** Posição em que a chave aparece no começo de uma palavra do nome; -1 se não aparece. */
function posicao(nome: string, chave: string): number {
  const n = ` ${nome}`;
  const a = n.indexOf(` ${chave}`);
  const b = n.indexOf(`-${chave}`);
  return a < 0 ? b : b < 0 ? a : Math.min(a, b);
}

/**
 * Peça do item. Vale a palavra que aparece primeiro no nome: "Luminária de
 * mesa" é luminária, não mesa. Empate (mesmo lugar): vence a chave mais longa,
 * então "Mesa de centro" não cai na mesa de jantar.
 */
export function pecaDoItem(a: Area, nomeDoItem: string): Peca | undefined {
  const nome = normalizar(nomeDoItem);
  if (TECIDOS.some((t) => posicao(nome, t) >= 0)) return undefined;
  if (nome.split(/[\s-]+/).some((p) => TECIDOS_PALAVRA.includes(p))) return undefined;
  let melhor: { peca: Peca; pos: number; tam: number } | undefined;
  for (const peca of a.pecas) {
    for (const k of peca.chaves ?? []) {
      const pos = posicao(nome, k);
      if (pos < 0) continue;
      if (!melhor || pos < melhor.pos || (pos === melhor.pos && k.length > melhor.tam)) melhor = { peca, pos, tam: k.length };
    }
  }
  return melhor?.peca;
}

export interface Distribuicao {
  /** Itens de cada peça (pelo id da peça). */
  pecas: Map<string, Item[]>;
  /** Itens que não são móvel: viram pacotinhos no apoio. */
  pequenos: Item[];
}

export function distribuir(a: Area, itens: Item[]): Distribuicao {
  const pecas = new Map<string, Item[]>();
  const pequenos: Item[] = [];
  for (const i of itens) {
    const p = pecaDoItem(a, i.nome);
    if (!p) { pequenos.push(i); continue; }
    const lista = pecas.get(p.id);
    if (lista) lista.push(i);
    else pecas.set(p.id, [i]);
  }
  return { pecas, pequenos };
}

/** Comprado só quando todos os itens da peça foram comprados (cama E colchão). */
export function situacao(itens: Item[] | undefined): 'vazio' | 'falta' | 'comprado' {
  if (!itens?.length) return 'vazio';
  return itens.every((i) => i.comprado) ? 'comprado' : 'falta';
}
