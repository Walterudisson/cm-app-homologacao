import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {criarCadastroGabineteEmMemoria} from '../js/modules/gabinete/cadastro-model.js';
import {criarOrgaosGabineteEmMemoria} from '../js/modules/gabinete/orgaos-model.js';
import {criarDiretorioGabinete} from '../js/modules/gabinete/diretorio-referencias.js';
import {criarCadastroGabineteUI} from '../js/modules/gabinete/cadastro-ui.js';
import {criarOrgaosGabineteUI} from '../js/modules/gabinete/orgaos-ui.js';
import {criarAgendaGabinete} from '../js/modules/gabinete/agenda-ui.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function montar(){
 const dom=new JSDOM(html,{url:'https://example.invalid'});
 const prevDocument=globalThis.document,prevStorage=globalThis.localStorage;
 globalThis.document=dom.window.document;
 globalThis.localStorage=dom.window.localStorage;
 const proto=dom.window.HTMLDialogElement.prototype;
 proto.showModal=function(){this.setAttribute('open','')};
 proto.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'))};
 let autorizado=true;
 const usuario={uid:'teste-gab09',nome:'Pessoa Exemplo Teste',email:'pessoa@example.invalid'};
 const base=criarCadastroGabineteEmMemoria({hoje:()=>'2026-11-21'});
 const orgaos=criarOrgaosGabineteEmMemoria({hoje:()=>'2026-11-21'});
 orgaos.iniciar(usuario.uid);
 const diretorio=criarDiretorioGabinete({cadastro:base,orgaos,obterUsuario:()=>usuario,obterFotoPropria:()=>''});
 diretorio.iniciar(usuario.uid);
 const opcoes={obterUsuario:()=>usuario,podeGerenciar:()=>autorizado,notificar:()=>{}};
 const uiOrgaos=criarOrgaosGabineteUI({orgaos,contatos:diretorio,...opcoes});
 const ui=criarCadastroGabineteUI({armazenamento:diretorio,orgaos,uiOrgaos,abrirFicha:()=>{},...opcoes});
 const agenda=criarAgendaGabinete({
   obterUsuario:()=>usuario,podeConsultar:()=>autorizado,podeGerenciar:()=>false,
   editarContato:()=>{},notificar:()=>{},armazenamento:diretorio
 });
 uiOrgaos.inicializar();ui.inicializar();ui.atualizarOpcoesVinculo();ui.renderizar();agenda.inicializar();agenda.renderizar();
 const d=dom.window.document;const id=x=>d.getElementById(x);
 return {dom,d,id,ui,uiOrgaos,agenda,diretorio,orgaos,base,
   disparar:(id_,type)=>id(id_).dispatchEvent(new dom.window.Event(type,{bubbles:true,cancelable:true})),
   negar:()=>{autorizado=false;ui.renderizar();uiOrgaos.renderizar();agenda.renderizar();},
   liberar:()=>{autorizado=true;},
   limpar:()=>{ui.limpar();uiOrgaos.limpar();agenda.limpar();
     globalThis.document=prevDocument;globalThis.localStorage=prevStorage;dom.window.close();}
 };
}
test('GAB-09 abas de cadastro acessíveis com teclado e foco',()=>{
 const x=montar();
 try{
   const a=x.id('gab-cad-aba-contatos'),b=x.id('gab-cad-aba-orgaos');
   assert.equal(a.tabIndex,0);assert.equal(b.tabIndex,-1);
   a.dispatchEvent(new x.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
   assert.equal(x.d.activeElement,b);
   assert.equal(b.getAttribute('aria-selected'),'true');
   assert.equal(a.getAttribute('aria-selected'),'false');
   assert.equal(x.id('gab-org-painel').hidden,false);
   assert.equal(x.id('gab-cad-contatos-painel').hidden,true);
   b.dispatchEvent(new x.dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
   assert.equal(x.d.activeElement,a);
   assert.equal(x.id('gab-cad-contatos-painel').hidden,false);
   a.dispatchEvent(new x.dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
   assert.equal(x.d.activeElement,b);
   b.dispatchEvent(new x.dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
   assert.equal(x.d.activeElement,a);
 }finally{x.limpar();}
});
test('GAB-09 obrigatoriedade de unidade e órgão aponta o campo inválido',()=>{
 const x=montar();
 try{
   x.id('gab-cad-novo').click();
   x.id('gab-cad-nome').value='Ramal Exemplo Incompleto';
   x.disparar('gab-cad-form','submit');
   assert.equal(x.id('gab-cad-dialogo').open,true);
   assert.equal(x.id('gab-cad-unidade').getAttribute('aria-invalid'),'true');
   assert.equal(x.id('gab-cad-unidade').getAttribute('aria-describedby'),'gab-cad-erro');
   assert.equal(x.d.activeElement,x.id('gab-cad-unidade'));
   x.id('gab-cad-tipo').value='externo';x.disparar('gab-cad-tipo','change');
   x.disparar('gab-cad-form','submit');
   assert.equal(x.id('gab-cad-orgaoId').getAttribute('aria-invalid'),'true');
   assert.equal(x.d.activeElement,x.id('gab-cad-orgaoId'));
   x.id('gab-cad-cancelar').click();
   assert.equal(x.id('gab-cad-dialogo').open,false);
   assert.equal(x.id('gab-cad-orgaoId').getAttribute('aria-invalid'),null);
 }finally{x.limpar();}
});
test('GAB-09 CRUD de órgãos destaca campo inválido e fecha diálogo com erro limpo',()=>{
 const x=montar();
 try{
   x.id('gab-cad-aba-orgaos').click();x.id('gab-org-novo').click();
   x.id('gab-org-nome').value='Órgão Teste Gamma';
   x.id('gab-org-telefone').value='12';
   x.disparar('gab-org-form','submit');
   assert.equal(x.id('gab-org-telefone').getAttribute('aria-invalid'),'true');
   assert.equal(x.id('gab-org-telefone').getAttribute('aria-describedby'),'gab-org-erro');
   assert.equal(x.d.activeElement,x.id('gab-org-telefone'));
   x.id('gab-org-cancelar').click();
   assert.equal(x.id('gab-org-dialogo').open,false);
   assert.equal(x.id('gab-org-telefone').getAttribute('aria-invalid'),null);
   x.id('gab-org-novo').click();
   x.id('gab-org-nome').value='Órgão Exemplo Novo';
   x.disparar('gab-org-form','submit');
   assert.ok(x.orgaos.listar().some(o=>o.nome==='Órgão Exemplo Novo'));
 }finally{x.limpar();}
});
test('GAB-09 ficha aberta reflete novo nome do órgão e fecha após arquivamento',()=>{
 const x=montar();
 try{
   const id='demo-org-002';
   x.agenda.abrirContato('org:'+id);
   assert.equal(x.id('gabinete-ficha-dialog').open,true);
   assert.equal(x.id('gabinete-ficha-titulo').textContent,'Instituição Parceira Beta (exemplo)');
   const antigo=x.orgaos.obter(id);
   x.orgaos.editar(id,{nome:'Instituição Parceira Atualizada',sigla:antigo.sigla,categoria:antigo.categoria,cidade:antigo.cidade,telefone:antigo.telefone,email:antigo.email});
   x.agenda.renderizar();
   assert.equal(x.id('gabinete-ficha-titulo').textContent,'Instituição Parceira Atualizada');
   x.orgaos.arquivar(id);
   x.agenda.renderizar();
   assert.equal(x.id('gabinete-ficha-dialog').open,false);
 }finally{x.limpar();}
});
test('GAB-09 revogação da consulta oculta a Agenda e fecha ficha',()=>{
 const x=montar();
 try{
   x.agenda.abrirContato('demo-pessoa-001');
   assert.equal(x.id('gabinete-ficha-dialog').open,true);
   x.negar();
   assert.equal(x.id('gabinete-ficha-dialog').open,false);
   assert.equal(x.id('gabinete-lista-contatos').children.length,0);
   assert.equal(x.id('gab-cad-lista').children.length,0);
   assert.equal(x.id('gab-org-lista').children.length,0);
 }finally{x.limpar();}
});
