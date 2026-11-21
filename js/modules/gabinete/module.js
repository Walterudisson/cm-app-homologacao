// O Gabinete é um módulo; Agenda e Ramais são funcionalidades internas.
const pagina = (titulo, nome) => Object.freeze({
  titulo, trilha: Object.freeze(['CM APP', 'Gabinete', nome])
});

export const MODULO_GABINETE = Object.freeze({
  id: 'gabinete',
  nome: 'Gabinete',
  estado: 'ativo',
  paginaInicial: 'gabinete-painel',
  paginas: Object.freeze({
    'gabinete-painel': pagina('Painel do Gabinete', 'Painel'),
    'gabinete-agenda': pagina('Agenda Telefônica', 'Agenda'),
    'gabinete-ramais': pagina('Ramais', 'Ramais'),
    'gabinete-cadastros': Object.freeze({...pagina('Cadastros e revisão', 'Cadastros'),perfis:Object.freeze(['admin'])})
  })
});
