import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const ler=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('GEST-03 ficha, filtros e prévias possuem elementos estáveis no HTML',async()=>{
  const html=await ler('index.html');
  for(const id of [
    'gest-detalhes-funcao-vinculo','gest-detalhes-funcao-situacao',
    'gest-detalhes-modulos','gest-detalhes-permissoes','gest-detalhes-aviso',
    'gest-previa-cadastro','gest-previa-edicao','filtro-funcao-usuarios'
  ])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/v1\.13\.48-H\.1/);
});
test('GEST-03 mantém o bloqueio de navegação antes de filtrar vínculos',async()=>{
  const app=await ler('app.js');
  const bloqueio=app.indexOf('const usuariosFiltradosPorPermissao = bancoUsuarios.filter');
  const filtro=app.indexOf('filtrarUsuariosPorFuncao(usuariosFiltradosPorPermissao');
  assert.ok(bloqueio>0&&filtro>bloqueio);
  assert.match(app,/preencherPainelVinculoUsuario\(usuario\)/);
  assert.match(app,/resumirVinculoUsuario\(usuario,/);
});
test('GEST-03 funções desativadas não são silenciosamente desvinculadas na edição',async()=>{
  const app=await ler('app.js');
  assert.match(app,/if\(user\.funcaoId&&!bancoFuncoes\.some/);
  assert.match(app,/Função vinculada anteriormente \(indisponível para nova atribuição\)/);
  assert.match(app,/selectFuncaoEdicao\.value = user\.funcaoId \|\| ''/);
});
test('GEST-03 novo arquivo de acesso é pré-cacheado e não altera catálogo de permissões',async()=>{
  const sw=await ler('service-worker.js');
  const mod=await ler('js/modules/gestao/usuarios-acessos-model.js');
  assert.match(sw,/v1\.13\.48-h\.1-gest05/);
  assert.match(sw,/\.\/js\/modules\/gestao\/usuarios-acessos-model\.js/);
  assert.doesNotMatch(mod,/(setDoc|updateDoc|httpsCallable|deleteDoc)\(/);
});
