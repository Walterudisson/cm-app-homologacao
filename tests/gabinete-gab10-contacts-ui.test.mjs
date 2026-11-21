import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {criarCadastroGabineteEmMemoria} from '../js/modules/gabinete/cadastro-model.js';
import {criarOrgaosGabineteEmMemoria} from '../js/modules/gabinete/orgaos-model.js';
import {criarDiretorioGabinete} from '../js/modules/gabinete/diretorio-referencias.js';
import {criarAgendaGabinete} from '../js/modules/gabinete/agenda-ui.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../app.css',import.meta.url),'utf8');
function montar(){
  const dom=new JSDOM(html,{url:'https://example.invalid'});
  const anterior={document:globalThis.document,localStorage:globalThis.localStorage};
  globalThis.document=dom.window.document;
  globalThis.localStorage=dom.window.localStorage;
  const proto=dom.window.HTMLDialogElement.prototype;
  proto.showModal=function(){this.setAttribute('open','');};
  proto.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'));};
  let autorizado=true;
  const usuario={uid:'teste-gab10',nome:'Pessoa Exemplo Teste',email:'teste@example.invalid'};
  const cadastro=criarCadastroGabineteEmMemoria({hoje:()=>'2026-11-21'});
  const orgaos=criarOrgaosGabineteEmMemoria({hoje:()=>'2026-11-21'});
  orgaos.iniciar(usuario.uid);
  const diretorio=criarDiretorioGabinete({cadastro,orgaos,obterUsuario:()=>usuario});
  diretorio.iniciar(usuario.uid);
  const agenda=criarAgendaGabinete({
    obterUsuario:()=>usuario,podeConsultar:()=>autorizado,
    notificar:()=>{},armazenamento:diretorio
  });
  agenda.inicializar();agenda.renderizar();
  const d=dom.window.document,id=n=>d.getElementById(n);
  return {dom,d,id,agenda,diretorio,
    negar(){autorizado=false;agenda.renderizar();},
    limpar(){agenda.limpar();globalThis.document=anterior.document;globalThis.localStorage=anterior.localStorage;dom.window.close();}
  };
}
test('GAB-10 mostra diretório único com categorias e contagens consistentes',()=>{
  const f=montar();
  try{
    const total=f.diretorio.listar().filter(c=>c.ativo);
    assert.equal(f.d.querySelectorAll('#gabinete-lista-contatos .cm-gab-contact').length,total.length);
    assert.equal(f.d.querySelector('[data-gab-contagem="todos"]').textContent,String(total.length));
    f.d.querySelector('[data-gab-categoria="ramal"]').click();
    assert.equal(f.id('gabinete-tipo-contato').value,'ramal');
    assert.equal(f.d.querySelectorAll('#gabinete-lista-contatos .cm-gab-contact').length,total.filter(c=>c.tipo==='ramal').length);
    assert.equal(f.d.querySelector('[data-gab-categoria="ramal"]').getAttribute('aria-pressed'),'true');
    f.d.querySelector('[data-gab-categoria="externo"]').click();
    assert.equal(f.d.querySelectorAll('#gabinete-lista-contatos .cm-gab-contact').length,total.filter(c=>c.tipo==='externo').length);
  }finally{f.limpar();}
});
test('GAB-10 alterna grade/lista e aplica busca e categoria mobile',()=>{
  const f=montar();
  try{
    f.id('gabinete-ver-lista').click();
    assert.equal(f.id('gabinete-lista-contatos').dataset.view,'list');
    assert.equal(f.id('gabinete-ver-lista').getAttribute('aria-pressed'),'true');
    f.id('gabinete-ver-grade').click();
    assert.equal(f.id('gabinete-lista-contatos').dataset.view,'grid');
    f.id('gabinete-toggle-categorias').click();
    assert.equal(f.id('gabinete-agenda-sidebar').dataset.open,'true');
    f.d.querySelector('[data-gab-categoria="pessoa"]').click();
    assert.equal(f.id('gabinete-agenda-sidebar').dataset.open,'false');
    assert.equal(f.id('gabinete-toggle-categorias').getAttribute('aria-expanded'),'false');
    f.id('gabinete-tipo-contato').value='ramal';
    f.id('gabinete-tipo-contato').dispatchEvent(new f.dom.window.Event('change'));
    assert.equal(f.d.querySelector('[data-gab-categoria="ramal"]').getAttribute('aria-pressed'),'true');
    f.agenda.pesquisar('Recepção exemplo');
    assert.equal(f.d.querySelectorAll('#gabinete-lista-contatos .cm-gab-contact').length,1);
  }finally{f.limpar();}
});
test('GAB-10 mantém favoritos sem duplicar cadastros e abre ficha autorizada',()=>{
  const f=montar();
  try{
    const estrela=f.d.querySelector('.cm-gab-contact[data-id="demo-pessoa-001"] .cm-gab-contact-star');
    assert.ok(estrela);
    estrela.click();
    assert.equal(f.d.querySelector('[data-gab-contagem="favoritos"]').textContent,'1');
    f.id('gabinete-filtrar-favoritos').click();
    assert.equal(f.d.querySelectorAll('#gabinete-lista-contatos .cm-gab-contact').length,1);
    assert.equal(f.id('gabinete-filtrar-favoritos').getAttribute('aria-pressed'),'true');
    f.d.querySelector('.cm-gab-contact-body').click();
    assert.equal(f.id('gabinete-ficha-dialog').open,true);
    assert.equal(f.id('gabinete-ficha-titulo').textContent,'SGT Exemplo A');
    f.id('gabinete-ficha-fechar').click();
    assert.equal(f.id('gabinete-ficha-dialog').open,false);
  }finally{f.limpar();}
});
test('GAB-10 revogação oculta contatos, contagens, ficha e não expõe telefone particular',()=>{
  const f=montar();
  try{
    f.agenda.abrirContato('demo-pessoa-001');
    assert.equal(f.id('gabinete-ficha-dialog').open,true);
    f.negar();
    assert.equal(f.id('gabinete-ficha-dialog').open,false);
    assert.equal(f.d.querySelectorAll('#gabinete-lista-contatos .cm-gab-contact').length,0);
    assert.equal(f.id('gabinete-total-contatos').textContent,'');
    assert.equal(f.d.querySelector('[data-gab-contagem="todos"]').textContent,'0');
    assert.equal(f.d.querySelector('[data-gab-contagem="favoritos"]').textContent,'0');
    assert.equal(f.id('gabinete-ficha-campos').textContent.includes('Telefone particular'),false);
  }finally{f.limpar();}
});

test('GAB-10 H.2 preserva duas colunas de cards no celular e lista de largura total',()=>{
  const inicio=css.lastIndexOf('@media(max-width:540px){');
  const fim=css.indexOf('@media(prefers-reduced-motion:reduce)',inicio);
  assert.ok(inicio>=0 && fim>inicio,'Regra responsiva não encontrada');
  const mobile=css.slice(inicio,fim);
  assert.ok(mobile.includes('#sec-gabinete-agenda .cm-gab-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'),'Grade móvel deve ter duas colunas');
  assert.ok(mobile.includes('#sec-gabinete-agenda .cm-gab-list[data-view="list"]{grid-template-columns:minmax(0,1fr)}'),'Modo lista deve ocupar toda a largura');
  assert.match(mobile,/cm-gab-contact-actions \.cm-gab-action\{[^}]*min-height:40px/,'Áreas de toque devem ser mantidas');
  assert.match(mobile,/\.cm-gab-contact-name\{[^}]*overflow-wrap:anywhere/,'Nomes longos não podem criar rolagem horizontal');
});
