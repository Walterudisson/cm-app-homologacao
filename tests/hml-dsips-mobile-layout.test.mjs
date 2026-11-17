import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const ler = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('mobile: os filtros não conservam flex-basis vertical de 15rem e 12rem', async () => {
  const css = await ler('app.css');
  assert.match(css, /@media\s*\(max-width:\s*639px\)\s*\{\s*\.dsips-toolbar \.dsips-search-label,\s*\.dsips-toolbar \.dsips-category-label\s*\{[^}]*flex:\s*0\s+0\s+auto/);
  assert.match(css, /\.dsips-toolbar\s*\{\s*flex-direction:\s*column;\s*align-items:\s*stretch/);
});
test('tarja de homologação ocupa espaço próprio antes do cabeçalho', async () => {
  const [html, css] = await Promise.all([ler('index.html'), ler('app.css')]);
  assert.match(html, /id="cmapp-hml-banner" class="cmapp-hml-banner"/);
  assert.doesNotMatch(html, /position:fixed;top:0;left:0;right:0;z-index:9999/);
  assert.ok(html.indexOf('id="cmapp-hml-banner"') < html.indexOf('id="view-app"'));
  assert.match(css, /--hml-banner-height:\s*28px/);
  assert.match(css, /\.cmapp-hml-banner\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/);
  assert.match(css, /\.app-topbar\s*\{[^}]*top:\s*var\(--hml-banner-height\)/);
  assert.match(css, /\.app-sidebar\s*\{[^}]*top:\s*var\(--hml-banner-height\)/);
  assert.match(css, /#view-login\s*\{\s*top:\s*var\(--hml-banner-height\)/);
  assert.match(css, /\.app-offline-banner\s*\{[^}]*top:\s*calc\(var\(--hml-banner-height\) \+ var\(--topbar-height\)\)/);
});
test('atualização H.2 preserva login único e base HML', async () => {
  const [html, sw, fb, app] = await Promise.all([ler('index.html'), ler('service-worker.js'), ler('js/config/firebase.js'), ler('app.js')]);
  assert.match(sw, /v1\.13\.12-h\.2-dsips-layout/);
  assert.match(html, /app\.css\?v=1\.13\.12-h\.2/);
  assert.match(html, /app\.js\?v=1\.13\.12-h\.2/);
  assert.match(html, /<span>v1\.13\.12-H\.2<\/span>/);
  assert.match(fb, /projectId: "cm-app-homologacao"/);
  assert.match(app, /!podeConsultarMateriaisDsips\(usuarioLogado\)/);
  assert.doesNotMatch(html, /id="pilot-login"/);
});
