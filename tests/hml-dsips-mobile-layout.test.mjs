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
  assert.match(sw, /v1\.13\.16-h\.2-dsips-devolucoes/);
  assert.match(html, /app\.css\?v=1\.13\.16-h\.2/);
  assert.match(html, /app\.js\?v=1\.13\.16-h\.2/);
  assert.match(html, /<span>v1\.13\.16-H\.2<\/span>/);
  assert.match(fb, /projectId: "cm-app-homologacao"/);
  assert.match(app, /!podeConsultarMateriaisDsips\(usuarioLogado\)/);
  assert.doesNotMatch(html, /id="pilot-login"/);
});

test('atalho Ir para o conteúdo é invisível fora do foco, mas aparece para navegação por teclado', async () => {
  const css = await ler('app.css');
  const html = await ler('index.html');
  assert.match(html, /class="skip-link">Ir para o conteúdo<\/a>/);
  assert.match(css, /\.skip-link:not\(:focus\)\s*\{\s*clip-path:\s*inset\(50%\)/);
  assert.match(css, /\.skip-link:focus\s*\{[^}]*clip-path:\s*none/);
});

test('Painel é menu do Patrimônio, continua início e conserva indicadores existentes', async () => {
  const [html, nav, app] = await Promise.all([ler('index.html'), ler('js/ui/navigation.js'), ler('app.js')]);
  const secao = html.indexOf('<span class="sidebar-section-label sidebar-label">Patrimônio</span>');
  const painel = html.indexOf('id="tab-btn-dashboard"');
  const leitura = html.indexOf('id="tab-btn-scanner"');
  const dsips = html.indexOf('id="dsips-section-label"');
  assert.ok(secao > 0 && painel > secao && leitura > painel && dsips > leitura);
  assert.equal((html.match(/<span class="sidebar-section-label sidebar-label">Patrimônio<\/span>/g) || []).length, 1);
  assert.doesNotMatch(html, /<span class="sidebar-section-label sidebar-label">Visão geral<\/span>/);
  assert.match(nav, /dashboard: \{ titulo: 'Painel', trilha: \['CM APP', 'Patrimônio', 'Painel'\] \}/);
  assert.match(app, /await alternarAba\('dashboard', \{ substituirHistorico: true \}\)/);
  assert.match(html, /id="dash-total"/);
  assert.match(html, /id="dash-localizados"/);
  assert.match(html, /id="dash-pendentes"/);
  assert.match(html, /id="dash-aguardando"/);
});

test('Fila de aprovação é funcionalidade patrimonial sem mudar o acesso admin/gestor', async () => {
  const [html,nav,app] = await Promise.all([ler('index.html'),ler('js/ui/navigation.js'),ler('app.js')]);
  const inicioMenu = html.indexOf('<nav class="sidebar-nav">');
  const finalMenu = html.indexOf('</nav>',inicioMenu);
  const menu = html.slice(inicioMenu,finalMenu);
  const patrimonio = menu.indexOf('>Patrimônio</span>');
  const painel = menu.indexOf('id="tab-btn-dashboard"');
  const inventarios = menu.indexOf('id="tab-btn-inventarios"');
  const fila = menu.indexOf('id="tab-btn-transferencias"');
  const gestao = menu.indexOf('>Gestão</span>');
  const usuarios = menu.indexOf('id="tab-btn-usuarios"');
  assert.ok(patrimonio>=0 && patrimonio<painel && painel<inventarios && inventarios<fila && fila<gestao && gestao<usuarios);
  assert.equal((menu.match(/id="tab-btn-transferencias"/g)||[]).length,1);
  assert.match(menu,/id="tab-btn-transferencias"[^>]*data-perfis="admin,gestor"/);
  assert.match(menu,/id="badge-fila-count"/);
  assert.match(nav,/transferencias: \{ titulo: 'Fila de aprovação', trilha: \['CM APP', 'Patrimônio', 'Fila de aprovação'\] \}/);
  assert.match(app,/usuarioLogado\.perfil === 'conferente'/);
  assert.match(app,/btnTransf\.classList\.add\('hidden'\)/);
  assert.match(app,/await alternarAba\('dashboard', \{ substituirHistorico: true \}\)/);
});
