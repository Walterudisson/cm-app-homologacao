import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const ler = arquivo => readFile(new URL('../'+arquivo, import.meta.url), 'utf8');

test('GEST-06 mantém lista e cards na mesma fonte, sem cadastros fictícios', async () => {
  const [html, app, css] = await Promise.all([ler('index.html'), ler('app.js'), ler('app.css')]);
  assert.match(html, /data-users-view="lista"[^>]*aria-pressed="true"/);
  assert.match(html, /data-users-view="cards"[^>]*aria-pressed="false"/);
  assert.match(app, /bancoUsuarios = snapshot\.docs\.map\(docSnap => \(\{ \.\.\.docSnap\.data\(\), uid: docSnap\.id \}\)\)/);
  const inicio = app.indexOf('function renderizarListaUsuarios()');
  const final = app.indexOf('window.mudarPaginaUsuarios =', inicio);
  const render = app.slice(inicio, final);
  assert.match(render, /container\.dataset\.view = visualizacaoUsuarios/);
  assert.match(render, /const usuariosFiltradosPorPermissao = bancoUsuarios\.filter/);
  assert.match(render, /filtrarUsuariosPorFuncao\(usuariosFiltradosPorPermissao/);
  assert.match(render, /data-user-details/);
  assert.match(css, /#sec-usuarios \.users-list\[data-view="cards"\]/);
  assert.match(css, /#sec-usuarios \.users-list\[data-view="lista"\]/);
});
test('GEST-06 alternância não altera perfil-base, vínculo, escopo ou Firestore', async () => {
  const app = await ler('app.js');
  const inicio = app.indexOf("document.querySelectorAll('[data-users-view]').forEach");
  const fim = app.indexOf("document.getElementById('filtro-funcao-usuarios')", inicio);
  assert.ok(inicio > 0 && fim > inicio);
  const codigo = app.slice(inicio, fim);
  assert.match(codigo, /podeNavegarLegado\(usuarioLogado, 'usuarios'\)/);
  assert.match(codigo, /renderizarListaUsuarios\(\)/);
  assert.doesNotMatch(codigo, /setDoc|updateDoc|addDoc|deleteDoc|localStorage/);
});
test('GEST-06 ficha do usuário oferece abas reais e reinicia na abertura', async () => {
  const [html, app, css] = await Promise.all([ler('index.html'), ler('app.js'), ler('app.css')]);
  for(const id of ['gest06-tab-dados','gest06-tab-acessos','gest06-pane-dados','gest-usuario-resumo'])
    assert.match(html, new RegExp('id="'+id+'"'));
  assert.match(html, /data-gest06-profile-tab="dados"[^>]*aria-selected="true"/);
  assert.match(html, /data-gest06-profile-tab="acessos"[^>]*aria-selected="false"/);
  assert.match(app, /function selecionarAbaPerfilGestao\(aba, focar = false\)/);
  assert.match(app, /selecionarAbaPerfilGestao\('dados'\);\s*abrirModalHistorico\('modal-detalhes-usuario'/);
  assert.match(css, /\.gest06-profile-pane\[hidden\]\{display:none!important\}/);
  assert.match(app, /preencherPainelVinculoUsuario\(usuario\)/);
});
test('GEST-06 versionamento HML e cache coerentes', async () => {
  const [html, sw, pck] = await Promise.all([ler('index.html'),ler('service-worker.js'),ler('package.json')]);
  assert.match(html, /v1\.13\.51-H\.1/);
  assert.match(html, /app\.css\?v=1\.13\.51-h\.1/);
  assert.match(sw, /v1\.13\.51-h\.1-ux05-skeleton/);
  assert.equal(JSON.parse(pck).version, '1.13.51-h.1');
});
