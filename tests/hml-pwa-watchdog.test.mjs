import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('Watchdog independente'));
assert.ok(script);
const tick=()=>new Promise(r=>setImmediate(r));
function ambiente({saudavel=false,online=true}={}){
 const dom=new JSDOM(html,{url:'https://hml.invalid/cm-app-homologacao/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const chamadas=[],mensagens=[],timers=[];
 const worker=new w.EventTarget();worker.postMessage=m=>mensagens.push(m.tipo);
 const reg=new w.EventTarget();Object.assign(reg,{scope:new URL('./',w.location.href).href,waiting:worker,installing:null,update:async()=>{chamadas.push('update');}});
 const sw=new w.EventTarget();sw.controller={};sw.register=async(u,o)=>{chamadas.push(['register',o.scope,o.updateViaCache]);return reg;};
 Object.defineProperty(w.navigator,'serviceWorker',{value:sw});
 Object.defineProperty(w.navigator,'onLine',{configurable:true,value:online});
 w.setTimeout=fn=>{timers.push(fn);return 1;};
 d.getElementById('view-app').classList.add('hidden');
 d.getElementById('btn-submit-login').disabled=!saudavel;
 w.eval(script);
 return {dom,w,d,reg,sw,chamadas,mensagens,timers,run:async()=>{timers[0]();await tick();}};
}
test('watchdog inicia recuperação sem clique se o formulário permanecer bloqueado',async()=>{const f=ambiente();try{await f.run();assert.equal(f.chamadas[0][0],'register');assert.equal(f.chamadas[0][2],'none');assert.ok(f.mensagens.includes('ATIVAR_ATUALIZACAO'));assert.ok(f.chamadas.includes('update'));}finally{f.dom.window.close();}});
test('watchdog não interfere em aplicativo saudável',async()=>{const f=ambiente({saudavel:true});try{await f.run();assert.deepEqual(f.chamadas,[]);assert.deepEqual(f.mensagens,[]);}finally{f.dom.window.close();}});
test('watchdog espera conexão e tenta ao retornar online',async()=>{const f=ambiente({online:false});try{await f.run();assert.deepEqual(f.chamadas,[]);assert.match(f.d.getElementById('login-bootstrap-status').textContent,/Sem conexão/);Object.defineProperty(f.w.navigator,'onLine',{value:true});f.w.dispatchEvent(new f.w.Event('online'));await tick();assert.ok(f.mensagens.includes('ATIVAR_ATUALIZACAO'));}finally{f.dom.window.close();}});
test('watchdog não ativa worker após app ficar saudável durante download',async()=>{const f=ambiente();try{f.reg.waiting=null;let instalar=new f.w.EventTarget();instalar.state='installing';instalar.postMessage=m=>f.mensagens.push(m.tipo);f.reg.installing=instalar;await f.run();f.d.getElementById('btn-submit-login').disabled=false;f.reg.waiting=instalar;instalar.state='installed';instalar.dispatchEvent(new f.w.Event('statechange'));assert.deepEqual(f.mensagens,[]);}finally{f.dom.window.close();}});
