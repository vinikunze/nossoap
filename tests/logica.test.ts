import { describe, expect, it } from 'vitest';
import { totais, porComodo, ordenar, estimadoTotal } from '../shared/resumo';
import { normalizar, combina, linkValido, dominio } from '../shared/texto';
import { formatar, formatarCompacto, centavosDosDigitos } from '../shared/dinheiro';
import { sugestoesPara } from '../shared/sugestoes';
import type { Comodo, Item } from '../shared/tipos';

let n = 0;
function item(p: Partial<Item> = {}): Item {
  n++;
  return {
    id: n, comodo_id: 1, nome: `Item ${n}`, quantidade: 1, prioridade: 'logo', estimado_centavos: null,
    pago_centavos: null, link: null, obs: null, comprado: 0, comprado_em: null, criado_em: '2026-11-08T00:00:00Z', ...p,
  };
}
const comprado = (p: Partial<Item> = {}) => item({ comprado: 1, comprado_em: '2026-11-08T12:00:00Z', ...p });

describe('totais', () => {
  it('lista vazia não divide por zero', () => {
    expect(totais([])).toEqual({ itens: 0, comprados: 0, falta_centavos: 0, sem_preco: 0, gasto_centavos: 0, progresso: 0 });
  });

  it('falta = estimado × quantidade dos não comprados; gasto = pago dos comprados', () => {
    const t = totais([
      item({ estimado_centavos: 1000, quantidade: 6 }), // 60,00
      item({ estimado_centavos: 25050 }),               // 250,50
      item(),                                           // sem preço
      comprado({ estimado_centavos: 99999, pago_centavos: 4500 }),
      comprado({ pago_centavos: null }),                // comprado sem informar
    ]);
    expect(t.falta_centavos).toBe(31050);
    expect(t.sem_preco).toBe(1);
    expect(t.gasto_centavos).toBe(4500);
    expect(t.comprados).toBe(2);
    expect(t.itens).toBe(5);
    expect(t.progresso).toBe(40);
  });

  it('progresso arredonda para baixo: só 100% quando tudo foi comprado', () => {
    const itens = [...Array.from({ length: 199 }, () => comprado()), item()];
    expect(totais(itens).progresso).toBe(99);
  });

  it('estimadoTotal sem preço é null, não zero', () => {
    expect(estimadoTotal({ estimado_centavos: null, quantidade: 3 })).toBeNull();
    expect(estimadoTotal({ estimado_centavos: 150, quantidade: 3 })).toBe(450);
  });
});

describe('porComodo', () => {
  const comodos: Comodo[] = [
    { id: 1, nome: 'Cozinha', icone: 'panela', ordem: 1, ativo: 1 },
    { id: 2, nome: 'Varanda', icone: 'flor', ordem: 2, ativo: 0 },
    { id: 3, nome: 'Quarto', icone: 'cama', ordem: 3, ativo: 1 },
  ];
  it('só cômodos ativos, na ordem, inclusive os vazios', () => {
    const r = porComodo(comodos, [item({ comodo_id: 1 }), comprado({ comodo_id: 1 }), item({ comodo_id: 2 })]);
    expect(r.map((x) => x.comodo.nome)).toEqual(['Cozinha', 'Quarto']);
    expect(r[0].progresso).toBe(50);
    expect(r[1].itens).toBe(0);
  });
});

describe('ordenar', () => {
  it('falta antes de comprado; essencial antes; depois por nome; comprado mais recente primeiro', () => {
    const lista = ordenar([
      comprado({ nome: 'Antigo', comprado_em: '2026-11-01T00:00:00Z' }),
      item({ nome: 'Zebra', prioridade: 'essencial' }),
      item({ nome: 'Abajur', prioridade: 'um_dia' }),
      item({ nome: 'Ágata', prioridade: 'essencial' }),
      comprado({ nome: 'Recente', comprado_em: '2026-11-07T00:00:00Z' }),
      item({ nome: 'Cortina', prioridade: 'logo' }),
    ]);
    expect(lista.map((i) => i.nome)).toEqual(['Ágata', 'Zebra', 'Cortina', 'Abajur', 'Recente', 'Antigo']);
  });
});

describe('texto', () => {
  it('busca ignora acento, maiúscula e ordem das palavras', () => {
    expect(normalizar('  Panela   de PRESSÃO ')).toBe('panela de pressao');
    expect(combina('Panela de pressão', 'pressao panela')).toBe(true);
    expect(combina('Panela de pressão', 'frigideira')).toBe(false);
    expect(combina('Qualquer coisa', '')).toBe(true);
  });

  it('link: completa https e recusa esquemas perigosos', () => {
    expect(linkValido('amazon.com.br/dp/123')).toBe('https://amazon.com.br/dp/123');
    expect(linkValido('https://www.tokstok.com.br/x?y=1')).toBe('https://www.tokstok.com.br/x?y=1');
    expect(linkValido('javascript:alert(1)')).toBeNull();
    expect(linkValido('data:text/html,oi')).toBeNull();
    expect(linkValido('panela')).toBeNull();
    expect(linkValido('   ')).toBeNull();
    expect(dominio('https://www.mercadolivre.com.br/abc')).toBe('mercadolivre.com.br');
  });
});

describe('dinheiro', () => {
  it('formata com centavos e abrevia nos resumos', () => {
    expect(formatar(123456)).toBe('R$ 1.234,56');
    expect(formatarCompacto(1234567)).toBe('R$ 12,3 mil');
    expect(formatarCompacto(99999)).toBe('R$ 999,99');
  });
  it('campo de valor estilo caixa eletrônico', () => {
    expect(centavosDosDigitos('R$ 45,50')).toBe(4550);
    expect(centavosDosDigitos('')).toBe(0);
    expect(centavosDosDigitos('abc')).toBe(0);
  });
});

describe('sugestões', () => {
  it('acha a lista pelo nome do cômodo e tira o que já está na lista', () => {
    const s = sugestoesPara('Cozinha', ['TALHERES', 'Geladeira']);
    expect(s.length).toBeGreaterThan(10);
    expect(s.some((x) => x.nome === 'Talheres')).toBe(false);
    expect(s.some((x) => x.nome === 'Pratos rasos')).toBe(true);
  });
  it('quarto de visita não pega a lista do quarto do casal', () => {
    const s = sugestoesPara('Quarto de visita / Escritório', []);
    expect(s.some((x) => x.nome === 'Mesa de trabalho')).toBe(true);
    expect(s.some((x) => x.nome === 'Colchão')).toBe(false);
  });
  it('todos os cômodos padrão têm sugestão; cômodo desconhecido não', () => {
    for (const c of ['Cozinha', 'Lavanderia', 'Sala de estar', 'Quarto', 'Banheiro', 'Quarto de visita / Escritório']) {
      expect(sugestoesPara(c, []).length, c).toBeGreaterThan(0);
    }
    expect(sugestoesPara('Garagem', [])).toEqual([]);
  });
});
