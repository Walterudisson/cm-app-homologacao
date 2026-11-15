export const MODULO_DSIPS = Object.freeze({
  id: 'dsips', nome: 'DSIPS', estado: 'ativo',
  descricao: 'Materiais e cautelas', paginaInicial: 'dsips-inicio',
  paginas: Object.freeze({
    'dsips-inicio': Object.freeze({ titulo: 'DSIPS', trilha: Object.freeze(['CM APP', 'DSIPS', 'Início']) }),
    'dsips-materiais': Object.freeze({ titulo: 'Materiais', trilha: Object.freeze(['CM APP', 'DSIPS', 'Materiais']) }),
    'dsips-cadastros': Object.freeze({ titulo: 'Cadastros DSIPS', trilha: Object.freeze(['CM APP', 'DSIPS', 'Cadastros']) }),
    'dsips-estoque': Object.freeze({ titulo: 'Estoque', trilha: Object.freeze(['CM APP', 'DSIPS', 'Estoque']) }),
    'dsips-historico': Object.freeze({ titulo: 'Histórico DSIPS', trilha: Object.freeze(['CM APP', 'DSIPS', 'Histórico']), perfis: Object.freeze(['admin', 'gestor']) })
  })
});
