import test from 'node:test';import assert from 'node:assert/strict';import {readFile,mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
test('preparação gera pacote Functions com política única importável e registro idempotente',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cmapp-v2-build-'));try{
  await writeFile(join(dir,'package.json'),JSON.stringify({main:'index.js',dependencies:{'firebase-admin':'x','firebase-functions':'x'}}));await writeFile(join(dir,'index.js'),'// onCall db auth FieldValue HttpsError REGIAO\n');
  for(let i=0;i<2;i++){const p=spawnSync(process.execPath,['scripts/preparar-backend-acessos-v2.mjs',dir],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
  const index=await readFile(join(dir,'index.js'),'utf8');assert.equal(index.split('CMAPP-ACESSOS-V2:').length-1,1);
  const policy=await import(pathToFileURL(join(dir,'acessos-v2/politica/politica.mjs')));assert.equal(policy.podeNaPlataforma({uid:'s',versao:2,ativo:true,papelPlataforma:'superadmin'},'contas.consultar'),true);
  const load=createRequire(join(dir,'index.js'));const registrar=load('./acessos-v2/registrar.cjs');const opts=[];const handlers=registrar({onCall:(o,h)=>{opts.push(o);return h;},db:{},FieldValue:{},HttpsError:Error});assert.equal(Object.keys(handlers).length,32);assert.ok(opts.every(o=>o.region==='southamerica-east1'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('preparação rejeita destino arbitrário sem modificar arquivos existentes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cmapp-v2-invalid-'));try{await writeFile(join(dir,'package.json'),'{}');await writeFile(join(dir,'index.js'),'original');const p=spawnSync(process.execPath,['scripts/preparar-backend-acessos-v2.mjs',dir],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(await readFile(join(dir,'index.js'),'utf8'),'original');}finally{await rm(dir,{recursive:true,force:true});}
});
test('índice cronológico operacional é mesclado sem remover índices existentes nem duplicar',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cmapp-v2-index-'));try{const file=join(dir,'firestore.indexes.json');const anterior={collectionGroup:'outra',queryScope:'COLLECTION',fields:[{fieldPath:'a',order:'ASCENDING'}]};await writeFile(file,JSON.stringify({indexes:[anterior],fieldOverrides:[{collectionGroup:'outra',fieldPath:'campo',indexes:[]}]}));for(let i=0;i<2;i++){const p=spawnSync(process.execPath,['scripts/preparar-indices-operacoes-v2.mjs',file],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);}const r=JSON.parse(await readFile(file,'utf8'));assert.equal(r.indexes.length,9);assert.deepEqual(r.indexes[0],anterior);assert.equal(r.fieldOverrides.length,1);assert.equal(r.indexes[1].collectionGroup,'dsipsEventos');}finally{await rm(dir,{recursive:true,force:true});}
});
