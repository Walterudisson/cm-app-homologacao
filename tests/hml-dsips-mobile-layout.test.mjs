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
  assert.match(sw, /v1\.13\.38-h\.2-gabinete/);
  assert.match(html, /app\.css\?v=1\.13\.38-h\.2/);
  assert.match(html, /app\.js\?v=1\.13\.38-h\.2/);
  assert.match(html, /<span>v1\.13\.38-H\.2<\/span>/);
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


test('login apresenta identidade geral CM APP sem alterar formulário institucional', async () => {
  const html = await ler('index.html');
  const css = await ler('app.css');
  const login = html.slice(html.indexOf('id="view-login"'), html.indexOf('id="view-app"'));
  assert.match(login, /<h1[^>]*>CM APP<\/h1>/);
  assert.match(login, /class="brand-mark login-brand-mark" aria-hidden="true">CM<\/div>/);
  assert.match(login, /Plataforma da Casa Militar/);
  assert.doesNotMatch(login, /Patrimônio CM|dados patrimoniais/);
  for (const id of ['form-login','login-email','login-senha','btn-submit-login','login-offline','login-erro']) assert.ok(login.includes('id="'+id+'"'));
  assert.match(css, /\.login-brand-mark\s*\{/);
});


test('menus expansíveis conservam a estrutura, rotas, acesso e versão do controlador', async () => {
  const [html,nav,app,css]=await Promise.all([ler('index.html'),ler('js/ui/navigation.js'),ler('app.js'),ler('app.css')]);
  for(const [key,ids] of [
    ['patrimonio',['dashboard','scanner','lista','inventarios','transferencias']],
    ['gestao',['usuarios','divisoes','funcoes']],
    ['dsips',['dsips-inicio','dsips-materiais','dsips-cadastros','dsips-estoque','dsips-cautelas','dsips-posse','dsips-historico']]
  ]){
    const grupo=html.match(new RegExp('data-nav-group="'+key+'"[^>]*>[\\s\\S]*?<div id="sidebar-submenu-'+key+'"[^>]*>([\\s\\S]*?)</div>'));
    assert.ok(grupo,key);
    assert.match(grupo[0],new RegExp('aria-controls="sidebar-submenu-'+key+'"'));
    assert.deepEqual([...grupo[1].matchAll(/data-nav-page="([^"]+)"/g)].map(m=>m[1]),ids);
  }
  assert.match(html,/data-nav-group="gestao" data-perfis="admin,gestor"/);
  assert.match(html,/class="sidebar-module hidden" data-nav-group="dsips" id="dsips-section-label"/);
  assert.match(html,/data-nav-group-toggle="patrimonio"[^>]*aria-expanded="true"/);
  assert.match(html,/data-nav-group-toggle="gestao"[^>]*aria-expanded="false"/);
  assert.match(html,/id="sidebar-submenu-dsips" class="sidebar-module-panel" hidden/);
  assert.match(app,/navigation\.js\?v=1\.13\.38-h\.1/);
  assert.match(app,/getElementById\('dsips-section-label'\)\?\.classList.toggle\('hidden', !podeConsultarDsips\)/);
  assert.match(nav,/painel\.hidden = !aberto/);
  assert.match(css,/\.sidebar-module-panel\[hidden\]\s*\{\s*display: none !important/);
  assert.match(css,/\.sidebar-module-toggle\[aria-expanded="true"\]/);
});

test('clique expande um grupo por vez sem navegar, e página ativa reabre seu grupo',async()=>{
  const {inicializarNavegacao,ativarPagina,atualizarAcessoNavegacao}=await import('../js/ui/navigation.js');
  function no(dataset={},classes=[]){
    const valores=new Set(classes), attrs=new Map(), eventos=new Map();
    return {dataset,hidden:false,textContent:'',
      classList:{contains:k=>valores.has(k),add:k=>valores.add(k),remove:k=>valores.delete(k),toggle:(k,v)=>{const abrir=v===undefined?!valores.has(k):Boolean(v);if(abrir)valores.add(k);else valores.delete(k);return abrir;}},
      setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),removeAttribute:k=>attrs.delete(k),
      addEventListener:(k,fn)=>eventos.set(k,fn),click:()=>eventos.get('click')?.()
    };
  }
  function grupo(key,pagina,aberto){
    const g=no({navGroup:key}),b=no({navGroupToggle:key}),p=no(),filho=no({navPage:pagina});
    b.setAttribute('aria-expanded',String(aberto));p.hidden=!aberto;b.closest=()=>g;
    g.querySelector=s=>s==='[data-nav-group-toggle]'?b:p;
    g.querySelectorAll=()=>[filho];return {g,b,p,filho};
  }
  const grupos=[grupo('patrimonio','dashboard',true),grupo('gestao','usuarios',false),grupo('dsips','dsips-posse',false)];
  grupos[1].g.dataset.perfis='admin,gestor';
  let destino=null;
  const oldDoc=globalThis.document,oldWin=globalThis.window;
  const oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try{
    globalThis.document={body:no(),getElementById:id=>no(),addEventListener:()=>{},
      querySelectorAll:s=>s==='[data-nav-group]'?grupos.map(x=>x.g):s==='[data-nav-group-toggle]'?grupos.map(x=>x.b):s==='[data-nav-page]'?grupos.map(x=>x.filho):s==='[data-perfis]'?[grupos[1].g]:[]};
    globalThis.window={matchMedia:()=>({matches:false})};
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{}}});
    inicializarNavegacao(v=>{destino=v;});
    grupos[2].b.click();
    assert.equal(destino,null);assert.equal(grupos[0].p.hidden,true);assert.equal(grupos[2].p.hidden,false);
    grupos[2].b.click();assert.equal(grupos[2].p.hidden,true);
    ativarPagina('dsips-posse');
    assert.equal(grupos[2].p.hidden,false);assert.equal(grupos[2].b.classList.contains('has-active-page'),true);
    assert.equal(grupos[2].filho.getAttribute('aria-current'),'page');
    atualizarAcessoNavegacao('conferente');
    assert.equal(grupos[1].g.classList.contains('hidden'),true);
    grupos[1].b.click();assert.equal(grupos[1].p.hidden,true);
    grupos[2].filho.click();assert.equal(destino,'dsips-posse');
  }finally{
    if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
    if(oldWin===undefined)delete globalThis.window;else globalThis.window=oldWin;
    if(oldStorage)Object.defineProperty(globalThis,'localStorage',oldStorage);else delete globalThis.localStorage;
  }
});
