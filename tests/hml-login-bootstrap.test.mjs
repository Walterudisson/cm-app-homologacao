import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const names=new Map();
async function scan(p){
 for(const entry of await readdir(p,{withFileTypes:true})){
  const q=join(p,entry.name);
  if(entry.isDirectory())await scan(q);
  else if(q.endsWith('.js'))await collect(q);
 }
}
async function collect(q){
 const s=await readFile(q,'utf8');
 for(const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](https:\/\/www\.gstatic\.com\/firebasejs\/[^'"]+)['"]/g)){
  if(!names.has(m[2]))names.set(m[2],new Set());
  for(const name of m[1].split(',')){const n=name.trim().split(/\s+as\s+/)[0];if(n)names.get(m[2]).add(n);}
 }
}
await scan(join(root,'js'));await collect(join(root,'app.js'));
test('Inicialização completa do app e submissão do login com transporte simulado',async()=>{
 const dom=new JSDOM(await readFile(join(root,'index.html'),'utf8'),{url:'https://hml.invalid/'});
 const d=dom.window.document;
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 dom.window.scrollTo=()=>{};
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const props=['document','window','navigator','location','history','localStorage','sessionStorage','MutationObserver','Option','Event','HTMLElement','requestAnimationFrame'];
 const descriptors=Object.fromEntries(props.map(p=>[p,Object.getOwnPropertyDescriptor(globalThis,p)]));
 for(const p of props)Object.defineProperty(globalThis,p,{configurable:true,writable:true,value:dom.window[p]});
 const interval=globalThis.setInterval;globalThis.setInterval=()=>0;
 globalThis.__cmappSmoke={calls:0};
 const shim=registerHooks({
  resolve(specifier,context,next){if(names.has(specifier))return {url:specifier,shortCircuit:true};return next(specifier,context);},
  load(url,context,next){if(!names.has(url))return next(url,context);const sources=[...names.get(url)].map(n=>{
    if(n==='signInWithEmailAndPassword')return "export async function signInWithEmailAndPassword(){globalThis.__cmappSmoke.calls++;throw Object.assign(new Error('simulado'),{code:'auth/invalid-credential'});}";
    if(n==='httpsCallable')return "export const httpsCallable=()=>async()=>({data:{}});";
    if(n==='onAuthStateChanged')return "export const onAuthStateChanged=()=>()=>{};";
    return 'export const '+n+'=(...args)=>({});';
  });return {format:'module',source:sources.join('\n'),shortCircuit:true};}
 });
 try{
  await import('../app.js');
  assert.ok(d.querySelector('#form-login .password-toggle'),'Inicializador do formulário não executou');
  d.getElementById('login-email').value='teste@example.invalid';d.getElementById('login-senha').value='senha-ficticia';
  const e=new dom.window.Event('submit',{bubbles:true,cancelable:true});
  d.getElementById('form-login').dispatchEvent(e);
  assert.ok(e.defaultPrevented,'O formulário não pode recarregar a página');
  await new Promise(r=>setImmediate(r));
  assert.equal(globalThis.__cmappSmoke.calls,1);
  assert.match(d.getElementById('login-erro').innerText,/E-mail ou senha incorretos/);
 }finally{
  shim.deregister();globalThis.setInterval=interval;delete globalThis.__cmappSmoke;
  for(const p of props){if(descriptors[p])Object.defineProperty(globalThis,p,descriptors[p]);else delete globalThis[p];}
  dom.window.close();
 }
});
