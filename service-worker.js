const VERSAO = 'v1.13.44-h.2-loginfix';
const CACHE_SHELL = `cmapp-shell-${VERSAO}`;
const CACHE_RUNTIME = `cmapp-runtime-${VERSAO}`;
// Emergência HML: somente releases cujo service.js incompleto foi confirmado.
const SHELLS_COM_FALHA = new Set([
  'cmapp-shell-v1.13.34-h.1-perf-cache',
  'cmapp-shell-v1.13.35-h.1-qa-acesso',
  'cmapp-shell-v1.13.36-h.1-qa-pwa',
  'cmapp-shell-v1.13.37-h.1-qa-integrada'
]);
async function shellsDoEscopo(){
  const nomes=await caches.keys(),validos=[];
  for(const nome of nomes){
    if(!nome.startsWith('cmapp-shell-')||nome===CACHE_SHELL)continue;
    const cache=await caches.open(nome);
    if(await cache.match(new URL('./index.html',self.registration.scope).href)
      ||await cache.match(new URL('./app.js',self.registration.scope).href)
      ||await cache.match(new URL('./',self.registration.scope).href))validos.push(nome);
  }
  return validos;
}
async function legadosComFalha(){return (await shellsDoEscopo()).some(n=>SHELLS_COM_FALHA.has(n));}

const ARQUIVOS_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './app.css',
  './app.js',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './js/config/firebase.js',
  './js/platform/modules.js',
  './js/platform/pages.js',
  './js/modules/patrimonios/pages.js',
  './js/platform/acesso-sessao.js',
  './js/modules/patrimonios/module.js',
  './js/modules/dsips/module.js',
  './js/modules/gabinete/module.js',
  './js/modules/gabinete/agenda-model.js',
  './js/modules/gabinete/agenda-ui.js',
  './js/modules/gabinete/aniversarios-model.js',
  './js/modules/gabinete/aniversarios-ui.js',
  './js/modules/gabinete/cadastro-model.js',
  './js/modules/gabinete/cadastro-ui.js',
  './js/modules/gabinete/orgaos-model.js',
  './js/modules/gabinete/orgaos-ui.js',
  './js/modules/gabinete/diretorio-referencias.js',
  './js/modules/gestao/matriz-acessos-model.js',
  './js/modules/gestao/matriz-acessos-ui.js',
  './js/modules/dsips/service.js',
  './js/modules/dsips/consulta-materiais-model.js',
  './js/modules/dsips/consulta-materiais-ui.js',
  './js/modules/dsips/cadastros-model.js',
  './js/modules/dsips/cadastros-ui.js',
  './js/modules/dsips/estoque-model.js',
  './js/modules/dsips/estoque-ui.js',
  './js/modules/dsips/ajustes-ui.js',
  './js/modules/dsips/ajustes-model.js',
  './js/modules/dsips/registro-cautelas-model.js',
  './js/modules/dsips/registro-cautelas-ui.js',
  './js/modules/dsips/pdv-model.js',
  './js/modules/dsips/cautelas-model.js',
  './js/modules/dsips/devolucoes-model.js',
  './js/modules/dsips/posse-model.js',
  './js/modules/dsips/posse-ui.js',
  './js/modules/dsips/historico-model.js',
  './js/modules/dsips/historico-ui.js',
  './js/controllers/camera.controller.js',
  './js/core/camera.js',
  './js/core/movimentacao.js',
  './js/core/escopo.js',
  './js/core/paginacao.js',
  './js/core/cache-consultas.js',
  './js/core/relacao.js',
  './js/core/perfil.js',
  './js/core/inventario-id.js',
  './js/core/permissoes.js',
  './js/services/divisoes.service.js',
  './js/services/funcoes.service.js',
  './js/services/inventarios.service.js',
  './js/services/perfil.service.js',
  './js/services/usuarios.service.js',
  './js/ui/feedback.js',
  './js/ui/autocomplete.js',
  './js/ui/paginador.js',
  './js/ui/navigation.js',
  './js/ui/central-trabalho.js',
  './js/modules/dsips/painel-model.js',
  './js/modules/dsips/painel-ui.js',
  './js/modules/dsips/painel-bi-ui.js',
  './js/modules/dsips/painel-bi-model.js',
  './js/pwa.js'
];

const DEPENDENCIAS_EXTERNAS = [
  'https://cdn.tailwindcss.com/',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://unpkg.com/tesseract.js@v5.1.0/dist/tesseract.min.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js',
  'https://cdn.jsdelivr.net/npm/driver.js@1.5.0/dist/driver.js.iife.js',
  'https://cdn.jsdelivr.net/npm/driver.js@1.5.0/dist/driver.css'
];

const HOSTS_ESTATICOS = new Set(['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'unpkg.com', 'www.gstatic.com']);

async function armazenarDependenciasExternas() {
  const cache = await caches.open(CACHE_RUNTIME);
  await Promise.allSettled(DEPENDENCIAS_EXTERNAS.map(async url => {
    const resposta = await fetch(url, { cache: 'reload' });
    if (resposta.ok || resposta.type === 'opaque') await cache.put(url, resposta);
  }));
}

self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL);
    await cache.addAll(ARQUIVOS_SHELL.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' })));
    await armazenarDependenciasExternas();
    // Só troca automaticamente depois de instalar todos os recursos locais.
    // Atualizações normais continuam dependendo do aceite ou do fechamento das janelas.
    if(await legadosComFalha())await self.skipWaiting();
  })());
});

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const antigos=await shellsDoEscopo();
    const recuperar=antigos.some(n=>SHELLS_COM_FALHA.has(n));
    // CacheStorage é compartilhado na origem; só remover shells comprovadamente
    // deste escopo e os respectivos runtimes. Não tocar em cookies/IndexedDB.
    await Promise.all(antigos.flatMap(n=>[n,n.replace('cmapp-shell-','cmapp-runtime-')]).map(n=>caches.delete(n)));
    await self.clients.claim();
    if(recuperar){
      const janelas=await self.clients.matchAll({type:'window'});
      for(const janela of janelas){
        const url=new URL(janela.url);url.search='';url.hash='';
        if(!ENTRADAS.has(url.href))continue;
        // Não aguardar a navegação dentro do activate: o fetch da nova página
        // pode depender da conclusão da própria ativação.
        url.searchParams.set('cmapp-recovery',VERSAO);
        void janela.navigate(url.href).catch(()=>{});
      }
    }
  })());
});

self.addEventListener('message', evento => {
  if (evento.data?.tipo === 'ATIVAR_ATUALIZACAO') self.skipWaiting();
});

// O shell ativo é um snapshot local da release. O caminho canônico é
// utilizado somente para recursos explicitamente incluídos no precache.
const URLS_SHELL = new Set(ARQUIVOS_SHELL.map(path => new URL(path, self.registration.scope).href));
const ENTRADAS = new Set(['./', './index.html'].map(path => new URL(path, self.registration.scope).href));
async function respostaShell(url) {
  const cache = await caches.open(CACHE_SHELL);
  return (await cache.match(url)) || Response.error();
}
async function redePrimeiro(requisicao, fallback) {
  const cache = await caches.open(CACHE_RUNTIME);
  try {
    const resposta = await fetch(requisicao);
    if (resposta.ok) await cache.put(requisicao, resposta.clone());
    return resposta;
  } catch (_) {
    return (await cache.match(requisicao))
      || (fallback ? await respostaShell(new URL(fallback, self.registration.scope).href) : Response.error());
  }
}
async function cachePrimeiroComAtualizacao(requisicao, evento) {
  const cache = await caches.open(CACHE_RUNTIME);
  const armazenada = await cache.match(requisicao);
  const atualizacao = fetch(requisicao)
    .then(async resposta => {
      if (resposta.ok || resposta.type === 'opaque') await cache.put(requisicao, resposta.clone());
      return resposta;
    })
    .catch(() => null);
  evento.waitUntil(atualizacao.then(() => undefined));
  return armazenada || await atualizacao || Response.error();
}
self.addEventListener('fetch', evento => {
  const requisicao = evento.request;
  if (requisicao.method !== 'GET') return;
  const url = new URL(requisicao.url);
  const canonica = new URL(url.href);
  canonica.search = '';
  canonica.hash = '';
  // Rotas retiradas: nunca reutilizar respostas armazenadas do piloto.
  const retiradas=['./homologacao/gestao-acessos','./homologacao/dsips'].map(p=>new URL(p,self.registration.scope).href);
  if(retiradas.some(p=>canonica.href===p||canonica.href.startsWith(p+'/'))){
    evento.respondWith(Promise.resolve(new Response('Interface experimental desativada. Utilize o CMAPP principal.',{status:410,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})));return;
  }
  if (requisicao.mode === 'navigate') {
    // A recuperação deve sempre vir da rede, inclusive se o app estiver quebrado.
    if(canonica.href===new URL('./recuperar.html',self.registration.scope).href){
      evento.respondWith(fetch(requisicao,{cache:'no-store'}).catch(()=>new Response('Conecte-se à internet para recuperar o CMAPP.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));return;
    }
    // Não servir a tela legada para entradas V2 ou outras rotas.
    if (ENTRADAS.has(canonica.href)) evento.respondWith(respostaShell(canonica.href));
    else evento.respondWith(fetch(requisicao).catch(() => respostaShell(new URL('./offline.html', self.registration.scope).href)));
    return;
  }
  const local = url.origin === self.location.origin
    && url.href.startsWith(self.registration.scope)
    && ['script', 'style', 'worker', 'image', 'font', 'manifest'].includes(requisicao.destination);
  if (local) {
    const codigo = ['script', 'style', 'worker'].includes(requisicao.destination);
    if (URLS_SHELL.has(canonica.href)) {
      evento.respondWith(respostaShell(canonica.href));
    } else if (codigo) {
      evento.respondWith(redePrimeiro(requisicao));
    } else {
      evento.respondWith(cachePrimeiroComAtualizacao(requisicao, evento));
    }
    return;
  }
  const dependenciaEstatica = HOSTS_ESTATICOS.has(url.hostname)
    && ['script', 'style', 'worker'].includes(requisicao.destination);
  if (dependenciaEstatica) evento.respondWith(cachePrimeiroComAtualizacao(requisicao, evento));
});
