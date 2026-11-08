// Busca e validação de texto.

/** Minúsculas, sem acento e sem espaço sobrando: "Panela de Pressão" vira "panela de pressao". */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Todas as palavras da busca aparecem no texto, em qualquer ordem. */
export function combina(texto: string, busca: string): boolean {
  const alvo = normalizar(texto);
  return normalizar(busca).split(' ').filter(Boolean).every((p) => alvo.includes(p));
}

/**
 * Aceita "amazon.com.br/xyz" e devolve "https://amazon.com.br/xyz".
 * Só http e https: outro esquema (javascript:, data:) num link clicável é
 * porta para código malicioso. Devolve null se não for um endereço válido.
 */
export function linkValido(entrada: string): string | null {
  const t = entrada.trim();
  if (!t) return null;
  const comEsquema = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(comEsquema);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.href.length <= 2000 ? u.href : null;
  } catch {
    return null;
  }
}

/** "www.amazon.com.br" vira "amazon.com.br": para mostrar de onde é o link. */
export function dominio(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}
