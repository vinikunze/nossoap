// Dinheiro sempre em centavos inteiros. Nunca float: 0,1 + 0,2 não é 0,3.
// Mesmas funções do app de finanças.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Troca o espaço especial do Intl por um espaço comum que não quebra linha. */
function limpar(s: string): string {
  return s.replace(/\s/g, ' ');
}

/** "R$ 1.234,56" — centavos sempre. */
export function formatar(centavos: number): string {
  return limpar(brl.format(centavos / 100));
}

/** Para resumos: a partir de R$ 10 mil vira "R$ 12,3 mil". Abaixo disso, completo. */
export function formatarCompacto(centavos: number): string {
  const reais = Math.abs(centavos) / 100;
  const sinal = centavos < 0 ? '-' : '';
  if (reais >= 1_000_000) return `${sinal}R$ ${num1.format(reais / 1_000_000)} mi`;
  if (reais >= 10_000) return `${sinal}R$ ${num1.format(reais / 1_000)} mil`;
  return formatar(centavos);
}

/**
 * Lê o campo de valor, que funciona como caixa eletrônico: os dígitos entram
 * pela direita. "4550" vira 4550 centavos (R$ 45,50).
 */
export function centavosDosDigitos(texto: string): number {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
  return digitos ? Number(digitos) : 0;
}
