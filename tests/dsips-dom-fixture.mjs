import {JSDOM} from 'jsdom';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
import {configurarServicos} from './dsips-service-fake.mjs';
const raiz=new URL('../',import.meta.url);
const fake=new URL('./dsips-service-fake.mjs',import.meta.url).href;
// Substitui SOMENTE o módulo de transporte DSIPS dos componentes reais.
registerHooks({resolve(specifier,context,next){
  if(context.parentURL && specifier.startsWith('./service.js') && new URL(specifier,context.parentURL).pathname===new URL('js/modules/dsips/service.js',raiz).pathname)
    return {url:fake,shortCircuit:true};
  return next(specifier,context);
}});
const html=await readFile(new URL('index.html',raiz),'utf8');
export const aguardar=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
export function ambiente(perfil='admin'){
  const dom=new JSDOM(html,{url:'https://teste.invalid/'});
  const d=dom.window.document;dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  const anteriores={document:globalThis.document,Option:globalThis.Option,window:globalThis.window,sessionStorage:globalThis.sessionStorage};
  Object.assign(globalThis,{document:d,Option:dom.window.Option,window:dom.window,sessionStorage:dom.window.sessionStorage});
  const usuario={uid:'teste',perfil,modulos:['dsips'],nome:'Operador Teste'};
  const estado={categorias:[{id:'cat',nome:'Categoria',ativo:true}],locais:[{id:'local',nome:'Depósito',ativo:true}],responsaveis:[{id:'p',nome:'Pessoa Teste',matricula:'123',ativo:true}],materiais:[{id:'m',nome:'Quantidade',categoriaId:'cat',unidade:'un',controle:'quantidade',ativo:true},{id:'i',nome:'Individual',categoriaId:'cat',unidade:'un',controle:'individualizado',ativo:true}],estoque:[{materialId:'m',localId:'local',total:10,disponivel:10,emCautela:0},{materialId:'i',localId:'local',total:2,disponivel:2,emCautela:0}],cautelas:[]};
  const chamadas=[],avisos=[],consultas=[],confirmacoes=[];
  const servicos={listar:async tipo=>{consultas.push(tipo);return structuredClone(estado[tipo]);},listarUnidades:async()=>[{id:'u1',identificacao:'SER-1',situacao:'disponivel'},{id:'u2',identificacao:'SER-2',situacao:'em_cautela',cautelaId:'outra'}],
    salvar:async payload=>{chamadas.push(payload);const tipo={material:'materiais',categoria:'categorias',local:'locais'}[payload.tipo];estado[tipo].push({id:payload.id,...payload.dados});},
    saldoInicial:async payload=>{chamadas.push(payload);estado.materiais.find(m=>m.id===payload.materialId).saldoInicialRegistrado=true;estado.estoque.push({materialId:payload.materialId,localId:payload.localId,total:payload.quantidade,disponivel:payload.quantidade,emCautela:0});},
    registrarCautela:async p=>{chamadas.push(p);},registrarDevolucao:async p=>{chamadas.push(p);}};
  configurarServicos(servicos);
  const id=n=>{const el=d.getElementById(n);if(!el)throw Error('Elemento ausente: '+n);return el;};
  const evento=(el,n)=>el.dispatchEvent(new dom.window.Event(n,{bubbles:true,cancelable:true}));
  const options={obterUsuario:()=>usuario,confirmar:async p=>{confirmacoes.push(p);return true;},notificar:(...a)=>avisos.push(a)};
  const selecionar=(campo,termo)=>{const el=id(campo);el.value=termo;evento(el,'input');const lista=id(el.getAttribute('aria-controls'));if(!lista.firstElementChild)throw Error('Sem sugestões para '+termo+' em '+campo);lista.firstElementChild.click();};
  function abrir(secao){id('sec-'+secao).classList.remove('hidden');}
  return {dom,d,id,evento,selecionar,abrir,usuario,estado,chamadas,avisos,consultas,confirmacoes,servicos,options,fechar(){configurarServicos(null);Object.assign(globalThis,anteriores);dom.window.close();}};
}
export const cautela=()=>({id:'C-123',status:'aberta',responsavelId:'p',responsavelNome:'Pessoa Teste',responsavelMatricula:'123',itens:[{materialId:'m',nome:'Quantidade',quantidade:5,devolvida:0,unidade:'un',controle:'quantidade',unidades:[],unidadesDevolvidas:[]},{materialId:'i',nome:'Individual',quantidade:1,devolvida:0,unidade:'un',controle:'individualizado',unidades:[{id:'u1',identificacao:'SER-1'}],unidadesDevolvidas:[]}]});
