// Itens comuns para montar cada cômodo. Aparecem como atalho na tela do
// cômodo: um toque e o item entra na lista. Some da sugestão o que já está
// na lista (comparando o nome sem acento e sem maiúscula).

import type { Prioridade } from './tipos';
import { normalizar } from './texto';

export interface Sugestao {
  nome: string;
  prioridade: Prioridade;
  quantidade?: number;
}

const e = (nome: string, quantidade?: number): Sugestao => ({ nome, prioridade: 'essencial', quantidade });
const l = (nome: string, quantidade?: number): Sugestao => ({ nome, prioridade: 'logo', quantidade });
const u = (nome: string, quantidade?: number): Sugestao => ({ nome, prioridade: 'um_dia', quantidade });

// A ordem importa: "quarto de visita" tem que ser testado antes de "quarto".
const LISTAS: { chaves: string[]; itens: Sugestao[] }[] = [
  {
    chaves: ['cozinha'],
    itens: [
      e('Geladeira'), e('Fogão'), e('Jogo de panelas'), e('Talheres'), e('Pratos rasos', 6), e('Pratos fundos', 6),
      e('Copos', 6), e('Canecas', 4), e('Frigideira'), e('Facas de cozinha'), e('Tábua de corte'), e('Escorredor de louça'),
      e('Lixeira da cozinha'), l('Micro-ondas'), l('Liquidificador'), l('Panos de prato', 4), l('Potes com tampa'),
      l('Escorredor de macarrão'), l('Abridor de latas'), l('Concha e escumadeira'), l('Assadeira'), l('Garrafa térmica'),
      l('Taças', 4), u('Air fryer'), u('Cafeteira'), u('Batedeira'), u('Sanduicheira'),
    ],
  },
  {
    chaves: ['lavanderia', 'area de servico'],
    itens: [
      e('Máquina de lavar'), e('Varal'), e('Prendedores de roupa'), e('Balde'), e('Vassoura'), e('Rodo'), e('Pá de lixo'),
      e('Panos de chão', 3), l('Cesto de roupa suja'), l('Ferro de passar'), l('Tábua de passar'), l('Mop'),
      l('Escada pequena'), u('Aspirador de pó'), u('Secadora'),
    ],
  },
  {
    chaves: ['quarto de visita', 'escritorio', 'visita'],
    itens: [
      l('Mesa de trabalho'), l('Cadeira de escritório'), l('Luminária de mesa'), l('Cama ou sofá-cama'),
      l('Jogo de cama de visita'), l('Travesseiro de visita'), u('Estante'), u('Cortina'), u('Organizador de cabos'),
    ],
  },
  {
    chaves: ['sala'],
    itens: [
      e('Sofá'), l('Rack ou painel'), l('Televisão'), l('Cortina'), l('Tapete'), l('Mesa de jantar'),
      l('Cadeiras', 4), l('Luminária'), u('Mesa de centro'), u('Almofadas', 4), u('Quadros'), u('Plantas'),
    ],
  },
  {
    chaves: ['quarto'],
    itens: [
      e('Cama'), e('Colchão'), e('Travesseiros', 2), e('Jogo de lençol', 2), e('Edredom'), l('Guarda-roupa'),
      l('Cortina ou blackout'), l('Cabides', 30), l('Mesas de cabeceira', 2), l('Abajur'), u('Cômoda'),
      u('Espelho'), u('Tapete do quarto'),
    ],
  },
  {
    chaves: ['banheiro', 'lavabo'],
    itens: [
      e('Toalhas de banho', 4), e('Toalhas de rosto', 4), e('Tapete de banheiro'), e('Lixeira do banheiro'),
      e('Escova de vaso'), e('Cortina ou box'), l('Porta-escovas'), l('Saboneteira'), l('Organizador de pia'),
      l('Espelho com armário'), u('Toalheiro extra'),
    ],
  },
];

/** Sugestões para o cômodo, tirando o que já está na lista. */
export function sugestoesPara(nomeDoComodo: string, nomesNaLista: string[]): Sugestao[] {
  const comodo = normalizar(nomeDoComodo);
  const lista = LISTAS.find((g) => g.chaves.some((k) => comodo.includes(k)));
  if (!lista) return [];
  const ja = new Set(nomesNaLista.map(normalizar));
  return lista.itens.filter((s) => !ja.has(normalizar(s.nome)));
}
