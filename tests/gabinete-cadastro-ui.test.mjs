import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {criarCadastroGabineteEmMemoria} from '../js/modules/gabinete/cadastro-model.js';
import {criarCadastroGabineteUI} from '../js/modules/gabinete/cadastro-ui.js';
import {criarOrgaosGabineteEmMemoria} from '../js/modules/gabinete/orgaos-model.js';
import {criarOrgaosGabineteUI} from '../js/modules/gabinete/orgaos-ui.js';
import {criarDiretorioGabinete} from '../js/modules/gabinete/diretorio-referencias.js';
import {filtrarContatosGabinete} from '../js/modules/gabinete/agenda-model.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function preparar(){
 const dom=new JSDOM(html,{url:'https://example.invalid'});
 const anterior=globalThis.document;
 globalThis.document=dom.window.document;
 const proto=dom.window.HTMLDialogElement.prototype;
 proto.showModal=function(){this.setAttribute('open','')};
 proto.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'))};
 let usuario={uid:'admin-demo',nome:'Admin Exemplo'};let autorizado=true;
 const orgaos=criarOrgaosGabineteEmMemoria({hoje:()=>'2026-11-21'});
 const base=criarCadastroGabineteEmMemoria({hoje:()=>'2026-11-21'});
 orgaos.iniciar(usuario.uid);base.iniciar(usuario.uid);
 const diretorio=criarDiretorioGabinete({cadastro:base,orgaos,obterUsuario:()=>usuario,obterFotoPropria:()=>''});
 const eventos=[],fichas=[];
 const opcoes={obterUsuario:()=>usuario,podeGerenciar:()=>autorizado,notificar:(...x)=>eventos.push(x)};
 const uiOrgaos=criarOrgaosGabineteUI({orgaos,contatos:diretorio,...opcoes});
 const ui=criarCadastroGabineteUI({armazenamento:diretorio,orgaos,uiOrgaos,abrirFicha:id=>fichas.push(id),...opcoes});
 uiOrgaos.inicializar();ui.inicializar();ui.atualizarOpcoesVinculo();ui.renderizar();
 const d=dom.window.document,id=x=>d.getElementById(x);
 return {
   dom,d,id,base,diretorio,orgaos,ui,uiOrgaos,eventos,fichas,
   evento:(id_,tipo)=>id(id_).dispatchEvent(new dom.window.Event(tipo,{bubbles:true,cancelable:true})),
   trocar:(uid)=>{usuario={uid,nome:'Outro Exemplo'};orgaos.iniciar(uid);base.iniciar(uid);ui.renderizar();uiOrgaos.renderizar();},
   negar:()=>{autorizado=false;ui.renderizar();uiOrgaos.renderizar();},
   limpar:()=>{ui.limpar();uiOrgaos.limpar();globalThis.document=anterior;dom.window.close();}
 };
}
test('GAB-07.1 pessoas não podem ser editadas ou duplicadas na Agenda',()=>{
 const f=preparar();
 try{
   assert.equal(f.id('gab-cad-lista').children.length,11);
   assert.equal(f.id('gab-cad-tipo').querySelector('[value="pessoa"]'),null);
   const proprio=f.d.querySelector('[data-id="self:admin-demo"]');
   assert.ok(proprio);
   assert.equal(proprio.querySelectorAll('button').length,1);
   assert.throws(()=>f.diretorio.criar({tipo:'pessoa',nome:'Duplicada'}),/Gestão/);
   const legada=f.d.querySelector('[data-id="demo-pessoa-001"]');
   assert.equal(legada.querySelectorAll('button').length,1);
 }finally{f.limpar();}
});
test('GAB-07.1 ramais referenciam divisão por ID, preservam CRUD reversível e Agenda',()=>{
 const f=preparar();
 try{
   f.id('gab-cad-novo').click();
   assert.equal(f.id('gab-cad-dialogo').open,true);
   assert.equal(f.id('gab-cad-tipo').value,'ramal');
   f.id('gab-cad-nome').value='Recepção Teste';
   f.id('gab-cad-unidade').value='demo-div-alfa';
   f.id('gab-cad-ramal').value='0007';
   f.evento('gab-cad-form','submit');
   assert.equal(f.id('gab-cad-dialogo').open,false);
   assert.equal(f.base.obter('sessao-1').unidadeId,'demo-div-alfa');
   assert.equal(f.diretorio.obter('sessao-1').unidade,'Unidade Alfa');
   assert.equal(filtrarContatosGabinete(f.diretorio.listar(),{termo:'Recepção Teste'}).length,1);
   let card=f.d.querySelector('[data-id="sessao-1"]');
   assert.ok(card);
   card.querySelectorAll('button')[1].click();
   f.id('gab-cad-ramal').value='0099';f.evento('gab-cad-form','submit');
   assert.equal(f.diretorio.obter('sessao-1').ramal,'0099');
   card=f.d.querySelector('[data-id="sessao-1"]');
   card.querySelectorAll('button')[3].click();
   assert.equal(f.id('gab-cad-confirmacao').open,true);
   assert.equal(f.base.obter('sessao-1').ativo,true);
   f.id('gab-cad-confirmacao-executar').click();
   assert.equal(f.base.obter('sessao-1').ativo,false);
   f.id('gab-cad-estado').value='arquivados';f.evento('gab-cad-estado','change');
   f.d.querySelector('[data-id="sessao-1"] button').click();
   f.id('gab-cad-confirmacao-executar').click();
   assert.equal(f.base.obter('sessao-1').ativo,true);
 }finally{f.limpar();}
});
test('GAB-07.1 órgão externo criado uma vez e utilizado por contato vinculado',()=>{
 const f=preparar();
 try{
   f.id('gab-cad-aba-orgaos').click();
   assert.equal(f.id('gab-org-painel').hidden,false);
   assert.equal(f.id('gab-cad-contatos-painel').hidden,true);
   assert.equal(f.id('gab-cad-novo').hidden,true);
   assert.equal(f.id('gab-org-lista').children.length,2);
   f.id('gab-org-novo').click();
   f.id('gab-org-nome').value='Órgão Externo Zeta';
   f.id('gab-org-sigla').value='OEZ';
   f.id('gab-org-cidade').value='Curitiba';
   f.evento('gab-org-form','submit');
   assert.equal(f.orgaos.listar().length,3);
   assert.equal(f.diretorio.obter('org:sessao-org-1').nome,'Órgão Externo Zeta');
   f.id('gab-cad-aba-contatos').click();
   f.id('gab-cad-novo').click();
   f.id('gab-cad-tipo').value='externo';f.evento('gab-cad-tipo','change');
   assert.equal(f.id('gab-cad-orgao-grupo').hidden,false);
   f.id('gab-cad-nome').value='Contato Externo Exemplo Z';
   f.id('gab-cad-orgaoId').value='sessao-org-1';
   f.id('gab-cad-email').value='externo@example.invalid';
   f.evento('gab-cad-form','submit');
   const contato=f.diretorio.listar().find(x=>x.nome==='Contato Externo Exemplo Z');
   assert.ok(contato);
   assert.equal(contato.orgaoId,'sessao-org-1');
   assert.equal(contato.unidade,'Órgão Externo Zeta');
   f.id('gab-cad-aba-orgaos').click();
   const orgCard=f.d.querySelector('[data-id="sessao-org-1"]');
   orgCard.querySelectorAll('button')[2].click();
   f.id('gab-org-confirmacao-executar').click();
   assert.equal(f.orgaos.obter('sessao-org-1').ativo,true);
   assert.ok(f.eventos.some(x=>/contatos vinculados/i.test(x[0])));
 }finally{f.limpar();}
});
test('GAB-07.1 revogação e troca de usuário descartam registros da sessão',()=>{
 const f=preparar();
 try{
   f.id('gab-cad-novo').click();
   f.id('gab-cad-nome').value='Ramal Temporário';
   f.id('gab-cad-unidade').value='demo-div-alfa';
   f.id('gab-cad-ramal').value='0008';
   f.evento('gab-cad-form','submit');
   assert.equal(f.base.listar().length,11);
   f.trocar('outra-conta');
   assert.equal(f.base.listar().length,10);
   assert.equal(f.base.obter('sessao-1'),null);
   f.negar();
   assert.equal(f.id('gab-cad-lista').children.length,0);
   assert.equal(f.id('gab-org-lista').children.length,0);
 }finally{f.limpar();}
});
