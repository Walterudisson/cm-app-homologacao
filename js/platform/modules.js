import { MODULO_PATRIMONIOS } from '../modules/patrimonios/module.js';
import { MODULO_DSIPS } from '../modules/dsips/module.js';

const perfisGestao = Object.freeze(['admin', 'gestor']);
const comum = (titulo, area, nome, perfis) => Object.freeze({
  titulo,
  trilha: Object.freeze(['CM APP', area, nome]),
  ...(perfis ? { perfis } : {})
});

export const PAGINAS_COMUNS = Object.freeze({
  modulos: comum('Módulos', 'Plataforma', 'Módulos'),
  usuarios: comum('Gestão de usuários', 'Gestão', 'Usuários', perfisGestao),
  divisoes: comum('Gestão de divisões', 'Gestão', 'Divisões', perfisGestao),
  funcoes: comum('Funções e permissões', 'Gestão', 'Funções', Object.freeze(['admin'])),
  perfil: comum('Meu perfil', 'Conta', 'Meu perfil')
});

export const MODULOS = Object.freeze({
  patrimonios: MODULO_PATRIMONIOS,
  dsips: MODULO_DSIPS
});

export function listarModulosAtivos() {
  return Object.values(MODULOS).filter(modulo => modulo.estado === 'ativo');
}

export function obterPagina(id) {
  if (Object.hasOwn(PAGINAS_COMUNS, id)) return PAGINAS_COMUNS[id];
  for (const modulo of listarModulosAtivos()) {
    if (Object.hasOwn(modulo.paginas, id)) return modulo.paginas[id];
  }
  return null;
}

export function moduloDaPagina(id) {
  return listarModulosAtivos().find(modulo => Object.hasOwn(modulo.paginas, id)) || null;
}

export function listarIdsPaginas() {
  return [...Object.keys(PAGINAS_COMUNS), ...listarModulosAtivos().flatMap(modulo => Object.keys(modulo.paginas))];
}

export function modulosDoUsuario(usuario) {
  if (!usuario || usuario.ativo === false || !['admin', 'gestor', 'conferente'].includes(usuario.perfil)) return [];
  if (usuario.perfil === 'admin') return listarModulosAtivos();
  // Compatibilidade: ausência do campo mantém somente Patrimônios.
  const ids = Object.hasOwn(usuario, 'modulos') ? usuario.modulos : ['patrimonios'];
  if (!Array.isArray(ids)) return [];
  return listarModulosAtivos().filter(modulo => ids.includes(modulo.id));
}

export function paginaInicialUsuario(usuario) {
  const modulos = modulosDoUsuario(usuario);
  return modulos.length === 1 ? modulos[0].paginaInicial : 'modulos';
}

// A mesma atribuição deve ser aplicada pelas Rules e pela função administrativa.
export function podeAbrirPagina(usuario, id) {
  const pagina = obterPagina(id);
  if (!pagina || !usuario || usuario.ativo === false) return false;
  if (!['admin', 'gestor', 'conferente'].includes(usuario.perfil)) return false;
  const modulo = moduloDaPagina(id);
  if (modulo && !modulosDoUsuario(usuario).some(item => item.id === modulo.id)) return false;
  return !pagina.perfis || pagina.perfis.includes(usuario.perfil);
}
