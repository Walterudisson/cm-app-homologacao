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
  const handlers={},store=new Map(),rede=[],mensagens=[],excluidos=[],janelas=[],navegacoes=[];
  const key=r=>typeof r==='string'?r:r.url;
  const cache=nome=>{
    if(!store.has(nome))store.set(nome,new Map());
    const m=store.get(nome);
    return {match:async r=>m.get(key(r)),put:async(r,v)=>m.set(key(r),v),addAll:async requests=>{for(const r of requests){assert.equal(r.cache,'reload');m.set(key(r),new Response('shell:'+key(r)));}}};
  };
  const ctx={URL,Request,Response,Set,caches:{open:async n=>cache(n),keys:async()=>[...store.keys()],delete:async n=>{excluidos.push(n);return store.delete(n);}},self:{registration:{scope:escopo},location:{origin:new URL(escopo).origin},clients:{claim:async()=>mensagens.push('claim'),matchAll:async()=>janelas},skipWaiting:()=>mensagens.push('skip'),addEventListener:(t,h)=>handlers[t]=h},fetch:async r=>{rede.push(key(r));return new Response('rede:'+key(r));}};
  vm.runInNewContext(sw,ctx);
  const fire=async(t,e={})=>{
    const espera=[];let resposta;
    handlers[t]({...e,waitUntil:p=>espera.push(p),respondWith:p=>{resposta=p;}});
    const r=await resposta;await Promise.all(espera);return r;
  };
  const pedir=(p,destination='script',mode='cors',method='GET')=>fire('fetch',{request:{url:new URL(p,escopo).href,method,destination,mode}});
  return {fire,pedir,store,cache,rede,mensagens,excluidos,ctx,janelas,navegacoes,janela:url=>janelas.push({url,navigate:async alvo=>{navegacoes.push(alvo);}})};
}
test('shell ativo serve HTML e scripts versionados do mesmo snapshot sem recorrer a cache legado',async()=>{
  const s=simular();await s.fire('install');s.rede.length=0;
  await s.cache('cmapp-shell-antigo').put(escopo+'app.js',new Response('antigo'));
  assert.equal(await (await s.pedir('./','document','navigate')).text(),'shell:'+escopo);
  assert.equal(await (await s.pedir('app.js?v=1.13.38-h.2')).text(),'shell:'+escopo+'app.js');
  assert.equal(s.rede.length,0);
  await s.fire('activate');assert.ok(s.excluidos.includes('cmapp-shell-antigo'));
  assert.deepEqual(s.mensagens,['claim']);
});
test('código fora do shell não reutiliza revisão diferente quando rede falha',async()=>{
  const s=simular();await s.fire('install');
  assert.match(await (await s.pedir('outra-rota/exemplo.js?v=1')).text(),/^rede:/);
  s.ctx.fetch=async()=>{throw Error('offline');};
  assert.match(await (await s.pedir('outra-rota/exemplo.js?v=1')).text(),/^rede:/);
  assert.equal((await s.pedir('outra-rota/exemplo.js?v=2')).type,'error');
});
test('entrada V2 não recebe HTML legado e operações não GET não são interceptadas',async()=>{
  const s=simular();await s.fire('install');s.rede.length=0;
  assert.match(await (await s.pedir('outra-rota/','document','navigate')).text(),/^rede:/);
  assert.equal(await s.pedir('gravar','', 'cors','POST'),undefined);
  s.ctx.fetch=async()=>{throw Error('offline');};
  assert.equal(await (await s.pedir('outra-rota/','document','navigate')).text(),'shell:'+escopo+'offline.html');
});
test('atualização depende de aceite e registro desabilita cache de atualização do worker',async()=>{
  const pwa=await ler('js/pwa.js');
  assert.match(pwa,/updateViaCache: 'none'/);
  assert.match(pwa,/atualizacoesOferecidas\.has\(worker\)/);
  assert.match(pwa,/aoAcao: \(\) => worker\.postMessage\(\{ tipo: 'ATIVAR_ATUALIZACAO' \}\)/);
  const s=simular();await s.fire('install');assert.equal(s.mensagens.length,0);
  await s.fire('message',{data:{tipo:'ATIVAR_ATUALIZACAO'}});assert.deepEqual(s.mensagens,['skip']);
});

test('recuperação usa rede mesmo com shell ativo e responde sem shell quando offline',async()=>{const s=simular();await s.fire('install');assert.match(await (await s.pedir('recuperar.html','document','navigate')).text(),/^rede:/);s.ctx.fetch=async()=>{throw Error('offline');};const r=await s.pedir('recuperar.html','document','navigate');assert.equal(r.status,503);assert.match(await r.text(),/Conecte-se/);});

test('resgate automático de cada shell defeituoso confirmado, sem clique nem limpar dados',async()=>{
 for(const versao of ['v1.13.34-h.1-perf-cache','v1.13.35-h.1-qa-acesso','v1.13.36-h.1-qa-pwa','v1.13.37-h.1-qa-integrada']){
  const s=simular(),antigo='cmapp-shell-'+versao;
  await s.cache(antigo).put(escopo+'index.html',new Response('antigo'));
  await s.cache('cmapp-runtime-'+versao).put('https://cdn.test/a',new Response('antigo'));
  await s.cache('cmapp-shell-outra-aplicacao').put('https://example.test/outra/index.html',new Response('outra'));
  s.janela(escopo+'#perfil');s.janela(escopo+'index.html');s.janela(escopo+'outra-rota/');s.janela('https://example.test/outra/');s.janela(escopo+'recuperar.html');
  await s.fire('install');assert.deepEqual(s.mensagens,['skip']);assert.equal(s.excluidos.length,0);
  await s.fire('activate');assert.deepEqual(s.mensagens,['skip','claim']);
  assert.deepEqual(s.navegacoes,[escopo+'?cmapp-recovery=v1.13.38-h.2-gabinete',escopo+'index.html?cmapp-recovery=v1.13.38-h.2-gabinete']);
  assert.ok(s.excluidos.includes(antigo));assert.ok(s.excluidos.includes('cmapp-runtime-'+versao));assert.ok(s.store.has('cmapp-shell-outra-aplicacao'));
  assert.equal(await (await s.pedir('./','document','navigate')).text(),'shell:'+escopo);
 }
});
test('release saudável não é forçada; shell de outro escopo não autoriza emergência',async()=>{
 const s=simular();
 await s.cache('cmapp-shell-v1.13.37-h.3-recuperacao').put(escopo+'index.html',new Response('saudavel'));
 await s.cache('cmapp-shell-v1.13.37-h.1-qa-integrada').put('https://example.test/outra/index.html',new Response('outra'));
 s.janela(escopo);await s.fire('install');assert.deepEqual(s.mensagens,[]);
 await s.fire('activate');assert.deepEqual(s.mensagens,['claim']);assert.deepEqual(s.navegacoes,[]);assert.ok(s.store.has('cmapp-shell-v1.13.37-h.1-qa-integrada'));
});
test('instalação incompleta nunca força ativação nem remove cache antigo',async()=>{
 const s=simular(),antigo='cmapp-shell-v1.13.37-h.1-qa-integrada';
 await s.cache(antigo).put(escopo+'index.html',new Response('antigo'));
 const open=s.ctx.caches.open;s.ctx.caches.open=async nome=>{const c=await open(nome);if(nome==='cmapp-shell-v1.13.38-h.2-gabinete')c.addAll=async()=>{throw Error('download falhou');};return c;};
 await assert.rejects(s.fire('install'),/download falhou/);assert.deepEqual(s.mensagens,[]);assert.ok(s.store.has(antigo));assert.equal(s.excluidos.length,0);
});

test('SAN-01: rotas e recursos retirados não usam rede nem cache, inclusive offline',async()=>{const s=simular();await s.fire('install');s.rede.length=0;for(const p of ['homologacao/gestao-acessos/','homologacao/dsips','homologacao/dsips/assets/operacoes-v2/app.js?v=2']){const r=await s.pedir(p);assert.equal(r.status,410);assert.match(await r.text(),/desativada/);}assert.equal(s.rede.length,0);});
