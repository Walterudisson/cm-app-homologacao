import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buscarOpcoesAutocomplete,criarAutocomplete} from '../js/ui/autocomplete.js';
import {filtrarCautelasDsips} from '../js/modules/dsips/registro-cautelas-model.js';
const pessoas=[{id:'u1',nome:'João da Silva',matricula:'123'},{id:'u2',nome:'João da Silva',matricula:'456'},{id:'u3',nome:'Maria',matricula:'789'}];
const pesquisa=x=>[x.nome,x.matricula];
test('autocomplete normaliza acentos, encontra matrícula e limita sugestões',()=>{assert.deepEqual(buscarOpcoesAutocomplete(pessoas,'joao 456',pesquisa).map(x=>x.id),['u2']);assert.deepEqual(buscarOpcoesAutocomplete(pessoas,'j',pesquisa),[]);assert.equal(buscarOpcoesAutocomplete(Array.from({length:20},(_,i)=>({id:String(i),nome:'Maria'})),'maria').length,8);});
test('devolução mostra somente cautelas abertas e parciais',()=>{assert.deepEqual(filtrarCautelasDsips([{id:'1',status:'aberta'},{id:'2',status:'parcial'},{id:'3',status:'encerrada'}],'','pendentes').map(x=>x.id),['1','2']);});
test('componente exige seleção explícita, invalida ID quando texto muda e limpa a seleção',()=>{
 class No {
  constructor(){this.value='';this.children=[];this.h={};this.attrs={};this.hidden=false;}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
  setCustomValidity(s){this.validityMessage=s;}replaceChildren(){this.children=[];}
  append(n){this.children.push(n);}addEventListener(k,fn){this.h[k]=fn;}
  emit(k,props={}){this.h[k]?.({preventDefault(){},...props});}
  focus(){}scrollIntoView(){}contains(){return true;}
 }
 const campo=new No(),valor=new No(),lista=new No(),limpar=new No(),status=new No(),raiz=new No();
 lista.id='lista';raiz.querySelector=k=>({'[role=listbox]':lista,'.cm-combo-clear':limpar,'.cm-combo-status':status}[k]);
 const anterior=globalThis.document;globalThis.document={createElement:()=>new No(),addEventListener(){}};
 try {
  const c=criarAutocomplete({raiz,campo,valor,pesquisa,rotulo:x=>x.nome,detalhe:x=>x.matricula});c.setItems(pessoas);
  valor.value='u1';c.sincronizar();assert.equal(campo.value,'João da Silva · 123');assert.equal(campo.validityMessage,'');c.reset();
  campo.value='joao';campo.emit('input');assert.equal(valor.value,'');assert.ok(campo.validityMessage);assert.equal(lista.children.length,2);
  campo.emit('keydown',{key:'Enter'});assert.equal(valor.value,'');
  campo.emit('keydown',{key:'ArrowDown'});campo.emit('keydown',{key:'ArrowDown'});campo.emit('keydown',{key:'Enter'});assert.equal(valor.value,'u2');assert.equal(campo.validityMessage,'');
  campo.value='Maria';campo.emit('input');assert.equal(valor.value,'');assert.ok(campo.validityMessage);lista.children[0].emit('click');assert.equal(valor.value,'u3');
  c.setItems(pessoas.slice(0,2));assert.equal(valor.value,'');assert.equal(campo.value,'');
  campo.value='joao';campo.emit('input');limpar.emit('click');assert.equal(campo.value,'');assert.equal(valor.value,'');assert.equal(lista.hidden,true);
 }finally{globalThis.document=anterior;}
});
test('PDV usa cards únicos, consulta inicialmente oculta e autocomplete com ID validado',async()=>{const ler=p=>readFile(new URL('../'+p,import.meta.url),'utf8');const [h,u,sw]=await Promise.all([ler('index.html'),ler('js/modules/dsips/registro-cautelas-ui.js'),ler('service-worker.js')]);assert.doesNotMatch(h,/id="dsips-(pdv-mode|cautelas-new)"/);assert.match(h,/id="dsips-cautelas-consulta" class="app-card dsips-panel hidden"/);assert.match(h,/type="hidden" name="responsavelId"/);assert.match(u,/responsavelId:usuarioSelect.value/);assert.match(u,/filtro.value='pendentes'/);assert.match(u,/comboResponsavel.setItems\(responsaveis.filter/);assert.match(sw,/js\/ui\/autocomplete\.js/);});
