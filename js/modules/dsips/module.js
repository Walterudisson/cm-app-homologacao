export const MODULO_DSIPS = Object.freeze({
  id: 'dsips', nome: 'DSIPS', estado: 'ativo',
  descricao: 'Materiais e cautelas', paginaInicial: 'dsips-cautelas',
  paginas: Object.freeze({
    'dsips-inicio': Object.freeze({ titulo: 'DSIPS', trilha: Object.freeze(['CM APP', 'DSIPS', 'Início']) }),
    'dsips-materiais': Object.freeze({ titulo: 'Materiais', trilha: Object.freeze(['CM APP', 'DSIPS', 'Materiais']) }),
    'dsips-cadastros': Object.freeze({ titulo: 'Cadastros DSIPS', trilha: Object.freeze(['CM APP', 'DSIPS', 'Cadastros']) }),
    'dsips-estoque': Object.freeze({ titulo: 'Estoque', trilha: Object.freeze(['CM APP', 'DSIPS', 'Estoque']) }),
    'dsips-cautelas': Object.freeze({ titulo: 'Cautelas e devoluções', trilha: Object.freeze(['CM APP', 'DSIPS', 'Cautelas']) }),
    'dsips-posse': Object.freeze({ titulo: 'Quem está com o quê', trilha: Object.freeze(['CM APP', 'DSIPS', 'Quem está com o quê']) }),
    'dsips-historico': Object.freeze({ titulo: 'Histórico DSIPS', trilha: Object.freeze(['CM APP', 'DSIPS', 'Histórico']), perfis: Object.freeze(['admin', 'gestor']) })
  })
});
