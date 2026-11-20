import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {buscarOpcoesAutocomplete,adaptarSelectAutocomplete} from '../js/ui/autocomplete.js';
test('catálogos permitem sugestões iniciais limitadas, sem selecionar automaticamente',()=>{const itens=Array.from({length:10},(_,i)=>({id:String(i),nome:'Categoria '+i}));assert.equal(buscarOpcoesAutocomplete(itens,'',x=>[x.nome],8,0).length,8);assert.deepEqual(buscarOpcoesAutocomplete(itens,'categoria 9',x=>[x.nome],8,0).map(x=>x.id),['9']);});
test('adaptador preserva campo nativo, sincroniza edição, invalida texto e filtra opções desabilitadas',()=>{
 class No{
 constructor(tag=''){this.tag=tag;this.children=[];this.h={};this.attrs={};this.value='';this.hidden=false;this.disabled=false;this.classList={add(){}};}
 append(...ns){for(const n of ns){this.children.push(n);n.parentElement=this;}}
 replaceChildren(){this.children=[];}
 replaceWith(n){this.substituto=n;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
 setCustomValidity(v){this.validityMessage=v;}addEventListener(k,fn){this.h[k]=fn;}
 emit(k,props={}){this.h[k]?.({preventDefault(){},...props});}
 focus(){}scrollIntoView(){}contains(){return true;}
 dispatchEvent(e){this.emit(e.type);}
 querySelector(k){const achou=n=>k==='[role=listbox]'?n.attrs.role==='listbox':n.className===k.slice(1);const buscar=n=>achou(n)?n:n.children.map(buscar).find(Boolean);return buscar(this);}
 }
 const label=new No('label'),select=new No('select');label.append(select);select.required=true;select.name='categoriaId';select.value='b';select.options=[{value:'',textContent:'Selecione'},{value:'a',textContent:'Alfa'},{value:'b',textContent:'Beta'},{value:'c',textContent:'Bloqueada',disabled:true}];let changes=0;select.addEventListener('change',()=>changes++);
 const orig=globalThis.document;globalThis.document={createElement:tag=>new No(tag),addEventListener(){}};
 try{const c=adaptarSelectAutocomplete(select,{id:'test',rotulo:'Categoria'}),raiz=label.substituto,campo=raiz.children[1].children[0],lista=raiz.querySelector('[role=listbox]');
 assert.equal(select.name,'categoriaId');assert.equal(select.hidden,true);assert.equal(select.required,false);assert.equal(campo.required,true);assert.equal(campo.value,'Beta');
 campo.value='';campo.emit('input');assert.equal(select.value,'');assert.ok(campo.validityMessage);assert.equal(lista.children.length,2);
 lista.children[0].emit('click');assert.equal(select.value,'a');assert.equal(campo.validityMessage,'');assert.equal(changes,2);
 select.value='b';c.sincronizar();assert.equal(campo.value,'Beta');select.options=select.options.filter(o=>o.value!=='b');c.sincronizar();assert.equal(select.value,'');assert.ok(campo.validityMessage);
 c.setDisabled(true);assert.equal(campo.disabled,true);assert.equal(lista.hidden,true);
 }finally{globalThis.document=orig;}
});
test('três seletores sincronizam lista, edição e reset mantendo payload existente',async()=>{const ler=p=>readFile(new URL('../'+p,import.meta.url),'utf8');const [m,e]=await Promise.all([ler('js/modules/dsips/consulta-materiais-ui.js'),ler('js/modules/dsips/estoque-ui.js')]);assert.match(m,/adaptarSelectAutocomplete\(campo\('categoriaId'\)/);assert.match(m,/formulario.reset\(\);comboCategoria.sincronizar\(\)/);assert.match(m,/categoriaId: campo\('categoriaId'\).value/);assert.match(e,/adaptarSelectAutocomplete\(materialCampo,/);assert.match(e,/adaptarSelectAutocomplete\(localCampo,/);assert.match(e,/comboMaterial.sincronizar\(\);comboLocal.sincronizar\(\)/);assert.match(e,/materialId: materialCampo.value, localId: localCampo.value/);});
