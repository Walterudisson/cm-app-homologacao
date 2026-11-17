import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('recuperacao preserva tela e funcionalidade do CMAPP HML 1.13.11-H',async()=>{
  const root=new URL('../',import.meta.url);
  const html=await readFile(new URL('index.html',root),'utf8');
  const js=await readFile(new URL('app.js',root),'utf8');
  const sw=await readFile(new URL('service-worker.js',root),'utf8');
  const config=await readFile(new URL('js/config/firebase.js',root),'utf8');
  assert.match(html,/<!-- TELA DE LOGIN -->/);
  assert.match(html,/app\.js\?v=1\.13\.11-h-recuperacao\.1/);
  assert.match(sw,/v1\.13\.11-h-recuperacao\.1/);
  assert.match(config,/projectId: "cm-app-homologacao"/);
  assert.doesNotMatch(config,/projectId: "patrimonioscm"/);
  assert.doesNotMatch(js,/from "\.\/js\/modules\/dsips\/module\.js/);
});
test('conta versionada nunca entra em fluxos de permissao legado',async()=>{
  const js=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const marker=js.indexOf("Object.hasOwn(userDoc.data(), 'autorizacaoVersao')");
  const redirect=js.indexOf("location.replace(new URL('./homologacao/gestao-acessos/'",marker);
  const legacy=js.indexOf('usuarioLogado = { uid: user.uid',marker);
  const stop=js.indexOf('return;',redirect);
  assert.ok(marker>0 && redirect>marker && stop>redirect && stop<legacy);
});
