// Política de referência v2. Ainda não conectada às telas, Functions ou Rules publicadas.
const congelar = valor => { if (valor && typeof valor === 'object') { Object.values(valor).forEach(congelar); Object.freeze(valor); } return valor; };
export const VERSAO_POLITICA = 2;
const acao = (nome, tipo) => ({ nome, tipo });
export const PLATAFORMA = congelar({
  'contas.consultar': acao('Consultar contas', 'R'),
  'contas.gerenciar': acao('Criar, alterar, ativar e desativar contas', 'Negócio'),
  'contas.recuperar': acao('Iniciar recuperação de acesso', 'Negócio'),
  'gestores.designar': acao('Designar ou remover gestores', 'Negócio'),
  'acessos.conceder': acao('Conceder acessos operacionais', 'Negócio'),
  'auditoria.consultar': acao('Consultar auditoria administrativa', 'R')
});
export const CATALOGO_ACESSOS = congelar({
  da: { nome: 'Divisão Administrativa', funcionalidades: {
    patrimonios: { nome: 'Patrimônios', escopos: ['todos', 'divisoes'], acoes: {
      consultar: acao('Consultar bens e situação do inventário', 'R'),
      historico: acao('Consultar histórico operacional', 'R'),
      conferir: acao('Registrar conferência', 'Negócio'),
      sugerir: acao('Sugerir mudança de localização', 'Negócio'),
      aprovar: acao('Aprovar ou rejeitar movimentação', 'Negócio'),
      inventarios: acao('Administrar ciclos e correções previstas', 'Negócio'),
      exportar: acao('Exportar relatórios', 'Negócio')
    }, papeis: {
      consulta: ['consultar', 'historico'],
      conferente: ['consultar', 'historico', 'conferir', 'sugerir'],
      gestor: ['consultar', 'historico', 'conferir', 'sugerir', 'aprovar', 'inventarios', 'exportar']
    } }
  } },
  dsips: { nome: 'DSIPS', funcionalidades: {
    materiais_cautelas: { nome: 'Materiais e Cautelas', escopos: ['todos'], acoes: {
      consultar: acao('Consultar materiais, estoque, cautelas e posse', 'R'),
      cadastrar: acao('Cadastrar materiais, categorias e locais', 'C'),
      alterar: acao('Alterar cadastros', 'U'),
      inativar: acao('Inativar cadastro preservando histórico', 'Negócio'),
      cautelar: acao('Registrar cautela no atendimento PDV', 'Negócio'),
      devolver: acao('Registrar devolução', 'Negócio'),
      saldo_inicial: acao('Registrar saldo inicial', 'Negócio'),
      historico: acao('Consultar histórico de movimentações', 'R')
    }, papeis: {
      consulta: ['consultar'],
      operador: ['consultar', 'cautelar', 'devolver', 'historico'],
      gestor: ['consultar', 'cadastrar', 'alterar', 'inativar', 'cautelar', 'devolver', 'saldo_inicial', 'historico']
    } }
  } }
});
export function obterFuncionalidade(moduloId, funcionalidadeId) {
  if (!Object.hasOwn(CATALOGO_ACESSOS, moduloId)) return null;
  const funcoes = CATALOGO_ACESSOS[moduloId].funcionalidades;
  return Object.hasOwn(funcoes, funcionalidadeId) ? funcoes[funcionalidadeId] : null;
}
export function obterPapel(moduloId, funcionalidadeId, papelId) {
  const f = obterFuncionalidade(moduloId, funcionalidadeId);
  return f && Object.hasOwn(f.papeis, papelId) ? f.papeis[papelId] : null;
}
