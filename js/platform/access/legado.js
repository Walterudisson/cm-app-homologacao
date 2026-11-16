import { VERSAO_POLITICA, CATALOGO_ACESSOS } from './catalogo.js';
const copia = valor => JSON.parse(JSON.stringify(valor));
const propostaBase = u => ({ uid: u.uid, versao: VERSAO_POLITICA, ativo: u.ativo !== false,
  papelPlataforma: 'usuario', permissoesPlataforma: [], atribuicoes: [], delegacoes: [] });
// Apenas análise local. Nunca retorna comandos de escrita nem designa Superadmin.
export function analisarUsuarioLegado(u) {
  if (!u || typeof u.uid !== 'string' || !u.uid.trim() || u.uid.length > 128 || u.uid.includes('/')) throw new Error('UID obrigatório para análise.');
  const avisos = [], proposta = propostaBase(u);
  if (Object.hasOwn(u, 'versao') && u.versao !== VERSAO_POLITICA) return { uid: u.uid, situacao: 'bloqueado', proposta: null, avisos: ['Versão desconhecida; não recorrer ao perfil legado.'] };
  if (u.versao === VERSAO_POLITICA) return { uid: u.uid, situacao: 'ja_versionado', proposta: null,
    avisos: ['Revisar o documento v2 na política correspondente. Não converter novamente nem recorrer ao legado.'] };
  if (u.funcaoId || u.funcaoNome || (Array.isArray(u.permissoes) && u.permissoes.length)) avisos.push('Função personalizada/permissões adicionais exigem revisão de equivalência.');
  if (u.permissoes !== undefined && !Array.isArray(u.permissoes)) avisos.push('Formato de permissões inválido.');
  if (!['admin', 'gestor', 'conferente', 'usuario'].includes(u.perfil)) return { uid: u.uid, situacao: 'bloqueado', proposta: null, avisos: [...avisos, 'Perfil legado desconhecido.'] };
  if (u.perfil === 'admin') return { uid: u.uid, situacao: 'designacao_manual', proposta: null,
    avisos: [...avisos, 'Admin legado não vira Superadmin automaticamente.', 'Identificar a conta inicial e as atribuições administrativas por ambiente antes de migrar.'] };
  const modulos = Object.hasOwn(u, 'modulos') ? u.modulos : ['patrimonios'];
  if (!Array.isArray(modulos) || modulos.some(m => !['patrimonios', 'dsips'].includes(m)) || new Set(modulos).size !== modulos.length) {
    return { uid: u.uid, situacao: 'bloqueado', proposta: null, avisos: [...avisos, 'Lista de módulos inválida ou desconhecida.'] };
  }
  if (u.perfil === 'usuario') {
    if (modulos.length && Object.hasOwn(u, 'modulos')) avisos.push('Perfil básico ignora módulos operacionais no modelo atual; não transformar esses valores em concessões.');
  } else {
    if (modulos.includes('patrimonios')) {
      let escopo = { tipo: 'todos' };
      if (u.perfil === 'conferente') {
        const ids = u.divisoesAtribuidas;
        if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id.trim() || id !== id.trim()) || new Set(ids).size !== ids.length) {
          avisos.push('Divisões do Conferente ausentes ou inválidas; definir abrangência antes de conceder.'); escopo = null;
        } else escopo = { tipo: 'divisoes', ids: [...ids] };
        avisos.push('Conferente: comparar leitura direta de bens, inventários e histórico com Rules legadas; não presumir equivalência só pelo menu.');
      }
      if (escopo) proposta.atribuicoes.push({ moduloId: 'da', funcionalidadeId: 'patrimonios', papelId: u.perfil === 'gestor' ? 'gestor' : 'conferente', escopo });
    }
    if (modulos.includes('dsips')) proposta.atribuicoes.push({ moduloId: 'dsips', funcionalidadeId: 'materiais_cautelas', papelId: u.perfil === 'gestor' ? 'gestor' : 'consulta', escopo: { tipo: 'todos' } });
    if (u.perfil === 'gestor') avisos.push('Gestor legado tem acessos comuns de usuários/divisões; separar administração, leitura de contas e operação antes de aplicar.');
    if (modulos.includes('dsips')) avisos.push('Separar histórico de cadastros/saldo e histórico de movimentações; o Operador futuro não pode herdar toda a auditoria de gestão.');
    if (proposta.atribuicoes.length) avisos.push('Mapeamento sugerido é candidato; comparar ações e recursos reais antes da migração. Nenhuma delegação foi inferida.');
  }
  if (u.ativo === false) avisos.push('Conta inativa deve permanecer bloqueada; concessões históricas não podem ativá-la.');
  return { uid: u.uid, situacao: avisos.length || proposta.atribuicoes.length ? 'revisar' : 'sem_acesso_operacional', proposta: copia(proposta), avisos };
}
export function analisarLoteLegado(entrada) {
  if (!entrada || !['hml', 'prd'].includes(entrada.ambiente) || !Array.isArray(entrada.usuarios)) throw new Error('Informe ambiente hml/prd e lista usuarios.');
  const ids = entrada.usuarios.map(u => u?.uid);
  if (new Set(ids).size !== ids.length) throw new Error('UID duplicado no lote.');
  const usuarios = entrada.usuarios.map(analisarUsuarioLegado);
  return { ambiente: entrada.ambiente, modo: 'somente_analise', versaoProposta: VERSAO_POLITICA,
    funcionalidades: Object.entries(CATALOGO_ACESSOS).flatMap(([m,v]) => Object.keys(v.funcionalidades).map(f => m+'.'+f)),
    resumo: Object.fromEntries(['designacao_manual','revisar','bloqueado','ja_versionado','sem_acesso_operacional'].map(s => [s, usuarios.filter(u => u.situacao === s).length])), usuarios };
}
