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
    { id: 1, nome: 'Cozinha', icone: 'panela', ordem: 1, ativo: 1, area: null },
    { id: 2, nome: 'Varanda', icone: 'flor', ordem: 2, ativo: 0, area: null },
    { id: 3, nome: 'Quarto', icone: 'cama', ordem: 3, ativo: 1, area: null },
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

import { AREAS, area, pecaDoItem, moduloDoItem, miniaturaDo, distribuir, situacao, PAREDES, PORTAS, JANELAS, LARGURA, FUNDO } from '../shared/planta';

describe('planta', () => {
  const peca = (a: string, nome: string) => pecaDoItem(area(a)!, nome)?.id;

  it('cada item vai para o móvel certo', () => {
    expect(peca('cozinha', 'Geladeira Brastemp Frost Free')).toBe('geladeira');
    expect(peca('cozinha', 'Fogão 4 bocas')).toBe('cooktop');
    expect(peca('cozinha', 'Cooktop de indução')).toBe('cooktop');
    expect(peca('cozinha', 'Forno elétrico')).toBe('forno');
    expect(peca('cozinha', 'Micro-ondas')).toBe('microondas');
    expect(peca('servico', 'Máquina de lavar 12kg')).toBe('lavadora');
    expect(peca('sala', 'Mesa de centro')).toBe('mesa_centro');
    expect(peca('sala', 'Mesa de jantar 4 lugares')).toBe('mesa');
    expect(peca('sala', 'Cadeiras')).toBe('cadeiras');
    expect(peca('sala', 'Sofá retrátil')).toBe('sofa');
    expect(peca('sala', 'Smart TV 50"')).toBe('tv');
    expect(peca('sala', 'Rack ou painel')).toBe('rack');
    expect(peca('quarto1', 'Cama box casal')).toBe('cama');
    expect(peca('quarto1', 'Colchão')).toBe('cama');
    expect(peca('quarto1', 'Mesas de cabeceira')).toBe('criados');
    expect(peca('quarto2', 'Luminária de mesa')).toBe('luminaria');
    expect(peca('quarto2', 'Mesa de trabalho')).toBe('escrivaninha');
    expect(peca('quarto2', 'Cama ou sofá-cama')).toBe('cama');
  });

  it('coisas pequenas e tecidos não viram móvel', () => {
    expect(peca('cozinha', 'Talheres')).toBeUndefined();
    expect(peca('cozinha', 'Pratos rasos')).toBeUndefined();
    expect(peca('quarto1', 'Jogo de cama')).toBeUndefined();
    expect(peca('quarto1', 'Travesseiros')).toBeUndefined();
    expect(peca('quarto2', 'Jogo de cama de visita')).toBeUndefined();
    expect(peca('sala', 'Almofadas')).toBeUndefined();
    expect(peca('sala', 'Camarão')).toBeUndefined();
  });

  it('distribui e diz a situação de cada peça', () => {
    const cama = item({ nome: 'Cama', comprado: 1, comprado_em: 'x' });
    const colchao = item({ nome: 'Colchão' });
    const lencol = item({ nome: 'Jogo de lençol' });
    const d = distribuir(area('quarto1')!, [cama, colchao, lencol]);
    expect(d.pecas.get('cama')?.length).toBe(2);
    expect(d.modulos.get('cama')).toEqual([lencol]);
    expect(d.pequenos).toEqual([]);
    expect(situacao(d.pecas.get('cama'))).toBe('falta');
    expect(situacao([cama])).toBe('comprado');
    expect(situacao(undefined)).toBe('vazio');
  });

  it('tudo cabe dentro do apartamento', () => {
    const dentro = (r: { x: number; z: number; w: number; d: number }) =>
      r.x >= 0 && r.z >= 0 && r.x + r.w <= LARGURA + 1e-9 && r.z + r.d <= FUNDO + 1e-9;
    for (const a of AREAS) {
      expect(dentro(a.ret), a.id).toBe(true);
      for (const p of a.pecas) expect(dentro(p.ret), `${a.id}/${p.id}`).toBe(true);
      expect(dentro(a.apoio), `${a.id}/apoio`).toBe(true);
    }
    for (const [x1, z1, x2, z2] of PAREDES) expect(x1 === x2 || z1 === z2).toBe(true);
  });

  it('nenhuma parede atravessa uma porta, e toda janela fica numa parede', () => {
    const naLinha = (p: (typeof PAREDES)[number], eixo: 'x' | 'z', linha: number) =>
      eixo === 'x' ? p[1] === p[3] && Math.abs(p[1] - linha) < 1e-9 : p[0] === p[2] && Math.abs(p[0] - linha) < 1e-9;
    for (const porta of PORTAS) {
      for (const p of PAREDES.filter((x) => naLinha(x, porta.eixo, porta.linha))) {
        const [a, b] = porta.eixo === 'x' ? [Math.min(p[0], p[2]), Math.max(p[0], p[2])] : [Math.min(p[1], p[3]), Math.max(p[1], p[3])];
        expect(b <= porta.de + 1e-9 || a >= porta.ate - 1e-9, `parede ${p} atravessa a porta ${porta.id}`).toBe(true);
      }
    }
    for (const j of JANELAS) {
      const [x1, z1, x2, z2] = j.trecho;
      const parede = PAREDES.find((p) =>
        z1 === z2
          ? p[1] === p[3] && p[1] === z1 && Math.min(p[0], p[2]) <= Math.min(x1, x2) && Math.max(p[0], p[2]) >= Math.max(x1, x2)
          : p[0] === p[2] && p[0] === x1 && Math.min(p[1], p[3]) <= Math.min(z1, z2) && Math.max(p[1], p[3]) >= Math.max(z1, z2));
      expect(parede, `janela ${j.trecho}`).toBeDefined();
    }
  });

  it('a lista do papel vai para os armários e gavetas certos', () => {
    const lugar = (a: string, nome: string) => pecaDoItem(area(a)!, nome)?.id ?? moduloDoItem(area(a)!, nome)?.id;
    const esperado: [string, string, string][] = [
      ['cozinha', 'Talheres', 'talheres'], ['cozinha', 'Kit faca de churrasco', 'talheres'], ['cozinha', 'Colher de sorvete', 'talheres'],
      ['cozinha', 'Abridor de lata', 'talheres'], ['cozinha', 'Cortador de pizza', 'talheres'], ['cozinha', 'Organizador de gavetas', 'talheres'],
      ['cozinha', 'Colher grande de servir', 'utensilios'], ['cozinha', 'Concha e escumadeira', 'utensilios'], ['cozinha', 'Fuê (batedor)', 'utensilios'],
      ['cozinha', 'Copo medidor', 'utensilios'], ['cozinha', 'Espremedor de limão', 'utensilios'], ['cozinha', 'Ralador', 'utensilios'],
      ['cozinha', 'Pano de prato', 'panos'], ['cozinha', 'Pano escorredor de louça', 'panos'], ['cozinha', 'Descanso de panela', 'panos'],
      ['cozinha', 'Luva térmica de silicone', 'panos'],
      ['cozinha', 'Escorredor de louça', 'lado_pia'], ['cozinha', 'Porta-detergente', 'lado_pia'],
      ['cozinha', 'Escorredor de macarrão', 'panelas'], ['cozinha', 'Panela de pressão', 'panelas'], ['cozinha', 'Kit de panelas de indução', 'panelas'],
      ['cozinha', 'Frigideira', 'panelas'], ['cozinha', 'Jogo de panelas', 'panelas'],
      ['cozinha', 'Travessa de sobremesa', 'formas'], ['cozinha', 'Forma de pudim', 'formas'], ['cozinha', 'Tábua de carne', 'formas'], ['cozinha', 'Marinex com tampa', 'formas'],
      ['cozinha', 'Pratos de sobremesa', 'loucas'], ['cozinha', 'Bowls', 'loucas'], ['cozinha', 'Tigela', 'loucas'],
      ['cozinha', 'Jogo de copos', 'copos'], ['cozinha', 'Jogo de xícaras', 'copos'], ['cozinha', 'Jogo de taças', 'copos'], ['cozinha', 'Canecas', 'copos'],
      ['cozinha', 'Pote hermético', 'potes'], ['cozinha', 'Lata hermética de tempero', 'potes'], ['cozinha', 'Porta-presunto e queijo', 'potes'], ['cozinha', 'Saleiro', 'potes'],
      ['cozinha', 'Airfryer', 'bancada'], ['cozinha', 'Chaleira elétrica', 'bancada'], ['cozinha', 'Mixer de cappuccino', 'bancada'], ['cozinha', 'Porta-papel toalha', 'bancada'],
      ['cozinha', 'Garrafa térmica', 'bancada'], ['cozinha', 'Lixeira de cozinha', 'pia'], ['cozinha', 'Balança digital de cozinha', 'diversos'],
      ['cozinha', 'Geladeira', 'geladeira'], ['cozinha', 'Micro-ondas', 'microondas'],
      ['quarto1', 'Jogo de lençol de casal', 'cama'], ['quarto1', 'Colcha aveludada preta', 'cama'], ['quarto1', 'Travesseiros', 'maleiro'],
      ['quarto1', 'Tapete passadeira', 'tapete'], ['quarto1', 'Cortina', 'cortina'],
      ['bwc', 'Toalhas de banho', 'gabinete'], ['bwc', 'Lixeira de banheiro', 'lixeira'],
      ['servico', 'Máquina lava e seca', 'lavadora'], ['servico', 'Varal retrátil', 'varal'], ['servico', 'Porta-sabão em pó', 'produtos'],
      ['servico', 'Porta-amaciante', 'produtos'], ['servico', 'Prendedor de roupa', 'organizadores'], ['servico', 'Cestos organizadores', 'organizadores'],
      ['servico', 'Cesto de roupas', 'limpeza'], ['servico', 'Mesa de passar roupa', 'limpeza'], ['servico', 'Vassoura', 'limpeza'], ['servico', 'Aspirador de pó', 'limpeza'],
      ['sala', 'Sofá', 'sofa'], ['sala', 'Televisão', 'tv'], ['sala', 'Painel', 'rack'],
    ];
    for (const [a, nome, id] of esperado) expect(lugar(a, nome), `${a}: ${nome}`).toBe(id);
  });

  it('a mesa com cadeiras acende a mesa e as cadeiras', () => {
    const d = distribuir(area('sala')!, [item({ nome: 'Mesa de jantar com 6 cadeiras' })]);
    expect(d.pecas.get('mesa')?.length).toBe(1);
    expect(d.pecas.get('cadeiras')?.length).toBe(1);
  });

  it('cada coisa ganha a miniatura certa', () => {
    expect(miniaturaDo('Pratos de sobremesa')).toBe('prato');
    expect(miniaturaDo('Jogo de copos')).toBe('copo');
    expect(miniaturaDo('Jogo de xícaras')).toBe('xicara');
    expect(miniaturaDo('Talheres')).toBe('talher');
    expect(miniaturaDo('Pano de prato')).toBe('pano');
    expect(miniaturaDo('Panela de pressão')).toBe('panela');
    expect(miniaturaDo('Forma de bolo')).toBe('forma');
    expect(miniaturaDo('Jogo de lençol de casal')).toBe('textil');
    expect(miniaturaDo('Travesseiros')).toBe('travesseiro');
    expect(miniaturaDo('Vassoura')).toBe('cabo');
    expect(miniaturaDo('Coisa qualquer')).toBe('caixa');
  });

  it('módulos cabem no apartamento e cada cômodo com módulos tem um padrão válido', () => {
    for (const a of AREAS) {
      for (const m of a.modulos ?? []) {
        expect(m.ret.x >= 0 && m.ret.z >= 0 && m.ret.x + m.ret.w <= LARGURA && m.ret.z + m.ret.d <= FUNDO, `${a.id}/${m.id}`).toBe(true);
      }
      if (a.moduloPadrao) expect(a.modulos?.some((m) => m.id === a.moduloPadrao), a.id).toBe(true);
    }
  });
});
