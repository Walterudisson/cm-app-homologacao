import { VERSAO_POLITICA, PLATAFORMA, obterFuncionalidade, obterPapel } from './catalogo.js';
const identidadeRegistrada = u => u && typeof u.uid === 'string' && u.uid.length > 0 && u.versao === VERSAO_POLITICA && typeof u.ativo === 'boolean'
  && ['usuario', 'administrador', 'superadmin'].includes(u.papelPlataforma);
const identidadeValida = u => identidadeRegistrada(u) && u.ativo === true;
const superadmin = u => identidadeValida(u) && u.papelPlataforma === 'superadmin';
export function escopoValido(escopo, moduloId, funcionalidadeId) {
  const f = obterFuncionalidade(moduloId, funcionalidadeId);
  if (!f || !escopo || !f.escopos.includes(escopo.tipo)) return false;
  if (escopo.tipo === 'todos') return !Object.hasOwn(escopo, 'ids');
  return Array.isArray(escopo.ids) && escopo.ids.length > 0 && escopo.ids.length <= 100
    && escopo.ids.every(id => typeof id === 'string' && id.trim() === id && id.length > 0 && id.length <= 180)
    && new Set(escopo.ids).size === escopo.ids.length;
}
export function atribuicaoValida(a) {
  return Boolean(a && obterPapel(a.moduloId, a.funcionalidadeId, a.papelId) && escopoValido(a.escopo, a.moduloId, a.funcionalidadeId));
}
// O contexto deve vir do recurso no servidor, nunca de divisão arbitrária enviada pelo cliente.
function dentroDoRecurso(escopo, contexto) {
  return escopo.tipo === 'todos' || typeof contexto?.divisaoId === 'string' && escopo.ids.includes(contexto.divisaoId);
}
export function escopoContem(limite, proposto) {
  const basico = s => s && (s.tipo === 'todos' && !Object.hasOwn(s, 'ids') || s.tipo === 'divisoes'
    && Array.isArray(s.ids) && s.ids.length > 0 && s.ids.length <= 100
    && s.ids.every(id => typeof id === 'string' && id.trim() === id && id.length > 0 && id.length <= 180)
    && new Set(s.ids).size === s.ids.length);
  if (!basico(limite) || !basico(proposto)) return false;
  if (limite.tipo === 'todos') return true;
  return limite.tipo === 'divisoes' && proposto.tipo === 'divisoes'
    && Array.isArray(limite.ids) && Array.isArray(proposto.ids) && proposto.ids.every(id => limite.ids.includes(id));
}
export function podeNaPlataforma(usuario, acao) {
  if (!identidadeValida(usuario) || !Object.hasOwn(PLATAFORMA, acao)) return false;
  return superadmin(usuario) || usuario.papelPlataforma === 'administrador'
    && Array.isArray(usuario.permissoesPlataforma) && usuario.permissoesPlataforma.includes(acao);
}
export function podeExecutar(usuario, pedido, contexto = {}) {
  if (!identidadeValida(usuario) || !pedido) return false;
  const f = obterFuncionalidade(pedido.moduloId, pedido.funcionalidadeId);
  if (!f || !Object.hasOwn(f.acoes, pedido.acao)) return false;
  if (superadmin(usuario)) return true;
  return Array.isArray(usuario.atribuicoes) && usuario.atribuicoes.some(a => atribuicaoValida(a)
    && a.moduloId === pedido.moduloId && a.funcionalidadeId === pedido.funcionalidadeId
    && obterPapel(a.moduloId, a.funcionalidadeId, a.papelId).includes(pedido.acao) && dentroDoRecurso(a.escopo, contexto));
}
// Delegação é independente das permissões de operação. Não cria outros gestores.
export function podeConceder(autor, alvo, atribuicao) {
  if (!identidadeValida(autor) || !identidadeValida(alvo) || autor.uid === alvo.uid || !atribuicaoValida(atribuicao)) return false;
  if (superadmin(autor)) return true;
  if (alvo.papelPlataforma === 'superadmin') return false;
  if (atribuicao.papelId === 'gestor') return podeNaPlataforma(autor, 'gestores.designar');
  if (podeNaPlataforma(autor, 'acessos.conceder')) return true;
  return Array.isArray(autor.delegacoes) && autor.delegacoes.some(d => delegacaoValida(d)
    && d.moduloId === atribuicao.moduloId
    && (d.nivel === 'modulo' || d.funcionalidadeId === atribuicao.funcionalidadeId)
    && Array.isArray(d.limites) && d.limites.some(l => l?.funcionalidadeId === atribuicao.funcionalidadeId
      && Array.isArray(l.papeis) && l.papeis.includes(atribuicao.papelId) && !l.papeis.includes('gestor')
      && escopoValido(l.escopo, d.moduloId, l.funcionalidadeId) && escopoContem(l.escopo, atribuicao.escopo)));
}
// Revoga a atribuição inteira; revogação parcial deve gerar uma substituição auditada no servidor.
export function podeRevogar(autor, alvo, atribuicao) {
  return identidadeRegistrada(alvo) && podeConceder(autor, {...alvo, ativo: true}, atribuicao);
}
export function podeDesignarDelegacao(autor, alvo, delegacao) {
  if (!identidadeValida(autor) || !identidadeValida(alvo) || autor.uid === alvo.uid || alvo.papelPlataforma === 'superadmin'
    || !(superadmin(autor) || podeNaPlataforma(autor, 'gestores.designar'))) return false;
  return delegacaoValida(delegacao);
}

export function podeGerenciarConta(autor, alvo, acao) {
  if (!['contas.consultar','contas.gerenciar','contas.recuperar'].includes(acao) || !identidadeRegistrada(alvo)
    || !podeNaPlataforma(autor, acao)) return false;
  if (superadmin(autor)) return acao !== 'contas.gerenciar' || autor.uid !== alvo.uid;
  return acao === 'contas.consultar' || alvo.papelPlataforma !== 'superadmin' && autor.uid !== alvo.uid;
}

export function delegacaoValida(delegacao) {
  if (!delegacao || !['modulo', 'funcionalidade'].includes(delegacao.nivel) || !Array.isArray(delegacao.limites) || !delegacao.limites.length || delegacao.limites.length > 20 || new Set(delegacao.limites.map(l => l?.funcionalidadeId)).size !== delegacao.limites.length) return false;
  return delegacao.limites.every(l => l && (delegacao.nivel !== 'funcionalidade' || l.funcionalidadeId === delegacao.funcionalidadeId)
    && Array.isArray(l.papeis) && l.papeis.length > 0 && new Set(l.papeis).size === l.papeis.length
    && l.papeis.every(p => p !== 'gestor' && obterPapel(delegacao.moduloId, l.funcionalidadeId, p))
    && escopoValido(l.escopo, delegacao.moduloId, l.funcionalidadeId));
}
