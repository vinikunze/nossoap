import type { Comodo, Item, Prioridade } from '../../shared/tipos';

export class ErroApi extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function pedir<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api/${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? {} : { 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'same-origin',
      // O Access redireciona para a tela de login quando a sessão expira.
      redirect: 'manual',
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão. Confira a internet e tente de novo.');
  }
  if (r.type === 'opaqueredirect' || r.status === 401) {
    // Sessão do Access expirou: recarregar leva para o login.
    location.reload();
    throw new ErroApi(401, 'Sessão expirada.');
  }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroApi(r.status, (dados as { erro?: string }).erro ?? 'Algo deu errado.');
  return dados as T;
}

export interface DadosItem {
  comodo_id: number;
  nome: string;
  quantidade: number;
  prioridade: Prioridade;
  estimado_centavos: number | null;
  pago_centavos?: number | null;
  link: string | null;
  obs: string | null;
}

export const api = {
  eu: () => pedir<{ email: string }>('GET', 'eu'),
  dados: () => pedir<{ comodos: Comodo[]; itens: Item[] }>('GET', 'dados'),
  criarItem: (i: DadosItem & { chave: string }) => pedir<Item>('POST', 'itens', i),
  editarItem: (id: number, i: DadosItem) => pedir<Item>('PUT', `itens/${id}`, i),
  apagarItem: (id: number) => pedir('DELETE', `itens/${id}`),
  comprar: (id: number, pago_centavos: number | null) => pedir<Item>('POST', `itens/${id}/comprar`, { pago_centavos }),
  desfazer: (id: number) => pedir<Item>('POST', `itens/${id}/desfazer`),
  criarComodo: (nome: string, icone: string) => pedir<Comodo>('POST', 'comodos', { nome, icone }),
  editarComodo: (id: number, c: Partial<Pick<Comodo, 'nome' | 'icone' | 'ativo' | 'area'>>) => pedir<Comodo>('PATCH', `comodos/${id}`, c),
  ordenarComodos: (ids: number[]) => pedir('POST', 'comodos/ordem', { ids }),
  apagarComodo: (id: number) => pedir('DELETE', `comodos/${id}`),
};

export function novaChave(): string {
  return crypto.randomUUID();
}
