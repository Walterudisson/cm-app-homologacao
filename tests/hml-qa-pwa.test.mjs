import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import {conferirVersaoAtual} from './contrato-versao.mjs';
const raiz=new URL('../',import.meta.url);
const ler=p=>readFile(new URL(p,raiz),'utf8');
const escopo='https://example.test/cm-app-homologacao/';
const sw=await ler('service-worker.js');
const caminhos=[...sw.matchAll(/^\s*'\.\/([^']*)',?$/gm)].map(m=>m[1]);
test('interface e Service Worker identificam mesma release; precache existe', async()=>{
  await conferirVersaoAtual();
  for(const p of caminhos) if(p) await access(new URL(p,raiz));
  assert.ok(caminhos.includes('js/platform/acesso-sessao.js'));
  assert.ok(caminhos.includes('js/core/escopo.js'));
});
function simular(){
  const handlers={},store=new Map(),rede=[],mensagens=[],excluidos=[];
  const key=r=>typeof r==='string'?r:r.url;
  const cache=nome=>{
    if(!store.has(nome))store.set(nome,new Map());
    const m=store.get(nome);
    return {match:async r=>m.get(key(r)),put:async(r,v)=>m.set(key(r),v),addAll:async requests=>{for(const r of requests){assert.equal(r.cache,'reload');m.set(key(r),new Response('shell:'+key(r)));}}};
  };
  const ctx={URL,Request,Response,Set,caches:{open:async n=>cache(n),keys:async()=>[...store.keys()],delete:async n=>{excluidos.push(n);return store.delete(n);}},self:{registration:{scope:escopo},location:{origin:new URL(escopo).origin},clients:{claim:async()=>mensagens.push('claim')},skipWaiting:()=>mensagens.push('skip'),addEventListener:(t,h)=>handlers[t]=h},fetch:async r=>{rede.push(key(r));return new Response('rede:'+key(r));}};
  vm.runInNewContext(sw,ctx);
  const fire=async(t,e={})=>{
    const espera=[];let resposta;
    handlers[t]({...e,waitUntil:p=>espera.push(p),respondWith:p=>{resposta=p;}});
    const r=await resposta;await Promise.all(espera);return r;
  };
  const pedir=(p,destination='script',mode='cors',method='GET')=>fire('fetch',{request:{url:new URL(p,escopo).href,method,destination,mode}});
  return {fire,pedir,store,cache,rede,mensagens,excluidos,ctx};
}
test('shell ativo serve HTML e scripts versionados do mesmo snapshot sem recorrer a cache legado',async()=>{
  const s=simular();await s.fire('install');s.rede.length=0;
  await s.cache('cmapp-shell-antigo').put(escopo+'app.js',new Response('antigo'));
  assert.equal(await (await s.pedir('./','document','navigate')).text(),'shell:'+escopo);
  assert.equal(await (await s.pedir('app.js?v=1.13.37-h.1')).text(),'shell:'+escopo+'app.js');
  assert.equal(s.rede.length,0);
  await s.fire('activate');assert.ok(s.excluidos.includes('cmapp-shell-antigo'));
  assert.deepEqual(s.mensagens,['claim']);
});
test('código fora do shell não reutiliza revisão diferente quando rede falha',async()=>{
  const s=simular();await s.fire('install');
  assert.match(await (await s.pedir('homologacao/gestao-acessos/exemplo.js?v=1')).text(),/^rede:/);
  s.ctx.fetch=async()=>{throw Error('offline');};
  assert.match(await (await s.pedir('homologacao/gestao-acessos/exemplo.js?v=1')).text(),/^rede:/);
  assert.equal((await s.pedir('homologacao/gestao-acessos/exemplo.js?v=2')).type,'error');
});
test('entrada V2 não recebe HTML legado e operações não GET não são interceptadas',async()=>{
  const s=simular();await s.fire('install');s.rede.length=0;
  assert.match(await (await s.pedir('homologacao/gestao-acessos/','document','navigate')).text(),/^rede:/);
  assert.equal(await s.pedir('gravar','', 'cors','POST'),undefined);
  s.ctx.fetch=async()=>{throw Error('offline');};
  assert.equal(await (await s.pedir('homologacao/gestao-acessos/','document','navigate')).text(),'shell:'+escopo+'offline.html');
});
test('atualização depende de aceite e registro desabilita cache de atualização do worker',async()=>{
  const pwa=await ler('js/pwa.js');
  assert.match(pwa,/updateViaCache: 'none'/);
  assert.match(pwa,/atualizacoesOferecidas\.has\(worker\)/);
  assert.match(pwa,/aoAcao: \(\) => worker\.postMessage\(\{ tipo: 'ATIVAR_ATUALIZACAO' \}\)/);
  const s=simular();await s.fire('install');assert.equal(s.mensagens.length,0);
  await s.fire('message',{data:{tipo:'ATIVAR_ATUALIZACAO'}});assert.deepEqual(s.mensagens,['skip']);
});
