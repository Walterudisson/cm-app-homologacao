// O módulo declara apenas suas telas. Conta e administração pertencem à plataforma.
const pagina = (titulo, trilha, opcoes = {}) => Object.freeze({
  titulo, trilha: Object.freeze(['CM APP', 'Patrimônios', ...trilha]), ...opcoes
});

export const MODULO_PATRIMONIOS = Object.freeze({
  id: 'patrimonios',
  nome: 'Patrimônios',
  estado: 'ativo',
  paginaInicial: 'dashboard',
  paginas: Object.freeze({
    dashboard: pagina('Painel', ['Painel'], { exibeEscopo: true }),
    scanner: pagina('Leitura', ['Leitura']),
    lista: pagina('Relação', ['Relação'], { exibeEscopo: true }),
    inventarios: pagina('Inventários', ['Inventários']),
    transferencias: pagina('Fila de aprovação', ['Movimentações', 'Fila'], {
      perfis: Object.freeze(['admin', 'gestor'])
    })
  })
});
