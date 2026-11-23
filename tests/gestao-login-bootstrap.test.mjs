import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const serviceWorker=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');

test('hotfix login: controlador da matriz criado antes da inicialização síncrona de funções',()=>{
  const criar=app.indexOf('const matrizAcessosGestao = criarMatrizAcessosGestaoUI');
  const iniciar=app.indexOf('inicializarGestaoFuncoes();');
  const liberar=app.indexOf("document.getElementById('btn-submit-login').disabled=false;");
  assert.ok(criar>0,'criação do controlador deve existir');
  assert.ok(iniciar>criar,'inicialização de funções não deve acessar const em TDZ');
  assert.ok(liberar>iniciar,'botão login deve ser liberado após bootstrap');
});
test('hotfix login: chamada de inicialização funciona em execução isolada',()=>{
  const inicio=app.indexOf('    // GEST-01 hotfix: o controlador DEVE');
  const fim=app.indexOf("    window.addEventListener('popstate'",inicio);
  assert.ok(inicio>0&&fim>inicio);
  const trecho=app.slice(inicio,fim).replace('inicializarGestaoFuncoes();','matrizAcessosGestao.inicializar(); inicializarGestaoFuncoes();');
  const passos=[];
  const mock=()=>{
    passos.push('criou');
    return {inicializar(){passos.push('matriz pronta')}};
  };
  const teste=new Function('criarMatrizAcessosGestaoUI','inicializarAlternadoresSenha','inicializarGestaoDivisoes','inicializarGestaoFuncoes','usuarioLogado','podeNavegarLegado',trecho);
  assert.doesNotThrow(()=>teste(mock,()=>passos.push('senha'),()=>passos.push('divisoes'),()=>passos.push('funcoes'),null,()=>false));
  assert.deepEqual(passos,['criou','senha','divisoes','matriz pronta','funcoes']);
});
test('hotfix login: índice, imports e cache compartilham nova versão',()=>{
  assert.match(html,/v1\.13\.51-H\.1/);
  assert.match(html,/app\.js\?v=1\.13\.51-h\.1/);
  assert.match(app,/matriz-acessos-ui\.js\?v=1\.13\.51-h\.1/);
  assert.match(serviceWorker,/v1\.13\.51-h\.1-ux05-skeleton/);
});
