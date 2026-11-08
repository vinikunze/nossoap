// Maquete 3D do apartamento, feita com Three.js a partir de shared/planta.ts.
//
// Dois modos:
// - "geral": o apartamento inteiro, cortado na altura de 1,1 m como numa
//   planta de arquiteto. Tocar num cômodo entra nele.
// - um cômodo: só ele, com paredes inteiras. As paredes que ficam entre a
//   câmera e o meio do cômodo ficam transparentes, para enxergar dentro.
//
// Móvel da lista já comprado aparece com cor de verdade; o que falta comprar
// aparece como "fantasma" (azul transparente com contorno dourado). Itens
// pequenos (talheres, toalhas…) viram pacotinhos no apoio do cômodo.
//
// Este arquivo só é carregado quando a planta aparece (import dinâmico), para
// a lista abrir rápido mesmo sem ele.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  AREAS, PAREDES, PORTAS, JANELAS, CIRCULACAO, LARGURA, FUNDO, distribuir, situacao,
  type Area, type AreaId, type Peca, type Ret, type Frente, type Porta,
} from '../../shared/planta';
import type { Item } from '../../shared/tipos';

export interface InfoArea {
  id: AreaId;
  /** Nome do cômodo da lista ligado a este lugar da planta. */
  rotulo: string;
  progresso: number;
  itens: Item[];
  /** Há um cômodo ativo na lista ligado a este lugar. */
  temComodo: boolean;
}

export interface Opcoes {
  modo: 'geral' | AreaId;
  areas: InfoArea[];
  aoEscolherArea?: (id: AreaId) => void;
  aoEscolherItem?: (item: Item) => void;
}

export interface Planta {
  atualizar(areas: InfoArea[]): void;
  /** fator < 1 aproxima, > 1 afasta. */
  aproximar(fator: number): void;
  /** Volta para a vista inicial. */
  recentrar(): void;
  destruir(): void;
}

// ---------- cores (mesma paleta do app) ----------

const COR = {
  madeiraPiso: 0xd9c4a0,
  ceramica: 0xe9e5dd,
  parede: 0xfbfaf6,
  corte: 0x1b2d55, // topo das paredes: o traço escuro da planta
  branco: 0xf6f4ef,
  pedra: 0xd8d2c6,
  inox: 0xdde0e4,
  preto: 0x2a2d34,
  vidroEscuro: 0x3b4352,
  madeira: 0xc9a77c,
  madeiraEscura: 0x8a6a48,
  tecido: 0x55678f,
  tecidoClaro: 0x6d7fa6,
  marinho: 0x1b2d55,
  dourado: 0xc9a227,
  creme: 0xefe6d2,
  tapete: 0xd9cfbb,
  verde: 0x55804c,
  terracota: 0xb86b4b,
  espelho: 0xc9d6e0,
  vidro: 0xbfd9e6,
  janela: 0x5aa9c2, // o traço azul-esverdeado das janelas na planta
};

const ALTURA_PORTA = 2.1;

const ALTURA_PAREDE = 2.5;
const ALTURA_CORTE = 1.1;
const ESPESSURA = 0.12;

// ---------- materiais ----------

function material(cor: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, metalness: 0, side: THREE.DoubleSide, ...extra });
}

// ---------- formas básicas (no sistema da peça: centro no meio, frente para +z) ----------

function caixa(g: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function cilindro(g: THREE.Object3D, r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, rTopo = r) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTopo, r, h, 24), m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

/** Linhas finas na frente (portas, gavetas). */
function frisos(g: THREE.Object3D, w: number, h: number, d: number, verticais: number, horizontais: number, m: THREE.Material, y0 = 0) {
  for (let i = 1; i < verticais; i++) caixa(g, 0.01, h * 0.96, 0.006, m, -w / 2 + (w * i) / verticais, y0 + h * 0.02, d / 2 + 0.003);
  for (let i = 1; i < horizontais; i++) caixa(g, w * 0.96, 0.01, 0.006, m, 0, y0 + (h * i) / horizontais, d / 2 + 0.003);
}

// ---------- móveis ----------

type Construtor = (g: THREE.Group, w: number, d: number, h: number, p: Peca, m: Mats) => void;

interface Mats {
  [k: string]: THREE.MeshStandardMaterial;
}

function criarMats(): Mats {
  return {
    branco: material(COR.branco),
    pedra: material(COR.pedra, { roughness: 0.5 }),
    inox: material(COR.inox, { roughness: 0.35, metalness: 0.5 }),
    preto: material(COR.preto, { roughness: 0.5 }),
    vidroEscuro: material(COR.vidroEscuro, { roughness: 0.2 }),
    madeira: material(COR.madeira),
    madeiraEscura: material(COR.madeiraEscura),
    tecido: material(COR.tecido, { roughness: 1 }),
    tecidoClaro: material(COR.tecidoClaro, { roughness: 1 }),
    marinho: material(COR.marinho, { roughness: 1 }),
    dourado: material(COR.dourado, { roughness: 0.6 }),
    creme: material(COR.creme, { roughness: 1 }),
    tapete: material(COR.tapete, { roughness: 1 }),
    verde: material(COR.verde, { flatShading: true }),
    terracota: material(COR.terracota),
    espelho: material(COR.espelho, { roughness: 0.1, metalness: 0.6 }),
    vidro: material(COR.vidro, { transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false }),
    luz: material(COR.creme, { emissive: 0xffe2a8, emissiveIntensity: 0.35 }),
    friso: material(0xb5b0a5),
  };
}

const MODELOS: Record<Peca['modelo'], Construtor> = {
  geladeira(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.inox);
    caixa(g, w * 0.98, 0.012, 0.006, m.preto, 0, h * 0.62, d / 2 + 0.003);
    caixa(g, 0.03, 0.4, 0.04, m.preto, w / 2 - 0.08, h * 0.68, d / 2 + 0.02);
    caixa(g, 0.03, 0.3, 0.04, m.preto, w / 2 - 0.08, h * 0.25, d / 2 + 0.02);
  },
  fogao(g, w, d, h, _p, m) {
    caixa(g, w, h - 0.02, d, m.branco);
    caixa(g, w, 0.02, d, m.preto, 0, h - 0.02);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cilindro(g, 0.07, 0.015, m.inox, (x * w) / 4, h, (z * d) / 4);
    caixa(g, w * 0.8, h * 0.42, 0.01, m.vidroEscuro, 0, h * 0.18, d / 2 + 0.005);
  },
  microondas(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.preto);
    caixa(g, w * 0.62, h * 0.7, 0.01, m.vidroEscuro, -w * 0.12, h * 0.15, d / 2 + 0.005);
  },
  bancada(g, w, d, h, p, m) {
    caixa(g, w, h - 0.04, d, m.branco);
    caixa(g, w + 0.02, 0.04, d + 0.03, m.pedra, 0, h - 0.04, 0.01);
    frisos(g, w, h - 0.12, d, Math.max(1, Math.round(w / 0.45)), 1, m.friso, 0.06);
    if (p.pia) {
      caixa(g, Math.min(0.55, w * 0.55), 0.006, d * 0.6, m.inox, 0, h, -0.02);
      cilindro(g, 0.015, 0.26, m.inox, 0, h, -d / 2 + 0.07);
      caixa(g, 0.025, 0.025, 0.16, m.inox, 0, h + 0.24, -d / 2 + 0.14);
    }
  },
  armario_aereo(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.branco);
    frisos(g, w, h, d, Math.max(1, Math.round(w / 0.45)), 1, m.friso);
  },
  tanque(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.branco);
    caixa(g, w * 0.75, 0.006, d * 0.6, m.pedra, 0, h, 0.02);
    cilindro(g, 0.015, 0.22, m.inox, 0, h, -d / 2 + 0.06);
  },
  lavadora(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.branco);
    const porta = cilindro(g, Math.min(w, h) * 0.3, 0.03, m.vidroEscuro, 0, 0, d / 2);
    porta.rotation.x = Math.PI / 2;
    porta.position.y = h * 0.45;
    caixa(g, w * 0.9, 0.08, 0.01, m.inox, 0, h - 0.12, d / 2 + 0.005);
  },
  varal(g, w, d, _h, _p, m) {
    for (let i = 0; i < 5; i++) caixa(g, w, 0.012, 0.012, m.inox, 0, 0, -d / 2 + (d * (i + 0.5)) / 5);
    caixa(g, 0.03, 0.03, d, m.inox, -w / 2, 0, 0);
    caixa(g, 0.03, 0.03, d, m.inox, w / 2, 0, 0);
  },
  sofa(g, w, d, h, _p, m) {
    caixa(g, w, 0.4, d, m.tecido);
    caixa(g, w, h, 0.2, m.tecido, 0, 0, -d / 2 + 0.1);
    caixa(g, 0.16, 0.6, d, m.tecido, -w / 2 + 0.08);
    caixa(g, 0.16, 0.6, d, m.tecido, w / 2 - 0.08);
    caixa(g, w - 0.34, 0.09, d - 0.24, m.tecidoClaro, 0, 0.4, 0.1);
    caixa(g, 0.38, 0.32, 0.1, m.dourado, -w / 2 + 0.42, 0.48, -d / 2 + 0.26);
    caixa(g, 0.38, 0.32, 0.1, m.dourado, w / 2 - 0.42, 0.48, -d / 2 + 0.26);
  },
  mesa(g, w, d, h, _p, m) {
    caixa(g, w, 0.04, d, m.madeira, 0, h - 0.04);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(g, 0.05, h - 0.04, 0.05, m.madeiraEscura, sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07));
  },
  cadeiras(g, w, d, _h, _p, m) {
    for (const lado of [-1, 1]) {
      for (const x of [-w / 4, w / 4]) {
        const c = new THREE.Group();
        c.position.set(x, 0, lado * (d / 2 - 0.22));
        caixa(c, 0.42, 0.04, 0.42, m.creme, 0, 0.43);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa(c, 0.03, 0.43, 0.03, m.madeiraEscura, sx * 0.18, 0, sz * 0.18);
        caixa(c, 0.42, 0.45, 0.04, m.creme, 0, 0.47, lado * 0.19);
        g.add(c);
      }
    }
  },
  tapete(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.tapete);
    caixa(g, w * 0.86, 0.002, d * 0.86, m.creme, 0, h);
  },
  rack(g, w, d, h, _p, m) {
    caixa(g, w, h - 0.08, d, m.madeira, 0, 0.08);
    for (const sx of [-1, 1]) caixa(g, 0.04, 0.08, d * 0.8, m.preto, sx * (w / 2 - 0.1));
    frisos(g, w, h - 0.08, d, 3, 1, m.madeiraEscura, 0.08);
  },
  tv(g, w, _d, h, _p, m) {
    caixa(g, w, h, 0.04, m.preto);
    caixa(g, w - 0.04, h - 0.04, 0.004, m.vidroEscuro, 0, 0.02, 0.021);
  },
  mesa_centro(g, w, d, h, _p, m) {
    const r = Math.min(w, d) / 2;
    cilindro(g, r, 0.04, m.madeira, 0, h - 0.04);
    cilindro(g, 0.05, h - 0.04, m.madeiraEscura);
    cilindro(g, r * 0.6, 0.02, m.madeiraEscura);
  },
  luminaria(g, w, _d, h, _p, m) {
    const r = Math.max(0.08, w / 2);
    cilindro(g, r * 0.7, 0.03, m.preto);
    cilindro(g, 0.012, h - h * 0.3, m.preto, 0, 0.03);
    cilindro(g, r, h * 0.3, m.luz, 0, h * 0.7, 0, r * 0.65);
  },
  cortina(g, w, d, h, _p, m) {
    const faixas = Math.max(4, Math.round(w / 0.2));
    for (let i = 0; i < faixas; i++) {
      caixa(g, w / faixas + 0.01, h, d * 0.6, m.creme, -w / 2 + (w * (i + 0.5)) / faixas, 0, i % 2 ? d * 0.2 : -d * 0.2);
    }
    caixa(g, w + 0.1, 0.03, 0.03, m.preto, 0, h, 0);
  },
  planta(g, w, _d, h, _p, m) {
    cilindro(g, w * 0.32, 0.32, m.terracota, 0, 0, 0, w * 0.4);
    const folhas = new THREE.Mesh(new THREE.IcosahedronGeometry(w * 0.5, 1), m.verde);
    folhas.position.set(0, h - w * 0.5, 0);
    folhas.scale.set(1, 1.3, 1);
    folhas.castShadow = true;
    g.add(folhas);
  },
  quadro(g, w, _d, h, _p, m) {
    caixa(g, w, h, 0.03, m.madeiraEscura);
    caixa(g, w - 0.08, h - 0.08, 0.005, m.creme, 0, 0.04, 0.016);
    caixa(g, (w - 0.08) * 0.5, (h - 0.08) * 0.55, 0.004, m.marinho, -0.1, 0.12, 0.02);
    cilindro(g, 0.08, 0.004, m.dourado, 0.18, h * 0.55, 0.02).rotation.x = Math.PI / 2;
  },
  cama_casal(g, w, d, _h, _p, m) {
    cama(g, w, d, m, 2);
  },
  cama_solteiro(g, w, d, _h, _p, m) {
    cama(g, w, d, m, 1);
  },
  criados(g, w, d, h, _p, m) {
    for (const sx of [-1, 1]) {
      caixa(g, d, h, d, m.madeira, sx * (w / 2 - d / 2));
      caixa(g, d * 0.9, 0.01, 0.006, m.madeiraEscura, sx * (w / 2 - d / 2), h * 0.55, d / 2 + 0.003);
    }
  },
  guarda_roupa(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.branco);
    const portas = Math.max(2, Math.round(w / 0.5));
    frisos(g, w, h, d, portas, 1, m.friso);
    for (let i = 0; i < portas; i++) {
      const x = -w / 2 + (w * (i + 0.5)) / portas + (i % 2 ? -1 : 1) * (w / portas) * 0.35;
      caixa(g, 0.02, 0.28, 0.02, m.inox, x, h * 0.45, d / 2 + 0.012);
    }
  },
  comoda(g, w, d, h, _p, m) {
    caixa(g, w, h, d, m.madeira);
    frisos(g, w, h, d, 1, 3, m.madeiraEscura);
  },
  escrivaninha(g, w, d, h, _p, m) {
    caixa(g, w, 0.035, d, m.madeira, 0, h - 0.035);
    for (const sx of [-1, 1]) caixa(g, 0.035, h - 0.035, d * 0.95, m.branco, sx * (w / 2 - 0.02));
    caixa(g, w * 0.4, 0.16, d * 0.9, m.branco, w * 0.25, h - 0.2);
  },
  cadeira(g, w, d, h, _p, m) {
    cilindro(g, 0.22, 0.03, m.preto);
    cilindro(g, 0.025, 0.4, m.preto, 0, 0.03);
    caixa(g, w * 0.9, 0.07, d * 0.85, m.marinho, 0, 0.43);
    caixa(g, w * 0.85, h - 0.5, 0.06, m.marinho, 0, 0.5, -d / 2 + 0.06);
  },
  pia_banheiro(g, w, d, h, _p, m) {
    caixa(g, w, h - 0.03, d, m.madeira);
    caixa(g, w + 0.02, 0.03, d + 0.02, m.branco, 0, h - 0.03);
    cilindro(g, 0.16, 0.1, m.branco, 0, h, 0.02, 0.18);
    cilindro(g, 0.012, 0.2, m.inox, 0, h, -d / 2 + 0.06);
    frisos(g, w, h - 0.1, d, 2, 1, m.madeiraEscura, 0.05);
  },
  vaso(g, w, d, _h, _p, m) {
    const base = cilindro(g, w * 0.4, 0.4, m.branco, 0, 0, 0.06, w * 0.45);
    base.scale.z = 1.25;
    const tampa = cilindro(g, w * 0.46, 0.04, m.branco, 0, 0.4, 0.06);
    tampa.scale.z = 1.25;
    caixa(g, w * 0.95, 0.38, 0.18, m.branco, 0, 0.4, -d / 2 + 0.09);
  },
  box(g, w, d, h, _p, m) {
    caixa(g, w, 0.04, d, m.branco);
    caixa(g, w, h, 0.015, m.vidro, 0, 0.04, d / 2 - 0.01);
    caixa(g, 0.02, h, 0.02, m.inox, -w / 2 + 0.01, 0.04, d / 2 - 0.01);
    cilindro(g, 0.015, h * 0.5, m.inox, 0, h * 0.5, -d / 2 + 0.04);
    cilindro(g, 0.1, 0.03, m.inox, 0, h - 0.05, -d / 2 + 0.15);
  },
  espelho(g, w, _d, h, _p, m) {
    caixa(g, w, h, 0.025, m.preto);
    caixa(g, w - 0.03, h - 0.03, 0.004, m.espelho, 0, 0.015, 0.014);
  },
  lixeira(g, w, _d, h, _p, m) {
    cilindro(g, w * 0.42, h, m.inox, 0, 0, 0, w * 0.46);
    cilindro(g, w * 0.48, 0.03, m.preto, 0, h);
  },
};

function cama(g: THREE.Object3D, w: number, d: number, m: Mats, travesseiros: 1 | 2) {
  caixa(g, w, 0.28, d, m.madeira);
  caixa(g, w - 0.04, 0.2, d - 0.06, m.branco, 0, 0.28, 0.02);
  caixa(g, w + 0.004, 0.05, d * 0.62, m.marinho, 0, 0.46, d * 0.19);
  caixa(g, w + 0.008, 0.052, 0.22, m.dourado, 0, 0.465, d / 2 - 0.3);
  const tw = travesseiros === 2 ? w / 2 - 0.12 : w - 0.25;
  for (let i = 0; i < travesseiros; i++) {
    const x = travesseiros === 2 ? (i ? 1 : -1) * (w / 4) : 0;
    caixa(g, tw, 0.12, 0.34, m.creme, x, 0.48, -d / 2 + 0.26);
  }
  caixa(g, w + 0.08, 1.05, 0.08, m.madeiraEscura, 0, 0, -d / 2 - 0.02);
}

const DE_PAREDE = new Set<Peca['modelo']>(['cortina', 'quadro', 'espelho', 'tv', 'armario_aereo', 'guarda_roupa']);
const DIRECAO: Record<Frente, [number, number]> = { 'x+': [1, 0], 'x-': [-1, 0], 'z+': [0, 1], 'z-': [0, -1] };

const ROTACAO: Record<Frente, number> = { 'z+': 0, 'x+': Math.PI / 2, 'z-': Math.PI, 'x-': -Math.PI / 2 };

function construirPeca(p: Peca, m: Mats): THREE.Group {
  const g = new THREE.Group();
  const frente = p.frente ?? 'z+';
  const deLado = frente === 'x+' || frente === 'x-';
  const w = deLado ? p.ret.d : p.ret.w;
  const d = deLado ? p.ret.w : p.ret.d;
  MODELOS[p.modelo](g, w, d, p.h, p, m);
  g.rotation.y = ROTACAO[frente];
  g.position.set(p.ret.x + p.ret.w / 2, p.y ?? 0, p.ret.z + p.ret.d / 2);
  return g;
}

// ---------- fantasma (o que falta comprar) ----------

function virarFantasma(g: THREE.Object3D, fantasma: THREE.Material, contorno: THREE.LineBasicMaterial) {
  const meshes: THREE.Mesh[] = [];
  g.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
  for (const mesh of meshes) {
    mesh.material = fantasma;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), contorno);
    linhas.raycast = () => {}; // o toque pega a caixa, não a linha
    mesh.add(linhas);
  }
}

// ---------- montagem ----------

export function criarPlanta(host: HTMLElement, opcoes: Opcoes): Planta {
  const geral = opcoes.modo === 'geral';
  const areaFoco = geral ? undefined : AREAS.find((a) => a.id === opcoes.modo);
  const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Na visão geral, corta tudo acima de 1,1 m, como uma planta baixa.
  if (geral) renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), ALTURA_CORTE + 0.01)];
  const tela = renderer.domElement;
  // O desenho é feito na resolução da tela (2× no celular), mas ocupa
  // exatamente a moldura. Sem isto, em tela de alta densidade a maquete saía
  // com o dobro do tamanho e cortada (visto no iPhone do Vini, 08/11/2026).
  tela.style.display = 'block';
  tela.style.width = '100%';
  tela.style.height = '100%';
  host.appendChild(tela);

  const camadaRotulos = document.createElement('div');
  camadaRotulos.className = 'rotulos3d';
  host.appendChild(camadaRotulos);
  const dica = document.createElement('div');
  dica.className = 'dica3d';
  dica.hidden = true;
  host.appendChild(dica);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);

  cena.add(new THREE.HemisphereLight(0xffffff, 0xd8cfbf, 1.6));
  const sol = new THREE.DirectionalLight(0xfff6e6, 1.9);
  sol.position.set(-5, 11, 7);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.camera.left = -8;
  sol.shadow.camera.right = 8;
  sol.shadow.camera.top = 8;
  sol.shadow.camera.bottom = -8;
  sol.shadow.bias = -0.0005;
  sol.shadow.normalBias = 0.02;
  cena.add(sol);
  cena.add(sol.target);

  // Tudo em metros da planta; o grupo leva o meio do apartamento para a origem.
  const mundo = new THREE.Group();
  mundo.position.set(-LARGURA / 2, 0, -FUNDO / 2);
  cena.add(mundo);

  const mats = criarMats();
  const fantasma = new THREE.MeshStandardMaterial({
    color: COR.marinho, transparent: true, opacity: 0.16, depthWrite: false, roughness: 1, side: THREE.DoubleSide,
  });
  const contorno = new THREE.LineBasicMaterial({ color: 0xa07a12, transparent: true, opacity: 0.85 });
  const pisos = new Map<AreaId, THREE.Mesh>();
  const paredes: { meshes: THREE.Mesh[]; meio: THREE.Vector2; normal: THREE.Vector2 }[] = [];
  const areasVisiveis = areaFoco ? [areaFoco] : AREAS;

  // Sombra macia no chão em volta da maquete.
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.1 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.set(LARGURA / 2, -0.06, FUNDO / 2);
  chao.receiveShadow = true;
  mundo.add(chao);

  function piso(r: Ret, cor: number, id?: AreaId) {
    const m = material(cor, { side: THREE.FrontSide });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.06, r.d), m);
    mesh.position.set(r.x + r.w / 2, -0.03, r.z + r.d / 2);
    mesh.receiveShadow = true;
    if (id) {
      mesh.userData.area = id;
      pisos.set(id, mesh);
    }
    mundo.add(mesh);
  }

  for (const a of areasVisiveis) piso(a.ret, a.piso === 'madeira' ? COR.madeiraPiso : COR.ceramica, a.id);
  if (geral) piso(CIRCULACAO, COR.madeiraPiso);

  // Paredes: no cômodo, só as que encostam nele, cortadas no tamanho dele.
  // Cada parede é cortada nas janelas: parede até o peitoril, vidro, parede
  // em cima. Na visão geral (corte a 1,1 m) a janela aparece como um trecho
  // de vidro com o topo azul, igual ao traço da planta.
  const alturaParede = geral ? ALTURA_CORTE : ALTURA_PAREDE;
  const corte = new THREE.MeshStandardMaterial({ color: COR.corte, roughness: 0.9 });
  const vidroJanela = () => material(COR.vidro, { transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
  const topoJanela = () => material(COR.janela, { side: THREE.FrontSide, transparent: true });

  /** Bloco ao longo da parede: de u0 a u1, da altura y0 até y1. */
  function bloco(horizontal: boolean, linha: number, u0: number, u1: number, y0: number, y1: number, m: THREE.Material, grosso = ESPESSURA) {
    const c = u1 - u0;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? c : grosso, y1 - y0, horizontal ? grosso : c), m);
    const meio = (u0 + u1) / 2;
    mesh.position.set(horizontal ? meio : linha, (y0 + y1) / 2, horizontal ? linha : meio);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mundo.add(mesh);
    return mesh;
  }

  /** Janelas da mesma linha, recortadas no trecho [ua, ub]. */
  function janelasDa(horizontal: boolean, linha: number, ua: number, ub: number) {
    return JANELAS.flatMap((j) => {
      const [x1, z1, x2, z2] = j.trecho;
      if (horizontal !== (z1 === z2)) return [];
      if (Math.abs((horizontal ? z1 : x1) - linha) > 0.01) return [];
      const j0 = Math.max(ua, horizontal ? Math.min(x1, x2) : Math.min(z1, z2));
      const j1 = Math.min(ub, horizontal ? Math.max(x1, x2) : Math.max(z1, z2));
      return j1 - j0 > 0.05 ? [{ de: j0, ate: j1, peitoril: j.peitoril }] : [];
    }).sort((p, q) => p.de - q.de);
  }

  /** Trecho [ua, ub] de parede está no cômodo em foco? Devolve o trecho recortado. */
  function noFoco(horizontal: boolean, linha: number, ua: number, ub: number): [number, number] | null {
    if (!areaFoco) return [ua, ub];
    const r = areaFoco.ret;
    const [l0, l1, c0, c1] = horizontal ? [r.z, r.z + r.d, r.x, r.x + r.w] : [r.x, r.x + r.w, r.z, r.z + r.d];
    if (linha < l0 - 0.01 || linha > l1 + 0.01) return null;
    const a = Math.max(ua, c0), b = Math.min(ub, c1);
    return b - a < 0.05 ? null : [a, b];
  }

  for (const [x1, z1, x2, z2] of PAREDES) {
    const horizontal = z1 === z2;
    const linha = horizontal ? z1 : x1;
    const trecho = noFoco(horizontal, linha, horizontal ? Math.min(x1, x2) : Math.min(z1, z2), horizontal ? Math.max(x1, x2) : Math.max(z1, z2));
    if (!trecho) continue;
    // As pontas avançam meia espessura para fechar os cantos.
    const ua = trecho[0] - ESPESSURA / 2, ub = trecho[1] + ESPESSURA / 2;
    const meshes: THREE.Mesh[] = [];
    let u = ua;
    const cheia = (u0: number, u1: number) => {
      if (u1 - u0 < 0.01) return;
      meshes.push(bloco(horizontal, linha, u0, u1, 0, alturaParede, material(COR.parede, { side: THREE.FrontSide, transparent: true })));
      meshes.push(bloco(horizontal, linha, u0, u1, alturaParede - 0.03, alturaParede + 0.001, corte.clone(), ESPESSURA + 0.002));
    };
    for (const j of janelasDa(horizontal, linha, ua, ub)) {
      cheia(u, j.de);
      const peitoril = geral ? 0.7 : j.peitoril;
      const topoVidro = geral ? alturaParede : ALTURA_PORTA;
      meshes.push(bloco(horizontal, linha, j.de, j.ate, 0, peitoril, material(COR.parede, { side: THREE.FrontSide, transparent: true })));
      const v = bloco(horizontal, linha, j.de, j.ate, peitoril, topoVidro, vidroJanela(), 0.04);
      v.castShadow = false;
      meshes.push(v);
      if (geral) {
        meshes.push(bloco(horizontal, linha, j.de, j.ate, alturaParede - 0.03, alturaParede + 0.001, topoJanela(), ESPESSURA + 0.002));
      } else {
        meshes.push(bloco(horizontal, linha, j.de, j.ate, ALTURA_PORTA, alturaParede, material(COR.parede, { side: THREE.FrontSide, transparent: true })));
        meshes.push(bloco(horizontal, linha, j.de, j.ate, alturaParede - 0.03, alturaParede + 0.001, corte.clone(), ESPESSURA + 0.002));
      }
      u = j.ate;
    }
    cheia(u, ub);
    const meio = (trecho[0] + trecho[1]) / 2;
    paredes.push({
      meshes,
      meio: new THREE.Vector2(horizontal ? meio : linha, horizontal ? linha : meio),
      normal: horizontal ? new THREE.Vector2(0, 1) : new THREE.Vector2(1, 0),
    });
  }

  // Portas: folha aberta a 90° e o arco de abertura no chão, como na planta.
  // No cômodo, também a parede em cima do vão (verga).
  const arcoMat = new THREE.MeshBasicMaterial({ color: COR.marinho, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  function porta(p: Porta) {
    const horizontal = p.eixo === 'x';
    const largura = p.ate - p.de;
    const u = p.dobradica === 'inicio' ? p.de : p.ate;
    // Dobradiça no mundo e as duas direções: fechada (ao longo do vão) e aberta (para dentro do cômodo).
    const hx = horizontal ? u : p.linha, hz = horizontal ? p.linha : u;
    const sentido = p.dobradica === 'inicio' ? 1 : -1;
    const fechada = horizontal ? [sentido, 0] : [0, sentido];
    const aberta = horizontal ? [0, p.abre] : [p.abre, 0];
    const entrada = p.id === 'entrada';
    const folha = new THREE.Mesh(new THREE.BoxGeometry(0.04, ALTURA_PORTA, largura - 0.04), entrada ? mats.madeiraEscura : mats.madeira);
    folha.position.set(hx + aberta[0] * (largura / 2) + fechada[0] * 0.03, ALTURA_PORTA / 2, hz + aberta[1] * (largura / 2) + fechada[1] * 0.03);
    if (aberta[0] !== 0) folha.rotation.y = Math.PI / 2;
    folha.castShadow = true;
    mundo.add(folha);
    if (entrada) {
      const macaneta = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.14), mats.dourado);
      macaneta.position.set(hx + aberta[0] * (largura - 0.12) + fechada[0] * 0.06, 1.0, hz + aberta[1] * (largura - 0.12) + fechada[1] * 0.06);
      if (aberta[0] !== 0) macaneta.rotation.y = Math.PI / 2;
      mundo.add(macaneta);
    }
    // Arco de um quarto de volta, da posição fechada até a aberta.
    const angulo = (d: number[]) => Math.atan2(-d[1], d[0]);
    let a1 = angulo(fechada), a2 = angulo(aberta);
    let dif = a2 - a1;
    while (dif > Math.PI) dif -= 2 * Math.PI;
    while (dif < -Math.PI) dif += 2 * Math.PI;
    const inicio = dif > 0 ? a1 : a2;
    const arco = new THREE.Mesh(new THREE.RingGeometry(largura - 0.025, largura, 40, 1, inicio, Math.abs(dif)), arcoMat);
    arco.rotation.x = -Math.PI / 2;
    arco.position.set(hx, 0.006, hz);
    mundo.add(arco);
    if (!geral) {
      const verga = bloco(horizontal, p.linha, p.de, p.ate, ALTURA_PORTA, alturaParede, material(COR.parede, { side: THREE.FrontSide, transparent: true }));
      const topo = bloco(horizontal, p.linha, p.de, p.ate, alturaParede - 0.03, alturaParede + 0.001, corte.clone(), ESPESSURA + 0.002);
      const meio = (p.de + p.ate) / 2;
      paredes.push({
        meshes: [verga, topo],
        meio: new THREE.Vector2(horizontal ? meio : p.linha, horizontal ? p.linha : meio),
        normal: horizontal ? new THREE.Vector2(0, 1) : new THREE.Vector2(1, 0),
      });
    }
  }
  for (const p of PORTAS) if (noFoco(p.eixo === 'x', p.linha, p.de, p.ate)) porta(p);

  // Peças fixas (vêm com o apartamento).
  for (const a of areasVisiveis) for (const p of a.pecas) if (p.fixa) mundo.add(construirPeca(p, mats));

  // Peças da lista: refeitas a cada atualização.
  let lista = new THREE.Group();
  mundo.add(lista);
  const tocaveis: THREE.Object3D[] = [];
  /** Coisas encostadas na parede: somem quando a câmera fica atrás delas. */
  const deParede: { g: THREE.Group; frente: Frente; centro: THREE.Vector2 }[] = [];
  let infos: InfoArea[] = opcoes.areas;

  function limpar(o: THREE.Object3D) {
    o.traverse((x) => {
      if (x instanceof THREE.Mesh || x instanceof THREE.LineSegments) x.geometry.dispose();
    });
  }

  function montarLista() {
    limpar(lista);
    mundo.remove(lista);
    lista = new THREE.Group();
    mundo.add(lista);
    tocaveis.length = 0;
    deParede.length = 0;
    for (const a of areasVisiveis) {
      const info = infos.find((i) => i.id === a.id);
      if (!info) continue;
      const { pecas, pequenos } = distribuir(a, info.itens);
      for (const p of a.pecas) {
        if (p.fixa) continue;
        const itens = pecas.get(p.id);
        const s = situacao(itens);
        if (s === 'vazio') continue;
        const g = construirPeca(p, mats);
        if (s === 'falta') virarFantasma(g, fantasma, contorno);
        g.userData = { itens, area: a.id, nome: itens!.map((i) => i.nome).join(' + '), comprado: s === 'comprado' };
        if (DE_PAREDE.has(p.modelo)) deParede.push({ g, frente: p.frente ?? 'z+', centro: new THREE.Vector2(p.ret.x + p.ret.w / 2, p.ret.z + p.ret.d / 2) });
        lista.add(g);
        tocaveis.push(g);
      }
      pacotinhos(a, pequenos);
    }
    pedirQuadro();
  }

  /** Itens pequenos: um pacotinho por item, em fileiras sobre o apoio. */
  function pacotinhos(a: Area, itens: Item[]) {
    const ap = a.apoio;
    const passo = 0.2;
    const cols = Math.max(1, Math.floor(ap.w / passo));
    const linhas = Math.max(1, Math.floor(ap.d / passo));
    const porCamada = cols * linhas;
    itens.slice(0, porCamada * 4).forEach((item, i) => {
      const camada = Math.floor(i / porCamada);
      const resto = i % porCamada;
      const x = ap.x + (resto % cols) * passo + passo / 2 + (ap.w - cols * passo) / 2;
      const z = ap.z + Math.floor(resto / cols) * passo + passo / 2 + (ap.d - linhas * passo) / 2;
      const g = new THREE.Group();
      g.position.set(x, ap.y + camada * 0.13, z);
      caixa(g, 0.15, 0.12, 0.15, mats.dourado);
      caixa(g, 0.155, 0.02, 0.155, mats.creme, 0, 0.05);
      if (!item.comprado) virarFantasma(g, fantasma, contorno);
      g.userData = { itens: [item], area: a.id, nome: item.nome, comprado: !!item.comprado };
      lista.add(g);
      tocaveis.push(g);
    });
  }

  // ---------- câmera ----------

  // A rodinha do mouse rola a PÁGINA, não a maquete: senão quem rola a tela
  // inicial fica preso no 3D. Zoom com Ctrl + rodinha (é também o que a pinça
  // do trackpad manda) ou nos botões + e −. Registrado em captura, antes dos
  // controles, para barrar o zoom deles.
  function aoRolar(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
  }
  tela.addEventListener('wheel', aoRolar, { capture: true });

  const controles = new OrbitControls(camera, tela);
  // No toque: deslizar para cima/baixo rola a página; para os lados gira a
  // maquete; dois dedos dão zoom. (Os controles põem 'none', que prendia a
  // página inteira quando o dedo começava em cima da maquete.)
  tela.style.touchAction = 'pan-y';
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.enablePan = false;
  // Mais devagar no toque: um arrasto de meia tela gira cerca de 90°.
  controles.rotateSpeed = matchMedia('(pointer: coarse)').matches ? 0.4 : 0.6;
  controles.minPolarAngle = 0.12;
  controles.maxPolarAngle = 1.2;

  const foco = areaFoco?.ret ?? { x: 0, z: 0, w: LARGURA, d: FUNDO };
  const alvo = new THREE.Vector3(foco.x + foco.w / 2 - LARGURA / 2, geral ? 0 : 0.6, foco.z + foco.d / 2 - FUNDO / 2);
  controles.target.copy(alvo);
  const POLAR = geral ? 0.72 : 0.95;
  // Tela em pé (celular): a planta, que é comprida, gira 90° para ocupar a altura.
  let azimute = 0;
  // No cômodo: entre quatro ângulos de três-quartos, o que mostra o cômodo maior.
  const CANDIDATOS = [0.5, -0.5, Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4];
  function escolherAzimute(): number {
    if (geral) return camera.aspect < 0.9 ? Math.PI / 2 : 0;
    let melhor = CANDIDATOS[0], menor = Infinity;
    for (const c of CANDIDATOS) {
      azimute = c;
      const d = distanciaIdeal();
      if (d < menor - 0.05) { menor = d; melhor = c; }
    }
    return melhor;
  }

  function posicionar(dist: number) {
    const v = new THREE.Vector3().setFromSphericalCoords(dist, POLAR, azimute);
    camera.position.copy(alvo).add(v);
    camera.lookAt(alvo);
    camera.updateMatrixWorld();
  }

  // Cantos da caixa que precisa caber na tela (em coordenadas do mundo).
  const cantos: THREE.Vector3[] = [];
  {
    const alturaCaixa = geral ? ALTURA_CORTE : ALTURA_PAREDE;
    for (const x of [foco.x, foco.x + foco.w]) for (const z of [foco.z, foco.z + foco.d]) for (const y of [0, alturaCaixa]) {
      cantos.push(new THREE.Vector3(x - LARGURA / 2, y, z - FUNDO / 2));
    }
  }

  /** Menor distância em que a caixa inteira cabe na tela, com margem. */
  function distanciaIdeal(): number {
    const margem = geral ? 0.94 : 0.86;
    const salvo = camera.position.clone();
    const p = new THREE.Vector3();
    let perto = 0.5, longe = 120;
    for (let i = 0; i < 24; i++) {
      const meio = (perto + longe) / 2;
      posicionar(meio);
      const cabe = cantos.every((c) => {
        p.copy(c).project(camera);
        return Math.abs(p.x) <= margem && Math.abs(p.y) <= margem && p.z < 1;
      });
      if (cabe) longe = meio;
      else perto = meio;
    }
    camera.position.copy(salvo);
    camera.lookAt(alvo);
    return longe;
  }

  // Entrada: a câmera chega de mais longe, devagar.
  let entrada = movimentoReduzido ? 1 : 0;
  let inicioEntrada = 0;
  let mexeu = false;
  let distancia = 10;

  function ajustarTamanho() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!mexeu) azimute = escolherAzimute();
    distancia = distanciaIdeal();
    controles.minDistance = distancia * 0.4;
    controles.maxDistance = distancia * 1.6;
    if (!mexeu) posicionar(entrada < 1 ? distancia * 1.5 : distancia);
    pedirQuadro();
  }

  // ---------- rótulos dos cômodos (visão geral) ----------

  const rotulos = new Map<AreaId, HTMLButtonElement>();
  function montarRotulos() {
    camadaRotulos.replaceChildren();
    rotulos.clear();
    if (!geral) return;
    for (const a of AREAS) {
      const info = infos.find((i) => i.id === a.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rotulo3d';
      b.disabled = !info?.temComodo;
      const nome = document.createElement('strong');
      nome.textContent = info?.rotulo ?? a.nome;
      b.appendChild(nome);
      if (info?.temComodo && info.itens.length) {
        const pct = document.createElement('span');
        pct.textContent = `${info.progresso}%`;
        b.appendChild(pct);
      }
      b.setAttribute('aria-label', info?.temComodo ? `Entrar em ${nome.textContent}` : nome.textContent ?? '');
      b.onclick = () => info?.temComodo && opcoes.aoEscolherArea?.(a.id);
      camadaRotulos.appendChild(b);
      rotulos.set(a.id, b);
    }
    rotuloEntrada = document.createElement('span');
    rotuloEntrada.className = 'rotulo3d entrada3d';
    rotuloEntrada.textContent = 'Entrada';
    camadaRotulos.appendChild(rotuloEntrada);
  }
  let rotuloEntrada: HTMLSpanElement | null = null;
  const ENTRADA = PORTAS.find((p) => p.id === 'entrada')!;

  const ponto = new THREE.Vector3();
  function posicionarRotulos() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    // Um nome não pode cobrir outro: quem bate desce até achar espaço.
    const postos: { x: number; y: number; w: number; h: number }[] = [];
    if (rotuloEntrada) {
      // Do lado de fora, logo em frente à porta.
      ponto.set((ENTRADA.de + ENTRADA.ate) / 2 - LARGURA / 2, 0.1, ENTRADA.linha - 0.45 - FUNDO / 2).project(camera);
      const x = ((ponto.x + 1) / 2) * w, y = ((1 - ponto.y) / 2) * h;
      rotuloEntrada.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      postos.push({ x, y, w: rotuloEntrada.offsetWidth + 6, h: rotuloEntrada.offsetHeight + 4 });
    }
    for (const a of AREAS) {
      const b = rotulos.get(a.id);
      if (!b) continue;
      ponto.set(a.ret.x + a.ret.w / 2 - LARGURA / 2, 0.15, a.ret.z + a.ret.d / 2 - FUNDO / 2).project(camera);
      const caixa = { x: ((ponto.x + 1) / 2) * w, y: ((1 - ponto.y) / 2) * h, w: b.offsetWidth + 6, h: b.offsetHeight + 4 };
      for (let i = 0; i < 6; i++) {
        const bate = postos.find((o) => Math.abs(o.x - caixa.x) < (o.w + caixa.w) / 2 && Math.abs(o.y - caixa.y) < (o.h + caixa.h) / 2);
        if (!bate) break;
        caixa.y = bate.y + (bate.h + caixa.h) / 2;
      }
      postos.push(caixa);
      b.style.transform = `translate(-50%, -50%) translate(${caixa.x}px, ${caixa.y}px)`;
    }
  }

  // ---------- paredes transparentes (no cômodo) ----------

  const cam2 = new THREE.Vector2();
  const alvo2 = new THREE.Vector2();
  function esconderParedesDaFrente() {
    if (geral) return;
    cam2.set(camera.position.x + LARGURA / 2, camera.position.z + FUNDO / 2);
    alvo2.set(controles.target.x + LARGURA / 2, controles.target.z + FUNDO / 2);
    for (const p of paredes) {
      const ladoCam = p.normal.dot(cam2.clone().sub(p.meio));
      const ladoAlvo = p.normal.dot(alvo2.clone().sub(p.meio));
      const naFrente = Math.sign(ladoCam) !== Math.sign(ladoAlvo) && Math.abs(ladoCam) > 0.05;
      for (const m of p.meshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.opacity = naFrente ? 0.1 : 1;
        mat.depthWrite = !naFrente;
        m.castShadow = !naFrente;
      }
    }
    for (const { g, frente, centro } of deParede) {
      const [dx, dz] = DIRECAO[frente];
      g.visible = dx * (cam2.x - centro.x) + dz * (cam2.y - centro.y) > -0.3;
    }
  }

  // ---------- desenho sob demanda ----------

  let agendado = false;
  let parado = false;
  function pedirQuadro() {
    if (agendado || parado) return;
    agendado = true;
    requestAnimationFrame(quadro);
  }

  function quadro(t: number) {
    agendado = false;
    let continuar = false;
    if (entrada < 1) {
      if (!inicioEntrada) inicioEntrada = t;
      entrada = Math.min(1, (t - inicioEntrada) / 900);
      const suave = 1 - Math.pow(1 - entrada, 3);
      if (!mexeu) posicionar(distancia * (1.5 - 0.5 * suave));
      continuar = entrada < 1;
    }
    if (controles.update()) continuar = true;
    esconderParedesDaFrente();
    renderer.render(cena, camera);
    posicionarRotulos();
    if (continuar) pedirQuadro();
  }

  controles.addEventListener('start', () => { mexeu = true; entrada = 1; });
  controles.addEventListener('change', pedirQuadro);

  // ---------- toque e passar o mouse ----------

  const raio = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let inicioToque: { x: number; y: number } | null = null;

  function acertar(e: PointerEvent): { area?: AreaId; peca?: THREE.Object3D } {
    const r = tela.getBoundingClientRect();
    ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ponteiro, camera);
    const alvos = [...tocaveis, ...pisos.values()];
    for (const hit of raio.intersectObjects(alvos, true)) {
      // Na visão geral, o que está acima do corte não existe.
      if (geral && hit.point.y > ALTURA_CORTE + 0.02) continue;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.area) o = o.parent;
      if (!o) continue;
      return { area: o.userData.area, peca: o.userData.itens ? o : undefined };
    }
    return {};
  }

  let realce: AreaId | null = null;
  function realcar(id: AreaId | null) {
    if (realce === id) return;
    if (realce) (pisos.get(realce)!.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
    realce = id;
    if (id) (pisos.get(id)!.material as THREE.MeshStandardMaterial).emissive.setHex(0x3a2e08);
    pedirQuadro();
  }

  function aoMover(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const { area: a, peca } = acertar(e);
    if (geral) {
      const ok = a && infos.find((i) => i.id === a)?.temComodo;
      realcar(ok ? a! : null);
      tela.style.cursor = ok ? 'pointer' : 'grab';
      return;
    }
    tela.style.cursor = peca ? 'pointer' : 'grab';
    if (peca) {
      const r = host.getBoundingClientRect();
      dica.textContent = `${peca.userData.nome} · ${peca.userData.comprado ? 'comprado' : 'falta comprar'}`;
      dica.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
      dica.hidden = false;
    } else dica.hidden = true;
  }

  function aoApertar(e: PointerEvent) {
    inicioToque = { x: e.clientX, y: e.clientY };
  }

  function aoSoltar(e: PointerEvent) {
    if (!inicioToque) return;
    const arrastou = Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y) > 6;
    inicioToque = null;
    if (arrastou) return;
    const { area: a, peca } = acertar(e);
    if (geral) {
      if (a && infos.find((i) => i.id === a)?.temComodo) opcoes.aoEscolherArea?.(a);
      return;
    }
    if (peca) {
      const itens = peca.userData.itens as Item[];
      opcoes.aoEscolherItem?.(itens.find((i) => !i.comprado) ?? itens[0]);
    }
  }

  function aoSair() {
    realcar(null);
    dica.hidden = true;
  }

  // O navegador assumiu o gesto (rolagem da página): não é um toque.
  function aoCancelar() {
    inicioToque = null;
  }

  tela.addEventListener('pointermove', aoMover);
  tela.addEventListener('pointerdown', aoApertar);
  tela.addEventListener('pointerup', aoSoltar);
  tela.addEventListener('pointerleave', aoSair);
  tela.addEventListener('pointercancel', aoCancelar);

  const observador = new ResizeObserver(ajustarTamanho);
  observador.observe(host);

  montarRotulos();
  montarLista();
  ajustarTamanho();

  return {
    atualizar(novas) {
      infos = novas;
      montarRotulos();
      montarLista();
    },
    aproximar(fator) {
      const v = camera.position.clone().sub(controles.target);
      v.setLength(THREE.MathUtils.clamp(v.length() * fator, controles.minDistance, controles.maxDistance));
      camera.position.copy(controles.target).add(v);
      mexeu = true;
      entrada = 1;
      controles.update();
      pedirQuadro();
    },
    recentrar() {
      mexeu = false;
      entrada = 1;
      controles.target.copy(alvo);
      azimute = escolherAzimute();
      distancia = distanciaIdeal();
      posicionar(distancia);
      controles.update();
      pedirQuadro();
    },
    destruir() {
      parado = true;
      tela.removeEventListener('wheel', aoRolar, { capture: true });
      tela.removeEventListener('pointercancel', aoCancelar);
      observador.disconnect();
      controles.dispose();
      tela.removeEventListener('pointermove', aoMover);
      tela.removeEventListener('pointerdown', aoApertar);
      tela.removeEventListener('pointerup', aoSoltar);
      tela.removeEventListener('pointerleave', aoSair);
      cena.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const m = o.material;
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
      renderer.dispose();
      tela.remove();
      camadaRotulos.remove();
      dica.remove();
    },
  };
}
