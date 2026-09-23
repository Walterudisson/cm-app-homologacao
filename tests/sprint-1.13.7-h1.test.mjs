import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const [app, html, css, worker, storage, firebase] = await Promise.all([
  readFile(new URL('app.js', raiz), 'utf8'),
  readFile(new URL('index.html', raiz), 'utf8'),
  readFile(new URL('app.css', raiz), 'utf8'),
  readFile(new URL('service-worker.js', raiz), 'utf8'),
  readFile(new URL('../../cm-app-v1.13.7-H.1-internal/storage.rules', import.meta.url), 'utf8'),
  readFile(new URL('../../cm-app-v1.13.7-H.1-internal/firebase.json', import.meta.url), 'utf8')
]);

test('identifica a revisão corretiva H.1 e renova o cache do PWA', () => {
  assert.match(html, /v1\.13\.7-H\.1/);
  assert.match(worker, /v1\.13\.7-homologacao-r2/);
});

test('lista permite ordenar pelos cabeçalhos e por seletor responsivo', () => {
  ['nome', 'perfil', 'divisoes', 'ativo', 'criadoEm'].forEach(campo => {
    assert.match(html, new RegExp(`data-users-sort=["']${campo}["']`));
  });
  assert.match(html, /id="ordenacao-usuarios"/);
  assert.match(app, /ordenacaoUsuarios/);
  assert.match(app, /compararUsuarios/);
  assert.match(css, /\.users-mobile-sort/);
});

test('fotos são carregadas na lista e no modal de detalhes', () => {
  assert.match(app, /obterFotoUsuarioCache/);
  assert.match(app, /data-user-avatar/);
  assert.match(html, /id="modal-detalhes-usuario"/);
  assert.match(html, /id="detalhes-usuario-acoes"/);
  assert.match(app, /abrirDetalhesUsuario/);
});

test('conta desativada recebe mensagem de login amigável', () => {
  assert.match(app, /auth\/user-disabled/);
  assert.match(app, /Este acesso está desativado/);
});

test('regras do Storage permitem foto ao titular e leitura administrativa', () => {
  assert.match(firebase, /"storage"/);
  assert.match(storage, /match \/usuarios\/\{uid\}\/perfil\/avatar/);
  assert.match(storage, /request\.auth\.uid == uid \|\| adminOuGestor\(\)/);
  assert.match(storage, /request\.resource\.size <= 2 \* 1024 \* 1024/);
  assert.match(storage, /request\.resource\.contentType\.matches\('image\/\.\*'\)/);
});
