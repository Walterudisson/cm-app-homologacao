import {CONTATOS_DEMONSTRACAO,normalizarBusca} from './agenda-model.js';
import {dataLocalHoje} from './aniversarios-model.js';

// GAB-07: modelo puro. Nada é persistido, enviado a servidores ou indexado.
export const PRAZO_REVISAO_DIAS=90;
const TIPOS=new Set(['pessoa','ramal','externo']);
const CAMPOS=new Set(['tipo','nome','unidade','funcao','ramal','email','telefoneInstitucional','aniversario','revisadoEm']);
const DATAS_FIXTICIAS=Object.freeze({
  'demo-pessoa-001':'2026-11-15','demo-pessoa-002':'2026-08-01',
  'demo-pessoa-003':'2026-09-10','demo-pessoa-004':'2026-11-10',
  'demo-pessoa-005':null,'demo-externo-001':'2026-06-11',
  'demo-ramal-001':'2026-10-20','demo-ramal-002':'2026-08-12',
  'demo-ramal-003':'2026-11-12','demo-ramal-004':null
});
const DIA=86400000;

export class ErroCadastroGabinete extends Error {
  constructor(campo,mensagem,codigo='invalido'){super(mensagem);this.name='ErroCadastroGabinete';this.campo=campo;this.codigo=codigo;}
}
function dataCivil(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return null;
  const [ano,mes,dia]=iso.split('-').map(Number);
  if(ano<2000||ano>9999)return null;
  const valor=Date.UTC(ano,mes-1,dia);
  const d=new Date(valor);
  return d.getUTCFullYear()===ano&&d.getUTCMonth()===mes-1&&d.getUTCDate()===dia?valor:null;
}
export function validarCadastroGabinete(entrada){
  if(!entrada||typeof entrada!=='object'||Array.isArray(entrada))throw new ErroCadastroGabinete('nome','Cadastro inválido.');
  for(const chave of Object.keys(entrada)){
    if(!CAMPOS.has(chave))throw new ErroCadastroGabinete(chave,'Campo não autorizado nesta versão demonstrativa.','proibido');
  }
  const valor=c=>String(entrada[c]??'').trim().replace(/\s+/g,' ');
  const tipo=valor('tipo');
  if(!TIPOS.has(tipo))throw new ErroCadastroGabinete('tipo','Escolha Pessoa, Ramal ou Externo.');
  const nome=valor('nome'),unidade=valor('unidade'),funcao=valor('funcao');
  if(nome.length<3||nome.length>100)throw new ErroCadastroGabinete('nome','Informe o nome com 3 a 100 caracteres.');
  if(unidade.length<2||unidade.length>90)throw new ErroCadastroGabinete('unidade','Informe a unidade com 2 a 90 caracteres.');
  if(funcao.length>100)throw new ErroCadastroGabinete('funcao','Função deve ter até 100 caracteres.');
  const ramal=valor('ramal'),email=valor('email').toLowerCase(),telefoneInstitucional=valor('telefoneInstitucional');
  if(ramal&&!/^\d{2,8}$/.test(ramal))throw new ErroCadastroGabinete('ramal','Ramal deve ter de 2 a 8 dígitos, incluindo zeros à esquerda.');
  if(email&&(email.length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new ErroCadastroGabinete('email','Informe um e-mail institucional válido.');
  if(telefoneInstitucional){
    const digitos=telefoneInstitucional.replace(/\D/g,'');
    if(digitos.length<10||digitos.length>15||!/^[+\d()\s.-]+$/.test(telefoneInstitucional))
      throw new ErroCadastroGabinete('telefoneInstitucional','Telefone institucional deve conter 10 a 15 dígitos.');
  }
  const aniversario=valor('aniversario');
  if(aniversario){
    const m=/^(\d{2})-(\d{2})$/.exec(aniversario);
    if(!m||!dataCivil('2000-'+aniversario))throw new ErroCadastroGabinete('aniversario','Aniversário deve ser válido no formato MM-DD.');
    if(tipo!=='pessoa')throw new ErroCadastroGabinete('aniversario','Aniversário é permitido somente para pessoas.');
  }
  const revisadoEm=valor('revisadoEm');
  if(revisadoEm&&!dataCivil(revisadoEm))throw new ErroCadastroGabinete('revisadoEm','Informe uma data válida.');
  return Object.freeze({tipo,nome,unidade,funcao,ramal,email,telefoneInstitucional,aniversario:tipo==='pessoa'?aniversario:'',revisadoEm});
}
export function situacaoRevisaoGabinete(revisadoEm,hoje=dataLocalHoje()){
  const atual=dataCivil(hoje);
  if(atual===null)return {codigo:'indefinida',dias:null,rotulo:'Data de referência inválida'};
  if(!revisadoEm)return {codigo:'sem-revisao',dias:null,rotulo:'Sem revisão'};
  const ultimo=dataCivil(revisadoEm);
  if(ultimo===null||ultimo>atual)return {codigo:'sem-revisao',dias:null,rotulo:'Sem revisão válida'};
  const dias=Math.round((atual-ultimo)/DIA);
  if(dias>=PRAZO_REVISAO_DIAS)return {codigo:'vencida',dias,rotulo:'Revisão vencida'};
  if(dias>=75)return {codigo:'proxima',dias,rotulo:'Revisar em breve'};
  return {codigo:'em-dia',dias,rotulo:'Revisão em dia'};
}
export function qualidadeContatoGabinete(contato,hoje=dataLocalHoje()){
  const revisao=situacaoRevisaoGabinete(contato.revisadoEm,hoje);
  const pendencias=[];
  if(contato.tipo==='ramal'&&!contato.ramal)pendencias.push('Ramal não informado');
  if(contato.tipo==='pessoa'&&!contato.ramal&&!contato.telefoneInstitucional&&!contato.email)pendencias.push('Sem contato institucional');
  if(contato.tipo==='externo'&&!contato.email&&!contato.telefoneInstitucional)pendencias.push('Contato externo sem telefone ou e-mail');
  if(revisao.codigo==='sem-revisao'||revisao.codigo==='vencida')pendencias.push(revisao.rotulo);
  return {revisao,pendencias,precisaAtencao:pendencias.length>0||revisao.codigo==='proxima'};
}
export function criarCadastroGabineteEmMemoria({hoje=()=>dataLocalHoje(),dados=CONTATOS_DEMONSTRACAO}={}){
  let uidAtual='',sequencia=0;
  let registros=new Map();
  const assinantes=new Set();
  function emitir(){for(const fn of assinantes)fn();}
  function sessao(){if(!uidAtual)throw new ErroCadastroGabinete('sessao','Sessão não iniciada.','acesso');}
  function iniciar(uid){
    const valor=typeof uid==='string'?uid.trim():'';
    if(valor===uidAtual)return;
    uidAtual=valor;sequencia=0;registros=new Map();
    if(valor){
      for(const origem of dados){
        const {id,...campos}=origem;
        const valido=validarCadastroGabinete({...campos,revisadoEm:DATAS_FIXTICIAS[id]||''});
        registros.set(origem.id,Object.freeze({id:origem.id,...valido,ativo:true}));
      }
    }
    emitir();
  }
  function obter(id){return registros.get(id)||null;}
  function listar({incluirInativos=false}={}){
    return [...registros.values()].filter(c=>incluirInativos||c.ativo);
  }
  function checarDuplicado(candidato,id=null){
    const chave=c=>[c.tipo,normalizarBusca(c.nome),normalizarBusca(c.unidade)].join('|');
    if([...registros.values()].some(c=>c.ativo&&c.id!==id&&chave(c)===chave(candidato)))
      throw new ErroCadastroGabinete('nome','Já existe contato ativo com o mesmo nome, unidade e tipo.','duplicado');
  }
  function criar(entrada){
    sessao();const atual=validarCadastroGabinete({...entrada,revisadoEm:hoje()});
    checarDuplicado(atual);
    sequencia++;const id='sessao-'+sequencia;
    const registro=Object.freeze({id,...atual,ativo:true});
    registros.set(id,registro);emitir();return registro;
  }
  function editar(id,entrada){
    sessao();const anterior=obter(id);
    if(!anterior||!anterior.ativo)throw new ErroCadastroGabinete('nome','Contato não disponível.','ausente');
    const dadosValidados=validarCadastroGabinete({...entrada,revisadoEm:anterior.revisadoEm});
    checarDuplicado(dadosValidados,id);
    const atualizado=Object.freeze({id,...dadosValidados,ativo:true});
    registros.set(id,atualizado);emitir();return atualizado;
  }
  function excluir(id){
    sessao();const c=obter(id);if(!c||!c.ativo)throw new ErroCadastroGabinete('nome','Contato já excluído.','ausente');
    registros.set(id,Object.freeze({...c,ativo:false}));emitir();
    return obter(id);
  }
  function restaurar(id){
    sessao();const c=obter(id);if(!c||c.ativo)throw new ErroCadastroGabinete('nome','Contato não está excluído.','ausente');
    checarDuplicado(c,id);
    registros.set(id,Object.freeze({...c,ativo:true}));emitir();return obter(id);
  }
  function revisar(id){
    sessao();const c=obter(id);
    if(!c||!c.ativo)throw new ErroCadastroGabinete('nome','Contato não disponível.','ausente');
    const data=hoje();if(!dataCivil(data))throw new ErroCadastroGabinete('revisadoEm','Data atual inválida.');
    const atualizado=Object.freeze({...c,revisadoEm:data});
    registros.set(id,atualizado);emitir();return atualizado;
  }
  function assinar(fn){if(typeof fn!=='function')throw new TypeError('Assinante inválido');assinantes.add(fn);return()=>assinantes.delete(fn);}
  function limpar(){iniciar('');}
  return Object.freeze({iniciar,obter,listar,criar,editar,excluir,restaurar,revisar,assinar,limpar,usuarioAtual:()=>uidAtual});
}
