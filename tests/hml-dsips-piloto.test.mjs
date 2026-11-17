import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
test('rota HML DSIPS tem login real e pacote fechado',async()=>{
 const root='homologacao/dsips/',html=await readFile(root+'index.html','utf8');
 assert.match(html,/dsips-hml-v2-1/);assert.match(html,/id="pilot-login"/);assert.match(html,/href="..\/gestao-acessos\//);
 for(const path of ['assets/operacoes-v2/app.js','assets/operacoes-v2/controller.js','assets/operacoes-v2/servicos.js','assets/js/config/firebase.js','assets/js/services/operacoes-v2.service.js','assets/js/modules/dsips/cautelas-controller.js','assets/gestao-v2/login-piloto.js'])await stat(root+path);
 const cfg=await readFile(root+'assets/js/config/firebase.js','utf8');assert.match(cfg,/projectId: "cm-app-homologacao"/);assert.doesNotMatch(cfg,/patrimonioscm/);
 const app=await readFile(root+'assets/operacoes-v2/app.js','utf8');assert.match(app,/conectarLoginPiloto/);
});
test('navegacao da Gestao V2 exige consulta DSIPS',async()=>{
 const s=await readFile('homologacao/gestao-acessos/assets/gestao-v2/app.js','utf8');
 assert.match(s,/podeExecutar\(acesso,\{moduloId:'dsips'/);
});
