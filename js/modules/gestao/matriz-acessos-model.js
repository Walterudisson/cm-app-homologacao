import {CATALOGO_PERMISSOES,FUNCOES_NATIVAS} from '../../core/permissoes.js';

// GEST-01: catálogo de leitura do contrato, não é autorizador e não altera permissões.
// Apenas as seis chaves da fonte legada são rotuladas como "declaradas no frontend".
const LEGADOS=Object.freeze({
  'divisoes.visualizar':['Gestão','Divisões','Consultar divisões','Instituição / unidades autorizadas'],
  'divisoes.gerenciar':['Gestão','Divisões','Gerenciar divisões (agrupado)','Instituição / unidades autorizadas'],
  'usuarios.visualizar':['Gestão','Usuários','Consultar usuários','Instituição / unidades autorizadas'],
  'usuarios.gerenciar':['Gestão','Usuários','Gerenciar usuários (agrupado)','Instituição / unidades autorizadas'],
  'inventarios.gerenciar':['Patrimônios','Inventários','Gerenciar ciclos de inventário','Divisão / abrangência autorizada'],
  'patrimonios.conferir':['Patrimônios','Bens','Realizar conferência','Divisão / abrangência autorizada']
});
const PROPOSTAS=Object.freeze([
  ['Gestão','Usuários','Criar conta','usuarios.criar','Global ou delegação expressa','Separar criação de consulta; Backend Functions e auditoria'],
  ['Gestão','Usuários','Editar dados cadastrais','usuarios.editar','Global ou delegação expressa','Identidade institucional distinta de credenciais e dados funcionais RH'],
  ['Gestão','Usuários','Ativar e desativar acesso','usuarios.alterar_estado','Global / excepcional','Revogar acesso com auditoria sem apagar o registro da pessoa'],
  ['Gestão','Usuários','Conceder e revogar permissões','usuarios.atribuir_acessos','Módulo e divisões concedidas','Gestor de módulo concede apenas o próprio módulo; TI coordena identidade'],
  ['Gestão','Divisões','Criar divisão','divisoes.criar','Gestão institucional','Preservar identificador estável; impedir duplicidade'],
  ['Gestão','Divisões','Editar divisão e responsáveis','divisoes.editar','Gestão institucional','Manter histórico e vínculos com Gabinete/DSIPS/RH'],
  ['Gestão','Funções','Consultar matriz','funcoes.visualizar','Somente pessoas autorizadas','Não confundir visualização da matriz com direito de conceder'],
  ['Gestão','Funções','Criar e editar função','funcoes.gerenciar','Gestão de identidades','Alterações sujeitas a validação de servidor e trilha de auditoria'],
  ['Gestão','Funções','Atribuir função a usuário','funcoes.atribuir','Por módulo e abrangência','Não elevar privilégio ao atribuir ou editar função'],
  ['Patrimônios','Bens','Consultar bens','patrimonios.visualizar','Divisões autorizadas','Separar visualizar de conferir e movimentar'],
  ['Patrimônios','Bens','Solicitar transferência','patrimonios.transferir','Divisões e bens vinculados','Participantes do fluxo e abrangência no backend'],
  ['Patrimônios','Bens','Aprovar transferência','patrimonios.aprovar','Fila de aprovação vinculada','Quem solicita não deve aprovar a própria solicitação por padrão'],
  ['Patrimônios','Inventários','Consultar inventários','inventarios.visualizar','Divisões autorizadas','Permitir consulta sem gerenciar ciclo'],
  ['DSIPS','Materiais','Consultar estoque e materiais','dsips.materiais.visualizar','Setor ou unidade autorizada','Separar consulta da movimentação'],
  ['DSIPS','Cautelas','Registrar entrega / cautela','dsips.cautelas.registrar','Operador DSIPS autorizado','Registrar pessoa responsável por referência estável'],
  ['DSIPS','Cautelas','Registrar devolução','dsips.cautelas.devolver','Operador DSIPS autorizado','Histórico preservado e validação de saldo'],
  ['DSIPS','Materiais','Ajustar estoque','dsips.estoque.ajustar','Gestão DSIPS específica','Operação sensível com motivo e auditoria'],
  ['DSIPS','Cadastros','Gerenciar categorias e materiais','dsips.cadastros.gerenciar','Administração DSIPS','Sem atribuir acesso global ao CMAPP'],
  ['Gabinete','Agenda','Consultar Agenda','gabinete.agenda.visualizar','Concessão expressa','Nem perfil admin nem lotação concedem acesso automático'],
  ['Gabinete','Agenda','Consultar telefone particular','gabinete.agenda.telefone_privado','Concessão específica restrita','Projeção privada e validação por campo no backend'],
  ['Gabinete','Órgãos externos','Gerenciar órgãos e contatos','gabinete.externos.gerenciar','Gabinete / administrador autorizado','Sem criar pessoas/contas duplicadas'],
  ['Gabinete','Ramais','Gerenciar ramais','gabinete.ramais.gerenciar','Gabinete / administrador autorizado','Divisões referenciadas por ID único'],
  ['Gabinete','Agenda','Exportar diretório autorizado','gabinete.agenda.exportar','Mesmo escopo da consulta','GAB-08 futura; exportação nunca amplia direitos'],
  ['RH','Efetivo','Consultar painel e relação','rh.efetivo.visualizar','Concessão expressa RH','Visão autorizada da planilha de controle de efetivo'],
  ['RH','Efetivo','Editar situação e dados funcionais','rh.efetivo.gerenciar','Gestores RH designados','RH detém autoridade sobre dados funcionais, não sobre login'],
  ['RH','Férias','Consultar planejamento de férias','rh.ferias.visualizar','Titular ou RH autorizado','Fase futura; privacidade por registro'],
  ['RH','Férias','Gerenciar períodos de férias','rh.ferias.gerenciar','Equipe RH autorizada','Fase futura; trilha de decisão/alterações'],
  ['Segurança','Sessões','Consultar sessões da própria conta','seguranca.sessoes.visualizar','Próprio titular','Backend futuro; metadados minimizados'],
  ['Segurança','Sessões','Encerrar sessões','seguranca.sessoes.revogar','Próprio titular / ação global autorizada','Revogação no backend, confirmação e auditoria']
]);
const freezeItem=item=>Object.freeze(item);
const chavesLegadas=new Set(CATALOGO_PERMISSOES.map(x=>x.id));
export const PERFIS_NATIVOS=Object.freeze([
  Object.freeze({id:'admin',nome:'Administrador'}),
  Object.freeze({id:'gestor',nome:'Gestor'}),
  Object.freeze({id:'conferente',nome:'Conferente'})
]);
export const CATALOGO_MATRIZ_GESTAO=Object.freeze([
  ...CATALOGO_PERMISSOES.map(permissao=>{
    const dados=LEGADOS[permissao.id];
    if(!dados)throw new Error('Permissão legada sem classificação explícita: '+permissao.id);
    return freezeItem({
      id:permissao.id,modulo:dados[0],recurso:dados[1],acao:dados[2],escopo:dados[3],
      estado:'legado',nota:'Chave declarada no frontend. A autorização real depende das validações do backend e do perfil/abrangência em cada fluxo.'
    });
  }),
  ...PROPOSTAS.map(([modulo,recurso,acao,id,escopo,nota])=>freezeItem({id,modulo,recurso,acao,escopo,nota,estado:'proposta'}))
]);
export const MODULOS_MATRIZ=Object.freeze([...new Set(CATALOGO_MATRIZ_GESTAO.map(x=>x.modulo))]);
export function classificacaoMatrizPerfil(item,perfil){
  if(item?.estado!=='legado'||!chavesLegadas.has(item.id))return 'a-definir';
  if(!Object.hasOwn(FUNCOES_NATIVAS,perfil))return 'nao-declarada';
  return FUNCOES_NATIVAS[perfil].includes(item.id)?'declarada':'nao-declarada';
}
export function filtrarMatrizGestao({modulo='',estado='',termo=''}={}){
  const busca=String(termo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
  return CATALOGO_MATRIZ_GESTAO.filter(item=>{
    if(modulo&&item.modulo!==modulo)return false;
    if(estado&&item.estado!==estado)return false;
    return !busca||[item.id,item.modulo,item.recurso,item.acao,item.escopo,item.nota].join(' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').includes(busca);
  });
}
export function resumoMatrizGestao(itens=CATALOGO_MATRIZ_GESTAO){
  return Object.freeze({
    total:itens.length,
    legado:itens.filter(x=>x.estado==='legado').length,
    propostas:itens.filter(x=>x.estado==='proposta').length,
    modulos:new Set(itens.map(x=>x.modulo)).size
  });
}
export function conferirContratoMatriz(){
  const ids=CATALOGO_MATRIZ_GESTAO.map(item=>item.id);
  const redundantes=ids.filter((x,i)=>ids.indexOf(x)!==i);
  const legadosAusentes=CATALOGO_PERMISSOES.map(x=>x.id).filter(id=>!LEGADOS[id]);
  return Object.freeze({valido:redundantes.length===0&&legadosAusentes.length===0,
    redundantes:Object.freeze(redundantes),legadosAusentes:Object.freeze(legadosAusentes)});
}
