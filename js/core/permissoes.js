export const PERMISSOES = Object.freeze({
  DIVISOES_VISUALIZAR: 'divisoes.visualizar',
  DIVISOES_GERENCIAR: 'divisoes.gerenciar',
  USUARIOS_VISUALIZAR: 'usuarios.visualizar',
  USUARIOS_GERENCIAR: 'usuarios.gerenciar',
  INVENTARIOS_GERENCIAR: 'inventarios.gerenciar',
  PATRIMONIOS_CONFERIR: 'patrimonios.conferir'
});

export const CATALOGO_PERMISSOES = Object.freeze([
  { id: PERMISSOES.DIVISOES_VISUALIZAR, modulo: 'Divisões', acao: 'Visualizar' },
  { id: PERMISSOES.DIVISOES_GERENCIAR, modulo: 'Divisões', acao: 'Gerenciar' },
  { id: PERMISSOES.USUARIOS_VISUALIZAR, modulo: 'Usuários', acao: 'Visualizar' },
  { id: PERMISSOES.USUARIOS_GERENCIAR, modulo: 'Usuários', acao: 'Gerenciar' },
  { id: PERMISSOES.INVENTARIOS_GERENCIAR, modulo: 'Inventários', acao: 'Gerenciar ciclos' },
  { id: PERMISSOES.PATRIMONIOS_CONFERIR, modulo: 'Patrimônios', acao: 'Conferir' }
]);

export const FUNCOES_NATIVAS = Object.freeze({
  admin: Object.freeze(Object.values(PERMISSOES)),
  gestor: Object.freeze([
    PERMISSOES.DIVISOES_VISUALIZAR,
    PERMISSOES.USUARIOS_VISUALIZAR,
    PERMISSOES.INVENTARIOS_GERENCIAR,
    PERMISSOES.PATRIMONIOS_CONFERIR
  ]),
  conferente: Object.freeze([PERMISSOES.PATRIMONIOS_CONFERIR])
});

export function usuarioPode(usuario, permissao) {
  if (!usuario || usuario.ativo === false) return false;
  const adicionais = Array.isArray(usuario.permissoes) ? usuario.permissoes : [];
  return [...(FUNCOES_NATIVAS[usuario.perfil] || []), ...adicionais].includes(permissao);
}
