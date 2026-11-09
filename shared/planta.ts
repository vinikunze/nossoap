// A planta do apartamento (Apartamento Padrão, 48,29 m², pé-direito 2,80 m),
// redesenhada em metros a partir da imagem que o Vini mandou em 08/11/2026.
//
// Eixos: x para a direita, z para baixo na imagem (a "frente" do prédio).
// Origem no canto de cima, à esquerda, da cozinha. As medidas são as da
// planta arredondadas: servem para a maquete ficar parecida, não para obra.
//
// Cada cômodo tem:
// - PEÇAS: móveis e eletros com um lugar fixo. Peça "fixa" já vem com o
//   apartamento (pia, vaso, box, tanque, tampo da cozinha). As outras mudam
//   de cor conforme a lista: comprada (cor de verdade), falta comprar
//   (fantasma azul) ou fora da lista (decoração, cor de maquete branca).
//   "Geladeira Brastemp" vai para o lugar da geladeira.
// - MÓDULOS: os móveis planejados (armários, gavetas, bancadas), pedidos pelo
//   Vini em 09/11/2026. Abrem com um toque e mostram dentro as coisas da lista
//   que vão ali: "Talheres" na gaveta de talheres, "Pano de prato" na gaveta de
//   panos, "Escorredor de louça" ao lado da pia.
// Item que não é peça nem cabe num módulo vai para o módulo padrão do cômodo
// ou, se não houver, vira um pacotinho no APOIO.

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
  | 'pia_banheiro' | 'vaso' | 'box' | 'espelho' | 'lixeira'
  | 'forno' | 'cooktop' | 'tampo' | 'cuba' | 'nicho' | 'rodape';

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
  /**
   * Também recebe o item quando a chave aparece em qualquer lugar do nome,
   * mesmo que outra peça tenha ganhado: "Mesa de jantar com 6 cadeiras"
   * acende a mesa E as cadeiras.
   */
  acompanha?: boolean;
}

export type TipoModulo = 'gaveta' | 'porta' | 'superficie';

/** Pedaço de móvel planejado que guarda coisas: gaveta, armário com porta ou bancada. */
export interface Modulo {
  id: string;
  /** Como aparece para o casal: "Gaveta de talheres". */
  nome: string;
  tipo: TipoModulo;
  ret: Ret;
  /** Altura da base e altura do módulo. */
  y: number;
  h: number;
  frente: Frente;
  /** Porta: lado da dobradiça, olhando de frente. */
  dobradica?: 'esq' | 'dir';
  /** Porta: quantas prateleiras dentro. */
  prateleiras?: number;
  chaves: string[];
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
  modulos?: Modulo[];
  /** Módulo que recebe o que não combina com nenhum outro. */
  moduloPadrao?: string;
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
    // Cozinha planejada na parede da esquerda, de cima para baixo na planta:
    // geladeira, torre quente (forno e micro-ondas), cooktop com armário de
    // panelas, gaveteiro com bancada livre e a pia. Armários aéreos em cima.
    pecas: [
      { id: 'geladeira', modelo: 'geladeira', ret: { x: 0.06, z: 0.06, w: 0.68, d: 0.7 }, h: 1.85, frente: 'x+', chaves: ['geladeira', 'refrigerador', 'frigobar', 'freezer'] },
      { id: 'nicho', modelo: 'nicho', ret: { x: 0.06, z: 0.78, w: 0.6, d: 0.6 }, y: 0.74, h: 1.12, frente: 'x+', fixa: true },
      { id: 'forno', modelo: 'forno', ret: { x: 0.1, z: 0.82, w: 0.52, d: 0.52 }, y: 0.78, h: 0.48, frente: 'x+', chaves: ['forno'] },
      { id: 'microondas', modelo: 'microondas', ret: { x: 0.12, z: 0.85, w: 0.42, d: 0.48 }, y: 1.4, h: 0.3, frente: 'x+', chaves: ['micro'] },
      { id: 'rodape', modelo: 'rodape', ret: { x: 0.1, z: 0.8, w: 0.5, d: 2.48 }, h: 0.1, frente: 'x+', fixa: true },
      { id: 'tampo', modelo: 'tampo', ret: { x: 0.06, z: 1.4, w: 0.64, d: 1.9 }, y: 0.86, h: 0.04, frente: 'x+', fixa: true },
      { id: 'cooktop', modelo: 'cooktop', ret: { x: 0.12, z: 1.45, w: 0.5, d: 0.5 }, y: 0.9, h: 0.012, frente: 'x+', chaves: ['cooktop', 'fogao'] },
      { id: 'cuba', modelo: 'cuba', ret: { x: 0.12, z: 2.86, w: 0.42, d: 0.4 }, y: 0.9, h: 0.01, frente: 'x+', fixa: true },
    ],
    modulos: [
      { id: 'formas', nome: 'Armário de formas e assadeiras', tipo: 'porta', ret: { x: 0.06, z: 0.78, w: 0.6, d: 0.6 }, y: 0.1, h: 0.62, frente: 'x+', dobradica: 'dir', prateleiras: 1,
        chaves: ['forma', 'assadeira', 'marinex', 'refratario', 'travessa', 'tabua', 'bandeja', 'pirex'] },
      { id: 'diversos', nome: 'Armário de diversos', tipo: 'porta', ret: { x: 0.06, z: 0.78, w: 0.6, d: 0.6 }, y: 1.86, h: 0.44, frente: 'x+', dobradica: 'dir',
        chaves: ['balanca', 'diversos'] },
      { id: 'panelas', nome: 'Armário de panelas', tipo: 'porta', ret: { x: 0.06, z: 1.4, w: 0.6, d: 0.6 }, y: 0.1, h: 0.74, frente: 'x+', dobradica: 'esq', prateleiras: 1,
        chaves: ['panela', 'frigideira', 'cacarola', 'leiteira', 'wok', 'escorredor de macarrao', 'tampa'] },
      { id: 'talheres', nome: 'Gaveta de talheres', tipo: 'gaveta', ret: { x: 0.06, z: 2.02, w: 0.6, d: 0.6 }, y: 0.6, h: 0.24, frente: 'x+',
        chaves: ['talher', 'faca', 'garfo', 'colher', 'abridor', 'saca-rolha', 'cortador', 'organizador de gaveta', 'faqueiro'] },
      { id: 'utensilios', nome: 'Gaveta de utensílios', tipo: 'gaveta', ret: { x: 0.06, z: 2.02, w: 0.6, d: 0.6 }, y: 0.35, h: 0.24, frente: 'x+',
        chaves: ['concha', 'escumadeira', 'espatula', 'pegador', 'colher grande', 'colher de servir', 'fue', 'batedor', 'peneira', 'ralador', 'descascador', 'tesoura', 'espremedor', 'termometro', 'copo medidor', 'medidor', 'pincel', 'rolo'] },
      { id: 'panos', nome: 'Gaveta de panos', tipo: 'gaveta', ret: { x: 0.06, z: 2.02, w: 0.6, d: 0.6 }, y: 0.1, h: 0.24, frente: 'x+',
        chaves: ['pano', 'luva', 'descanso', 'guardanapo', 'toalha de mesa', 'avental', 'jogo americano'] },
      { id: 'pia', nome: 'Armário da pia', tipo: 'porta', ret: { x: 0.06, z: 2.64, w: 0.6, d: 0.66 }, y: 0.1, h: 0.74, frente: 'x+', dobradica: 'dir',
        chaves: ['lixeira', 'lixo', 'produto', 'esponja', 'desengordurante', 'limpeza'] },
      { id: 'bancada', nome: 'Bancada', tipo: 'superficie', ret: { x: 0.1, z: 2.06, w: 0.52, d: 0.52 }, y: 0.9, h: 0.4, frente: 'x+',
        chaves: ['liquidificador', 'mixer', 'airfryer', 'air fryer', 'fritadeira', 'sanduicheira', 'chaleira', 'cafeteira', 'coador', 'torradeira', 'batedeira', 'garrafa', 'porta-papel', 'porta papel', 'processador'] },
      { id: 'lado_pia', nome: 'Ao lado da pia', tipo: 'superficie', ret: { x: 0.1, z: 2.66, w: 0.52, d: 0.2 }, y: 0.9, h: 0.35, frente: 'x+',
        chaves: ['escorredor de louca', 'escorredor de prato', 'porta-detergente', 'porta detergente', 'dispenser', 'rodinho de pia'] },
      { id: 'potes', nome: 'Armário de potes e temperos', tipo: 'porta', ret: { x: 0.06, z: 1.4, w: 0.36, d: 0.6 }, y: 1.5, h: 0.7, frente: 'x+', dobradica: 'esq', prateleiras: 1,
        chaves: ['pote', 'lata', 'hermetic', 'porta-presunto', 'porta presunto', 'porta-frios', 'porta frios', 'porta-tempero', 'porta tempero', 'saleiro', 'acucareiro', 'mantimento'] },
      { id: 'loucas', nome: 'Armário de louças', tipo: 'porta', ret: { x: 0.06, z: 2.02, w: 0.36, d: 0.6 }, y: 1.5, h: 0.7, frente: 'x+', dobradica: 'esq', prateleiras: 1,
        chaves: ['prato', 'tigela', 'bowl', 'sopeira', 'saladeira', 'aparelho de jantar'] },
      { id: 'copos', nome: 'Armário de copos e xícaras', tipo: 'porta', ret: { x: 0.06, z: 2.64, w: 0.36, d: 0.66 }, y: 1.5, h: 0.7, frente: 'x+', dobradica: 'dir', prateleiras: 1,
        chaves: ['copo', 'taca', 'xicara', 'caneca', 'jarra'] },
    ],
    moduloPadrao: 'diversos',
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
      { id: 'varal', modelo: 'varal', ret: { x: 0.72, z: 3.5, w: 1.05, d: 0.9 }, y: 2.1, h: 0.05, chaves: ['varal'] },
    ],
    // Armários em cima do tanque e da máquina e um armário alto de limpeza
    // encostado na parede da sala.
    modulos: [
      { id: 'produtos', nome: 'Armário de produtos', tipo: 'porta', ret: { x: 0.06, z: 3.42, w: 0.36, d: 0.57 }, y: 1.55, h: 0.65, frente: 'x+', dobradica: 'esq', prateleiras: 1,
        chaves: ['sabao', 'porta-sabao', 'porta sabao', 'amaciante', 'porta-amaciante', 'alvejante', 'produto', 'tira-manchas'] },
      { id: 'organizadores', nome: 'Armário de organizadores', tipo: 'porta', ret: { x: 0.06, z: 3.99, w: 0.36, d: 0.58 }, y: 1.55, h: 0.65, frente: 'x+', dobradica: 'dir', prateleiras: 1,
        chaves: ['prendedor', 'cesto', 'organizador', 'caixa'] },
      { id: 'limpeza', nome: 'Armário de limpeza', tipo: 'porta', ret: { x: 1.82, z: 3.42, w: 0.56, d: 0.6 }, y: 0.04, h: 2.1, frente: 'x-', dobradica: 'dir',
        chaves: ['vassoura', 'rodo', 'mop', 'pa de lixo', 'balde', 'aspirador', 'ferro', 'mesa de passar', 'tabua de passar', 'cesto de roupa', 'escada', 'pano de chao'] },
    ],
    moduloPadrao: 'limpeza',
    apoio: { x: 0.9, z: 3.65, w: 0.8, d: 0.8, y: 0 },
  },
  {
    id: 'sala',
    nome: 'Sala',
    ret: { x: 2.45, z: 0, w: 2.8, d: 4.6 },
    piso: 'madeira',
    pecas: [
      { id: 'mesa_centro', modelo: 'mesa_centro', ret: { x: 3.75, z: 3.15, w: 0.6, d: 0.6 }, h: 0.42, chaves: ['mesa de centro', 'mesinha', 'mesa lateral'] },
      { id: 'mesa', modelo: 'mesa', ret: { x: 3.85, z: 0.2, w: 0.62, d: 1.3 }, h: 0.76, frente: 'x+', chaves: ['mesa'] },
      { id: 'cadeiras', modelo: 'cadeiras', ret: { x: 3.42, z: 0.25, w: 1.48, d: 1.2 }, h: 0.9, frente: 'x+', chaves: ['cadeira', 'banqueta'], acompanha: true },
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
      { id: 'pia', modelo: 'pia_banheiro', ret: { x: 5.36, z: 0.05, w: 0.65, d: 0.48 }, y: 0.82, h: 0.12, frente: 'z+', fixa: true },
      { id: 'vaso', modelo: 'vaso', ret: { x: 6.55, z: 0.05, w: 0.42, d: 0.66 }, h: 0.78, frente: 'z+', fixa: true },
      { id: 'box', modelo: 'box', ret: { x: 7.25, z: 0.05, w: 0.9, d: 1.05 }, h: 2.0, frente: 'z+', fixa: true },
      { id: 'espelho', modelo: 'espelho', ret: { x: 5.41, z: 0.05, w: 0.55, d: 0.04 }, y: 1.15, h: 0.75, frente: 'z+', chaves: ['espelho'] },
      { id: 'tapete', modelo: 'tapete', ret: { x: 7.3, z: 1.18, w: 0.75, d: 0.45 }, h: 0.015, chaves: ['tapete'] },
      { id: 'lixeira', modelo: 'lixeira', ret: { x: 6.12, z: 0.12, w: 0.25, d: 0.25 }, h: 0.35, chaves: ['lixeira', 'cesto'] },
    ],
    modulos: [
      { id: 'gabinete', nome: 'Gabinete da pia', tipo: 'porta', ret: { x: 5.36, z: 0.05, w: 0.65, d: 0.48 }, y: 0.06, h: 0.76, frente: 'z+', dobradica: 'esq', prateleiras: 1,
        chaves: ['toalha', 'papel', 'sabonete', 'shampoo', 'escova', 'secador', 'produto', 'porta-escova', 'saboneteira'] },
    ],
    moduloPadrao: 'gabinete',
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
      { id: 'criados', modelo: 'criados', ret: { x: 10.72, z: 3.08, w: 0.42, d: 2.54 }, h: 0.55, frente: 'x-', chaves: ['cabeceira', 'criado'] },
      { id: 'cama', modelo: 'cama_casal', ret: { x: 9.2, z: 3.55, w: 1.98, d: 1.6 }, h: 0.5, frente: 'x-', chaves: ['cama', 'colchao', 'box'] },
      { id: 'abajur', modelo: 'luminaria', ret: { x: 10.8, z: 3.15, w: 0.25, d: 0.25 }, y: 0.55, h: 0.42, chaves: LUZ },
      { id: 'comoda', modelo: 'comoda', ret: { x: 8.28, z: 3.6, w: 0.45, d: 1.3 }, h: 0.85, frente: 'x+', chaves: ['comoda', 'sapateira', 'aparador'] },
      { id: 'tv', modelo: 'tv', ret: { x: 8.28, z: 3.75, w: 0.06, d: 1.0 }, y: 1.15, h: 0.6, frente: 'x+', chaves: ['tv', 'televis', 'smart tv'] },
      { id: 'tapete', modelo: 'tapete', ret: { x: 8.85, z: 3.4, w: 0.6, d: 1.9 }, h: 0.015, chaves: ['tapete'] },
      { id: 'espelho', modelo: 'espelho', ret: { x: 8.28, z: 5.35, w: 0.04, d: 0.5 }, y: 0.35, h: 1.5, frente: 'x+', chaves: ['espelho'] },
      { id: 'cortina', modelo: 'cortina', ret: { x: 8.7, z: 6.03, w: 1.6, d: 0.08 }, h: 2.3, frente: 'z-', chaves: CORTINA },
    ],
    // Guarda-roupa planejado na parede de cima: cabideiro, roupa de cama,
    // duas gavetas e o maleiro em cima.
    modulos: [
      { id: 'cabideiro', nome: 'Cabideiro', tipo: 'porta', ret: { x: 9.15, z: 1.93, w: 0.95, d: 0.58 }, y: 0.04, h: 1.66, frente: 'z+', dobradica: 'esq',
        chaves: ['roupa', 'cabide', 'camisa', 'vestido', 'casaco', 'calca', 'terno'] },
      { id: 'cama', nome: 'Roupa de cama', tipo: 'porta', ret: { x: 10.1, z: 1.93, w: 1.0, d: 0.58 }, y: 0.6, h: 1.1, frente: 'z+', dobradica: 'dir', prateleiras: 2,
        chaves: ['lencol', 'jogo de cama', 'colcha', 'edredom', 'manta', 'cobertor', 'fronha', 'protetor', 'cobre-leito'] },
      { id: 'gaveta1', nome: 'Gaveta de cima', tipo: 'gaveta', ret: { x: 10.1, z: 1.93, w: 1.0, d: 0.58 }, y: 0.32, h: 0.26, frente: 'z+',
        chaves: ['meia', 'pijama', 'cueca', 'calcinha', 'sutia', 'lingerie'] },
      { id: 'gaveta2', nome: 'Gaveta de baixo', tipo: 'gaveta', ret: { x: 10.1, z: 1.93, w: 1.0, d: 0.58 }, y: 0.04, h: 0.26, frente: 'z+',
        chaves: ['bermuda', 'short', 'roupa de academia'] },
      { id: 'maleiro', nome: 'Maleiro', tipo: 'porta', ret: { x: 9.15, z: 1.93, w: 1.95, d: 0.58 }, y: 1.72, h: 0.4, frente: 'z+', dobradica: 'esq',
        chaves: ['travesseiro', 'almofada', 'mala', 'malas'] },
    ],
    moduloPadrao: 'cama',
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
 * Entre várias opções com chaves, a que combina com o nome. Vale a palavra
 * que aparece primeiro no nome: "Luminária de mesa" é luminária, não mesa.
 * Empate (mesmo lugar): vence a chave mais longa, então "Mesa de centro" não
 * cai na mesa de jantar e "Colher grande de servir" não cai nos talheres.
 */
function melhor<T extends { chaves?: string[] }>(opcoes: T[], nome: string): T | undefined {
  let achou: { o: T; pos: number; tam: number } | undefined;
  for (const o of opcoes) {
    for (const k of o.chaves ?? []) {
      const pos = posicao(nome, k);
      if (pos < 0) continue;
      if (!achou || pos < achou.pos || (pos === achou.pos && k.length > achou.tam)) achou = { o, pos, tam: k.length };
    }
  }
  return achou?.o;
}

const ehTecido = (nome: string) =>
  TECIDOS.some((t) => posicao(nome, t) >= 0) || nome.split(/[\s-]+/).some((p) => TECIDOS_PALAVRA.includes(p));

/** Peça (móvel ou eletro) do item. Coisas de cama, mesa e banho nunca são peça. */
export function pecaDoItem(a: Area, nomeDoItem: string): Peca | undefined {
  const nome = normalizar(nomeDoItem);
  return ehTecido(nome) ? undefined : melhor(a.pecas, nome);
}

/** Módulo (armário, gaveta, bancada) onde o item é guardado. */
export function moduloDoItem(a: Area, nomeDoItem: string): Modulo | undefined {
  const mods = a.modulos ?? [];
  return melhor(mods, normalizar(nomeDoItem)) ?? mods.find((m) => m.id === a.moduloPadrao);
}

export interface Distribuicao {
  /** Itens de cada peça (pelo id da peça). */
  pecas: Map<string, Item[]>;
  /** Itens guardados em cada módulo (pelo id do módulo). */
  modulos: Map<string, Item[]>;
  /** Nem peça nem módulo: viram pacotinhos no apoio. */
  pequenos: Item[];
}

function juntar(m: Map<string, Item[]>, id: string, i: Item) {
  const lista = m.get(id);
  if (lista) lista.push(i);
  else m.set(id, [i]);
}

export function distribuir(a: Area, itens: Item[]): Distribuicao {
  const pecas = new Map<string, Item[]>();
  const modulos = new Map<string, Item[]>();
  const pequenos: Item[] = [];
  for (const i of itens) {
    const p = pecaDoItem(a, i.nome);
    if (p) {
      juntar(pecas, p.id, i);
      const nome = normalizar(i.nome);
      for (const outra of a.pecas) {
        if (outra !== p && outra.acompanha && outra.chaves?.some((k) => posicao(nome, k) >= 0)) juntar(pecas, outra.id, i);
      }
      continue;
    }
    const m = moduloDoItem(a, i.nome);
    if (m) juntar(modulos, m.id, i);
    else pequenos.push(i);
  }
  return { pecas, modulos, pequenos };
}

/** Comprado só quando todos os itens da peça foram comprados (cama E colchão). */
export function situacao(itens: Item[] | undefined): 'vazio' | 'falta' | 'comprado' {
  if (!itens?.length) return 'vazio';
  return itens.every((i) => i.comprado) ? 'comprado' : 'falta';
}

export type Miniatura =
  | 'prato' | 'tigela' | 'copo' | 'xicara' | 'talher' | 'utensilio' | 'pano' | 'panela' | 'forma' | 'pote'
  | 'eletro' | 'garrafa' | 'cabo' | 'balde' | 'produto' | 'textil' | 'travesseiro' | 'caixa';

const MINIATURAS: [Miniatura, string[]][] = [
  ['travesseiro', ['travesseiro', 'almofada']],
  ['textil', ['lencol', 'jogo de cama', 'colcha', 'edredom', 'manta', 'cobertor', 'toalha', 'fronha', 'roupa']],
  ['pano', ['pano', 'luva', 'guardanapo', 'avental', 'descanso']],
  ['xicara', ['xicara', 'caneca']],
  ['copo', ['copo', 'taca', 'jarra']],
  ['prato', ['prato']],
  ['tigela', ['tigela', 'bowl', 'saladeira', 'sopeira']],
  ['garrafa', ['garrafa']],
  ['panela', ['panela', 'frigideira', 'cacarola', 'leiteira', 'escorredor de macarrao', 'chaleira']],
  ['forma', ['forma', 'assadeira', 'marinex', 'travessa', 'tabua', 'refratario', 'mesa de passar', 'tabua de passar']],
  ['talher', ['talher', 'faca', 'garfo', 'colher', 'faqueiro']],
  ['utensilio', ['concha', 'escumadeira', 'espatula', 'pegador', 'fue', 'batedor', 'peneira', 'ralador', 'descascador', 'tesoura', 'espremedor', 'termometro', 'abridor', 'cortador', 'medidor']],
  ['cabo', ['vassoura', 'rodo', 'mop', 'pa de lixo', 'aspirador']],
  ['balde', ['balde', 'lixeira', 'cesto']],
  ['produto', ['sabao', 'amaciante', 'detergente', 'produto', 'saleiro', 'alvejante']],
  ['pote', ['pote', 'lata', 'porta-presunto', 'porta presunto', 'organizador', 'prendedor', 'porta']],
  ['eletro', ['liquidificador', 'mixer', 'airfryer', 'air fryer', 'sanduicheira', 'cafeteira', 'coador', 'torradeira', 'batedeira', 'balanca', 'ferro', 'escorredor']],
];

/** Que miniatura desenhar para o item dentro de um armário ou gaveta. */
export function miniaturaDo(nomeDoItem: string): Miniatura {
  const nome = normalizar(nomeDoItem);
  const achou = melhor(MINIATURAS.map(([m, chaves]) => ({ m, chaves })), nome);
  return achou?.m ?? 'caixa';
}
