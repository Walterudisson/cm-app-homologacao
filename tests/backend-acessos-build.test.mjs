import test from 'node:test';import assert from 'node:assert/strict';import {readFile,mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
test('preparação gera pacote Functions com política única importável e registro idempotente',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cmapp-v2-build-'));try{
  await writeFile(join(dir,'package.json'),JSON.stringify({main:'index.js',dependencies:{'firebase-admin':'x','firebase-functions':'x'}}));await writeFile(join(dir,'index.js'),'// onCall db auth FieldValue HttpsError REGIAO\n');
  for(let i=0;i<2;i++){const p=spawnSync(process.execPath,['scripts/preparar-backend-acessos-v2.mjs',dir],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
  const index=await readFile(join(dir,'index.js'),'utf8');assert.equal(index.split('CMAPP-ACESSOS-V2:').length-1,1);
  const policy=await import(pathToFileURL(join(dir,'acessos-v2/politica/politica.mjs')));assert.equal(policy.podeNaPlataforma({uid:'s',versao:2,ativo:true,papelPlataforma:'superadmin'},'contas.consultar'),true);
  const load=createRequire(join(dir,'index.js'));const registrar=load('./acessos-v2/registrar.cjs');const opts=[];const handlers=registrar({onCall:(o,h)=>{opts.push(o);return h;},db:{},FieldValue:{},HttpsError:Error});assert.equal(Object.keys(handlers).length,13);assert.ok(opts.every(o=>o.region==='southamerica-east1'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('preparação rejeita destino arbitrário sem modificar arquivos existentes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cmapp-v2-invalid-'));try{await writeFile(join(dir,'package.json'),'{}');await writeFile(join(dir,'index.js'),'original');const p=spawnSync(process.execPath,['scripts/preparar-backend-acessos-v2.mjs',dir],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(await readFile(join(dir,'index.js'),'utf8'),'original');}finally{await rm(dir,{recursive:true,force:true});}
});
