import { conferirVersaoAtual } from './contrato-versao.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('HML conduz conta V2 à gestão sem carregar privilégios legados',async()=>{
  const src=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const start=src.indexOf("if (Object.hasOwn(userDoc.data(), 'autorizacaoVersao'))");
  const route=src.indexOf("location.replace(new URL('./homologacao/gestao-acessos/'",start);
  const old=src.indexOf("usuarioLogado = { uid: user.uid",start);
  assert.ok(start!==-1&&route>start&&route<old);
  assert.match(src.slice(start,old),/autorizacaoVersao === 2/);
  assert.match(src.slice(start,old),/await signOut\(auth\)/);
  assert.match(src.slice(route,old),/return;/);
});
test('cache da PWA e script principal incluem nova versão',async()=>{
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const worker=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
  await conferirVersaoAtual();
  assert.match(index,/HOMOLOGAÇÃO/);
  assert.match(worker,/CACHE_SHELL/);
});
