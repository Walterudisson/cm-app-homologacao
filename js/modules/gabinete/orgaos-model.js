import {normalizarBusca} from './agenda-model.js';
import {dataLocalHoje} from './aniversarios-model.js';

const AMOSTRA_ORGAOS=Object.freeze([
  Object.freeze({id:'demo-org-001',nome:'Órgão Externo Alfa (exemplo)',sigla:'OEA',categoria:'Órgão público',cidade:'Curitiba',telefone:'',email:'',revisadoEm:'2026-10-01',ativo:true}),
  Object.freeze({id:'demo-org-002',nome:'Instituição Parceira Beta (exemplo)',sigla:'IPB',categoria:'Instituição parceira',cidade:'Curitiba',telefone:'',email:'',revisadoEm:'2026-07-25',ativo:true})
]);
const CAMPOS=Object.freeze(['nome','sigla','categoria','cidade','telefone','email']);
const permitidos=new Set(CAMPOS);
export class ErroOrgaoGabinete extends Error{
 constructor(campo,mensagem,codigo='invalido'){super(mensagem);this.name='ErroOrgaoGabinete';this.campo=campo;this.codigo=codigo;}
}
export function validarOrgaoGabinete(dados){
 if(!dados||typeof dados!=='object'||Array.isArray(dados))throw new ErroOrgaoGabinete('nome','Dados do órgão inválidos.');
 for(const campo of Object.keys(dados))if(!permitidos.has(campo))throw new ErroOrgaoGabinete(campo,'Campo não autorizado para órgão externo.','proibido');
 const limpar=campo=>String(dados[campo]??'').trim().replace(/\s+/g,' ');
 const nome=limpar('nome'),sigla=limpar('sigla').toLocaleUpperCase('pt-BR');
 const categoria=limpar('categoria'),cidade=limpar('cidade');
 const telefone=limpar('telefone'),email=limpar('email').toLowerCase();
 if(nome.length<3||nome.length>110)throw new ErroOrgaoGabinete('nome','Nome do órgão deve ter entre 3 e 110 caracteres.');
 if(sigla.length>18)throw new ErroOrgaoGabinete('sigla','Sigla deve ter até 18 caracteres.');
 if(categoria.length>70)throw new ErroOrgaoGabinete('categoria','Categoria deve ter até 70 caracteres.');
 if(cidade.length>90)throw new ErroOrgaoGabinete('cidade','Cidade deve ter até 90 caracteres.');
 if(email&&(email.length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new ErroOrgaoGabinete('email','Informe um e-mail de contato válido.');
 if(telefone){
   const numeros=telefone.replace(/\D/g,'');
   if(numeros.length<10||numeros.length>15||!/^[+\d()\s.-]+$/.test(telefone))throw new ErroOrgaoGabinete('telefone','Telefone deve ter entre 10 e 15 dígitos.');
 }
 return Object.freeze({nome,sigla,categoria,cidade,telefone,email});
}
export function criarOrgaosGabineteEmMemoria({hoje=()=>dataLocalHoje(),amostras=AMOSTRA_ORGAOS}={}){
 let uid='',sequencia=0;let itens=new Map();const observadores=new Set();
 const emitir=()=>{for(const fn of observadores)fn();};
 const sessao=()=>{if(!uid)throw new ErroOrgaoGabinete('sessao','Sessão não iniciada.','acesso');};
 function iniciar(novo){
   const id=typeof novo==='string'?novo.trim():'';
   if(uid===id)return;
   uid=id;sequencia=0;itens=new Map();
   if(uid)for(const origem of amostras)itens.set(origem.id,Object.freeze({...origem}));
   emitir();
 }
 function listar({incluirInativos=false}={}){return [...itens.values()].filter(item=>incluirInativos||item.ativo);}
 function obter(id){return itens.get(id)||null;}
 function duplicado(dados,id){
   const chave=normalizarBusca(dados.nome);
   if(listar().some(item=>item.id!==id&&normalizarBusca(item.nome)===chave))throw new ErroOrgaoGabinete('nome','Já existe órgão externo com esse nome.','duplicado');
 }
 function criar(dados){
   sessao();const valido=validarOrgaoGabinete(dados);duplicado(valido);
   const id='sessao-org-'+(++sequencia);
   const registro=Object.freeze({id,...valido,ativo:true,revisadoEm:hoje()});
   itens.set(id,registro);emitir();return registro;
 }
 function editar(id,dados){
   sessao();const original=obter(id);
   if(!original?.ativo)throw new ErroOrgaoGabinete('nome','Órgão não disponível.','ausente');
   const valido=validarOrgaoGabinete(dados);duplicado(valido,id);
   const registro=Object.freeze({...original,...valido});
   itens.set(id,registro);emitir();return registro;
 }
 function arquivar(id,{vinculosAtivos=0}={}){
   sessao();const item=obter(id);
   if(!item?.ativo)throw new ErroOrgaoGabinete('nome','Órgão não disponível.','ausente');
   if(vinculosAtivos>0)throw new ErroOrgaoGabinete('nome','Este órgão possui contatos vinculados. Desvincule-os antes de arquivar.','vinculo');
   const registro=Object.freeze({...item,ativo:false});itens.set(id,registro);emitir();return registro;
 }
 function restaurar(id){
   sessao();const item=obter(id);
   if(!item||item.ativo)throw new ErroOrgaoGabinete('nome','Órgão não está arquivado.','ausente');
   duplicado(item,id);
   const registro=Object.freeze({...item,ativo:true});itens.set(id,registro);emitir();return registro;
 }
 function revisar(id){
   sessao();const item=obter(id);
   if(!item?.ativo)throw new ErroOrgaoGabinete('nome','Órgão não disponível.','ausente');
   const registro=Object.freeze({...item,revisadoEm:hoje()});itens.set(id,registro);emitir();return registro;
 }
 function assinar(fn){observadores.add(fn);return()=>observadores.delete(fn);}
 return Object.freeze({iniciar,listar,obter,criar,editar,arquivar,restaurar,revisar,assinar,limpar:()=>iniciar(''),usuarioAtual:()=>uid});
}
