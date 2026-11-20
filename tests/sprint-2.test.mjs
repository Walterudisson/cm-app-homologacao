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
  assert.match(app, /if\(modulosDoUsuario\(usuarioLogado\).some\(m=>m.id==='patrimonios'\)\)\{/);
  assert.match(app, /if \(\['admin','gestor'\].includes\(usuarioLogado.perfil\) && modulosDoUsuario\(usuarioLogado\).some\(m=>m.id==='patrimonios'\)\) iniciarOuvinteTransferencias/);
  assert.match(app, /cancelarVigiaAcesso=onSnapshot\(referencia,/);assert.match(app,/decidirMudancaAcesso\(inicial,snapshot.exists\(\)\?snapshot.data\(\):null/);
});

test('a faixa HML reserva espaço para sidebar e cabeçalho', async () => {
  const [html, css] = await Promise.all(['index.html', 'app.css'].map(path => readFile(new URL('../'+path, import.meta.url), 'utf8')));
  assert.match(html, /id="cmapp-hml-banner" class="cmapp-hml-banner"/);
  assert.match(css, /\.app-sidebar\s*\{[^}]*top:\s*var\(--hml-banner-height\);[^}]*height:\s*calc\(100dvh - var\(--hml-banner-height\)\)/);
  assert.match(css, /\.app-topbar\s*\{[^}]*top:\s*var\(--hml-banner-height\)/);
});
