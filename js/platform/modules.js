import { MODULO_PATRIMONIOS } from '../modules/patrimonios/module.js';

const perfisGestao = Object.freeze(['admin', 'gestor']);
const comum = (titulo, area, nome, perfis) => Object.freeze({
  titulo,
  trilha: Object.freeze(['CM APP', area, nome]),
  ...(perfis ? { perfis } : {})
});

export const PAGINAS_COMUNS = Object.freeze({
  usuarios: comum('Gestão de usuários', 'Gestão', 'Usuários', perfisGestao),
  divisoes: comum('Gestão de divisões', 'Gestão', 'Divisões', perfisGestao),
  funcoes: comum('Funções e permissões', 'Gestão', 'Funções', Object.freeze(['admin'])),
  perfil: comum('Meu perfil', 'Conta', 'Meu perfil')
});

export const MODULOS = Object.freeze({
  patrimonios: MODULO_PATRIMONIOS,
  // Planejado: sem telas, consultas, permissões ou operação nesta entrega.
  dsips: Object.freeze({ id: 'dsips', nome: 'DSIPS', estado: 'planejado', paginas: Object.freeze({}) })
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

// Guarda de navegação, não substitui as regras de autorização do backend.
// A atribuição de módulos aos usuários será introduzida na Sprint 2.
export function podeAbrirPagina(usuario, id) {
  const pagina = obterPagina(id);
  if (!pagina || !usuario || usuario.ativo === false) return false;
  if (!['admin', 'gestor', 'conferente'].includes(usuario.perfil)) return false;
  return !pagina.perfis || pagina.perfis.includes(usuario.perfil);
}
