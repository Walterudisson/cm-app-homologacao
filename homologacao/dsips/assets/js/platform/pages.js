import { moduloDaPagina, podeAbrirPagina } from './modules.js';

export function criarCarregadorPaginas({ obterUsuario, modulos, comuns }) {
  return async id => {
    if (!podeAbrirPagina(obterUsuario(), id)) return false;
    const modulo = moduloDaPagina(id);
    if (modulo) {
      if (!Object.hasOwn(modulos, modulo.id)) return false;
      return modulos[modulo.id](id);
    }
    if (!Object.hasOwn(comuns, id)) return false;
    await comuns[id]();
    return true;
  };
}
