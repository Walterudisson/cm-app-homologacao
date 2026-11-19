import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { modulosDoUsuario, paginaInicialUsuario, podeAbrirPagina } from '../js/platform/modules.js';

test('usuário legado entra direto em Patrimônios; Administrador escolhe entre módulos', () => {
  assert.equal(paginaInicialUsuario({ perfil: 'conferente' }), 'dashboard');
  assert.equal(paginaInicialUsuario({ perfil: 'gestor' }), 'dashboard');
  assert.equal(paginaInicialUsuario({ perfil: 'admin' }), 'modulos');
  assert.deepEqual(modulosDoUsuario({ perfil: 'gestor' }).map(item => item.id), ['patrimonios']);
});

test('atribuição explícita controla a entrada, inclusive lista vazia e campo inválido', () => {
  for (const modulos of [[], null, 'dsips', ['desconhecido']]) {
    const usuario = { perfil: 'gestor', modulos };
    assert.deepEqual(modulosDoUsuario(usuario), []);
    assert.equal(paginaInicialUsuario(usuario), 'modulos');
    assert.equal(podeAbrirPagina(usuario, 'dashboard'), false);
    assert.equal(podeAbrirPagina(usuario, 'perfil'), true);
  }
});

test('acesso DSIPS não permite abrir qualquer tela de Patrimônios', () => {
  const usuario = { perfil: 'conferente', modulos: ['dsips'] };
  assert.equal(paginaInicialUsuario(usuario), 'dsips-inicio');
  assert.equal(podeAbrirPagina(usuario, 'dsips-inicio'), true);
  for (const id of ['dashboard', 'scanner', 'lista', 'inventarios', 'transferencias']) assert.equal(podeAbrirPagina(usuario, id), false);
});

test('dois módulos abrem seleção e Administrador não perde acesso por atribuição explícita', () => {
  assert.equal(paginaInicialUsuario({ perfil: 'gestor', modulos: ['patrimonios', 'dsips'] }), 'modulos');
  assert.deepEqual(modulosDoUsuario({ perfil: 'admin', modulos: [] }).map(item => item.id), ['patrimonios', 'dsips']);
  assert.equal(podeAbrirPagina({ perfil: 'conferente', modulos: ['dsips'], ativo: false }, 'dsips-inicio'), false);
});

test('bootstrap restringe consultas patrimoniais e acompanha mudanças de acesso', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(possuiPatrimonios\) \{/);
  assert.match(app, /if \(possuiPatrimonios && usuarioLogado.perfil !== 'conferente'\) iniciarOuvinteTransferencias/);
  assert.match(app, /assinaturaAcesso\(snapshot.data\(\)\) !== assinaturaInicial/);
});

test('a faixa HML reserva espaço para sidebar e cabeçalho sem alterar estilos de produção', async () => {
  const [html, css] = await Promise.all(['index.html', 'app.css'].map(path => readFile(new URL('../'+path, import.meta.url), 'utf8')));
  assert.match(html, /class="hml-env /);
  assert.match(css, /\.hml-env \.app-sidebar \{ top: var\(--env-banner-height\); height: calc\(100dvh - var\(--env-banner-height\)\)/);
  assert.match(css, /\.hml-env \.app-topbar \{ top: var\(--env-banner-height\)/);
});
