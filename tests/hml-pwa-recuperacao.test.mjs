import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../recuperar.html',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const url='https://hml.invalid/cm-app-homologacao/recuperar.html';
function ambiente(estado='installed'){
 const dom=new JSDOM(html,{url,runScripts:'dangerously'}),w=dom.window,d=w.document;
 const mensagens=[],calls=[];const worker=new w.EventTarget();worker.state=estado;
 const registro={scope:new URL('./',url).href,waiting:estado==='installed'?worker:null,installing:estado==='installing'?worker:null,active:null,update:async()=>{calls.push('update');}};
 worker.postMessage=m=>{mensagens.push(m.tipo);worker.state='activated';registro.active=worker;registro.waiting=null;worker.dispatchEvent(new w.Event('statechange'));};
 Object.defineProperty(w.navigator,'serviceWorker',{value:{register:async(u,o)=>{calls.push([String(u),o.scope,o.updateViaCache]);return registro;}}});
 return {dom,d,worker,registro,calls,mensagens,click:()=>d.getElementById('atualizar').click(),finish:()=>{worker.state='installed';registro.installing=null;registro.waiting=worker;worker.dispatchEvent(new w.Event('statechange'));}};
}
test('recuperação independente ativa worker em espera somente após clique',async()=>{const f=ambiente();try{assert.equal(f.calls.length,0);f.click();await tick();assert.deepEqual(f.mensagens,['ATIVAR_ATUALIZACAO']);assert.equal(f.calls[0][2],'none');assert.equal(f.calls[0][1],new URL('./',url).href);assert.equal(f.d.getElementById('abrir').hidden,false);}finally{f.dom.window.close();}});
test('recuperação aguarda instalação sem apresentar sucesso prematuro',async()=>{const f=ambiente('installing');try{f.click();await tick();assert.equal(f.d.getElementById('abrir').hidden,true);f.finish();await tick();assert.deepEqual(f.mensagens,['ATIVAR_ATUALIZACAO']);assert.equal(f.d.getElementById('abrir').hidden,false);}finally{f.dom.window.close();}});
test('recuperação falha de maneira visível e permite repetir sem apagar dados',async()=>{const f=ambiente();try{f.registro.update=async()=>{throw Error('offline');};f.click();await tick();assert.match(f.d.getElementById('status').textContent,/offline/);assert.equal(f.d.getElementById('abrir').hidden,true);assert.equal(f.d.getElementById('atualizar').disabled,false);assert.equal(f.mensagens.length,0);assert.doesNotMatch(html,/caches\.delete|localStorage\.clear|unregister\(/);}finally{f.dom.window.close();}});
