// Estado compartilhado entre as telas. A lista inteira fica na memória:
// cada mudança atualiza aqui na hora, sem recarregar tudo do servidor.

import type { Comodo, Item } from '../../shared/tipos';
import { api } from './api';

class Estado {
  email = $state('');
  comodos = $state<Comodo[]>([]);
  itens = $state<Item[]>([]);

  /** Gaveta aberta. Só uma por vez. */
  gaveta = $state<
    | { tipo: 'novo'; comodo_id?: number }
    | { tipo: 'editar'; item: Item }
    | { tipo: 'comprar'; item: Item }
    | null
  >(null);

  aviso = $state<{ texto: string; acao?: { rotulo: string; fazer: () => void }; erro?: boolean } | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  get ativos(): Comodo[] {
    return this.comodos.filter((c) => c.ativo);
  }

  comodo(id: number): Comodo | undefined {
    return this.comodos.find((c) => c.id === id);
  }

  async carregar() {
    const [eu, dados] = await Promise.all([api.eu(), api.dados()]);
    this.email = eu.email;
    this.comodos = dados.comodos;
    this.itens = dados.itens;
  }

  /** Põe o item novo ou atualizado na lista. */
  guardar(item: Item) {
    const i = this.itens.findIndex((x) => x.id === item.id);
    if (i >= 0) this.itens[i] = item;
    else this.itens.push(item);
  }

  tirar(id: number) {
    this.itens = this.itens.filter((x) => x.id !== id);
  }

  guardarComodo(c: Comodo) {
    const i = this.comodos.findIndex((x) => x.id === c.id);
    if (i >= 0) this.comodos[i] = c;
    else this.comodos.push(c);
  }

  avisar(texto: string, opcoes: { acao?: { rotulo: string; fazer: () => void }; erro?: boolean } = {}) {
    clearTimeout(this.timer);
    this.aviso = { texto, ...opcoes };
    this.timer = setTimeout(() => (this.aviso = null), opcoes.acao ? 6000 : 3500);
  }

  erro(e: unknown) {
    this.avisar(e instanceof Error ? e.message : 'Algo deu errado.', { erro: true });
  }

  /** Desmarca o comprado, com aviso. Usado pela lista e pelo formulário. */
  async desfazer(item: Item) {
    try {
      this.guardar(await api.desfazer(item.id));
      this.avisar(`“${item.nome}” voltou para a lista.`);
    } catch (e) {
      this.erro(e);
    }
  }
}

export const estado = new Estado();
