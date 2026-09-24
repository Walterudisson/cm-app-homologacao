import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const [app, html, css, config, servico, worker, regras, backend] = await Promise.all([
  readFile(new URL('app.js', raiz), 'utf8'),
  readFile(new URL('index.html', raiz), 'utf8'),
  readFile(new URL('app.css', raiz), 'utf8'),
  readFile(new URL('js/config/firebase.js', raiz), 'utf8'),
  readFile(new URL('js/services/usuarios.service.js', raiz), 'utf8'),
  readFile(new URL('service-worker.js', raiz), 'utf8'),
  readFile(new URL('../../cm-app-v1.13.9-internal/firestore.rules', import.meta.url), 'utf8'),
  readFile(new URL('../../cm-app-v1.13.9-internal/functions/index.js', import.meta.url), 'utf8')
]);

test('usa Cloud Functions no projeto regional e remove cadastro privilegiado do navegador', () => {
  assert.match(config, /getFunctions\(app, ["']southamerica-east1["']\)/);
  assert.match(servico, /criarUsuarioSeguro/);
  assert.match(app, /await criarUsuarioSeguro/);
  assert.doesNotMatch(app, /createUserWithEmailAndPassword|authSecundario/);
  assert.match(worker, /firebase-functions\.js/);
});

test('backend limita operações a Administradores ativos e preserva histórico', () => {
  assert.match(backend, /usuario\?\.perfil !== 'admin' \|\| usuario\?\.ativo === false/);
  assert.match(backend, /auth\.createUser/);
  assert.match(backend, /auth\.updateUser\(uid, \{ disabled: true \}\)/);
  assert.match(backend, /auth\.revokeRefreshTokens\(uid\)/);
  assert.match(backend, /usuario_desativado/);
  assert.match(backend, /usuario_reativado/);
  assert.doesNotMatch(backend, /deleteUser\(uid\)/);
});

test('regras bloqueiam clientes inativos e reservam mutações ao backend', () => {
  assert.match(regras, /function usuarioAtivo\(\)/);
  assert.match(regras, /data\.get\('ativo', true\) != false/);
  assert.match(regras, /allow create: if false/);
  assert.match(regras, /allow delete: if false/);
  assert.match(regras, /match \/auditoriaAcessos\/\{eventoId\}/);
});

test('Gestão de Usuários possui indicadores, filtros, status e paginação', () => {
  ['usuarios-total', 'usuarios-ativos', 'usuarios-inativos', 'usuarios-conferentes',
    'filtro-perfil-usuarios', 'usuarios-paginacao', 'btn-novo-usuario']
    .forEach(id => assert.match(html, new RegExp(`id=["']${id}["']`)));
  assert.match(html, /data-users-status="ativos"/);
  assert.match(app, /filtroStatusUsuarios/);
  assert.match(app, /alterarAcessoUsuario/);
  assert.match(css, /\.users-table-header, \.user-row/);
  assert.match(css, /@media \(max-width: 700px\)/);
});

test('gestor consulta e Administrador mantém as ações de acesso', () => {
  assert.match(app, /btnNovoUsuario\?\.classList\.toggle\('hidden', usuarioLogado\.perfil !== 'admin'\)/);
  assert.match(app, /usuarioLogado\.perfil === 'admin'[\s\S]*abrirModalEdicao/);
  assert.match(app, /Visualização disponível; alterações são exclusivas de Administradores/);
  assert.match(backend, /O Administrador não pode desativar a própria conta|Use Meu perfil/);
});
