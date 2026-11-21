import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {listarIdsPaginas} from '../js/platform/modules.js';
import {podeNavegarLegado,sincronizarMenuAutorizado} from '../js/platform/acesso-sessao.js';
import {renderizarCentral} from '../js/ui/central-trabalho.js';
import {inicializarNavegacao,ativarPagina,fecharCamadasNavegacao} from '../js/ui/navigation.js';
import {conferirVersaoAtual} from './contrato-versao.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const patr=['dashboard','scanner','lista','inventarios'];
const ds=['dsips-inicio','dsips-cadastros','dsips-estoque','dsips-cautelas','dsips-posse'];
const gest=['usuarios','divisoes'];
const matriz=[
 {u:{perfil:'admin'},pages:['modulos',...patr,'transferencias',...gest,'funcoes','gabinete-painel','gabinete-agenda','gabinete-ramais',...ds,'dsips-historico'],central:['patrimonios','dsips']},
 {u:{perfil:'gestor',modulos:['dsips']},pages:['modulos',...gest,...ds,'dsips-historico'],central:['dsips']},
 {u:{perfil:'gestor'},pages:['modulos',...patr,'transferencias',...gest],central:['patrimonios']},
 {u:{perfil:'conferente',modulos:['dsips']},pages:['modulos',...ds],central:['dsips']},
 {u:{perfil:'conferente',modulos:['patrimonios']},pages:['modulos',...patr],central:['patrimonios']},
 {u:{perfil:'usuario',modulos:['dsips','patrimonios']},pages:[],central:[]},
 {u:{perfil:'gestor',modulos:[]},pages:gest,central:[]},
 {u:{perfil:'admin',ativo:false},pages:[],central:[]},
 {u:{perfil:'admin',autorizacaoVersao:2},pages:[],central:[]}
];
function ambiente(desktop=false){
 const dom=new JSDOM(html,{url:'https://teste.invalid/'});const d=dom.window.document;
 const orig={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage};
 dom.window.matchMedia=()=>({matches:desktop});
 Object.assign(globalThis,{document:d,window:dom.window,localStorage:dom.window.localStorage});
 return {d,dom,id:n=>d.getElementById(n),fechar(){Object.assign(globalThis,orig);dom.window.close();}};
}
const visiveis=d=>[...d.querySelectorAll('[data-nav-page]')].filter(b=>!b.classList.contains('hidden')).map(b=>b.dataset.navPage).sort();
test('QA-03.01 matriz de perfis valida menu, Central e restauração na mesma página',()=>{
 const f=ambiente();try{for(const {u,pages,central} of [...matriz,...matriz.slice().reverse()]){
   sincronizarMenuAutorizado(f.d,u);
   assert.deepEqual(visiveis(f.d),pages.slice().sort(),JSON.stringify(u));
   for(const g of f.d.querySelectorAll('[data-nav-group]'))assert.equal(g.classList.contains('hidden'),![...g.querySelectorAll('[data-nav-page]')].some(b=>!b.classList.contains('hidden')),g.dataset.navGroup);
   renderizarCentral(f.id('central-modulos-grid'),u,()=>{});
   assert.deepEqual([...f.id('central-modulos-grid').children].map(x=>x.dataset.modulo),central);
   assert.ok(f.id('tab-btn-dsips-materiais').classList.contains('hidden'));
 }}finally{f.fechar();}
});
test('QA-03.02 Central renderiza somente destinos válidos e cliques passam pela guarda',()=>{
 const f=ambiente();try{for(const {u,central} of matriz){const abertas=[];renderizarCentral(f.id('central-modulos-grid'),u,aba=>{assert.ok(podeNavegarLegado(u,aba));abertas.push(aba);});for(const b of f.id('central-modulos-grid').children)b.click();assert.deepEqual(abertas,central.map(m=>m==='dsips'?'dsips-inicio':'dashboard'));}}finally{f.fechar();}
});
test('QA-03.03 menu mobile fecha ao navegar e ao usar Escape',()=>{
 const f=ambiente();try{const u={perfil:'admin'},rotas=[],camadas=[];sincronizarMenuAutorizado(f.d,u);inicializarNavegacao(aba=>{if(podeNavegarLegado(u,aba)){rotas.push(aba);ativarPagina(aba);}}, {aoAbrirCamada:c=>camadas.push(c)});
 f.id('btn-menu').click();assert.ok(f.d.body.classList.contains('sidebar-open'));assert.equal(f.id('btn-menu').getAttribute('aria-expanded'),'true');
 f.id('tab-btn-dsips-cautelas').click();assert.deepEqual(rotas,['dsips-cautelas']);assert.ok(!f.d.body.classList.contains('sidebar-open'));assert.equal(f.id('tab-btn-dsips-cautelas').getAttribute('aria-current'),'page');
 f.id('btn-menu').click();f.d.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.ok(!f.d.body.classList.contains('sidebar-open'));assert.deepEqual(camadas,['menu','menu']);
 }finally{f.fechar();}
});
test('QA-03.04 desktop alterna menu, breadcrumb e aba ativa sem perder grupos',()=>{
 const f=ambiente(true);try{sincronizarMenuAutorizado(f.d,{perfil:'admin'});inicializarNavegacao(()=>{});f.id('btn-menu').click();assert.ok(f.d.body.classList.contains('sidebar-collapsed'));f.id('btn-menu').click();assert.ok(!f.d.body.classList.contains('sidebar-collapsed'));for(const [p,t] of [['dashboard','Painel'],['usuarios','Gestão de usuários'],['dsips-estoque','Estoque DSIPS']]){ativarPagina(p);assert.equal(f.id('page-title').textContent,t);assert.equal(f.id('tab-btn-'+p).getAttribute('aria-current'),'page');assert.equal(f.d.querySelectorAll('[data-nav-page][aria-current=page]').length,1);}fecharCamadasNavegacao();}finally{f.fechar();}
});
test('QA-03.05 todas as rotas possuem seção única; perfil básico e V2 ficam isolados',()=>{
 const f=ambiente();try{for(const id of listarIdsPaginas())assert.equal(f.d.querySelectorAll('#sec-'+id).length,1,id);for(const id of listarIdsPaginas()){assert.equal(podeNavegarLegado({perfil:'usuario',modulos:['dsips']},id),id==='perfil',id);assert.equal(podeNavegarLegado({perfil:'admin',autorizacaoVersao:2},id),false,id);}}finally{f.fechar();}
});
test('QA-03.06 release mantém HML e precache de navegação',async()=>{await conferirVersaoAtual();const [a,w,c]=await Promise.all(['app.js','service-worker.js','js/config/firebase.js'].map(p=>readFile(new URL('../'+p,import.meta.url),'utf8')));assert.match(a,/sincronizarMenuAutorizado\(document,usuarioLogado\)/);assert.match(w,/js\/platform\/acesso-sessao\.js/);assert.match(c,/projectId: "cm-app-homologacao"/);assert.doesNotMatch(c,/projectId: "patrimonioscm"/);});

test('Gabinete abre Painel, Agenda e Ramais no menu do CMAPP', () => {
 const f = ambiente(true);
 try {
   const usuario = { perfil: 'admin' };
   sincronizarMenuAutorizado(f.d, usuario);
   inicializarNavegacao(ativarPagina);
   f.d.querySelector('[data-nav-group-toggle="gabinete"]').click();
   assert.equal(f.id('sidebar-submenu-gabinete').hidden, false);
   for (const [pagina, titulo] of [['painel', 'Painel do Gabinete'], ['agenda', 'Agenda Telefônica'], ['ramais', 'Ramais']]) {
     const botao = f.id('tab-btn-gabinete-' + pagina);
     botao.click();
     assert.equal(botao.getAttribute('aria-current'), 'page');
     assert.equal(f.id('page-title').textContent, titulo);
     assert.ok(f.id('sec-gabinete-' + pagina));
   }
 } finally { f.fechar(); }
});
