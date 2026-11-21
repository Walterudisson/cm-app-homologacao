import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {criarCadastroGabineteEmMemoria} from '../js/modules/gabinete/cadastro-model.js';
import {criarCadastroGabineteUI} from '../js/modules/gabinete/cadastro-ui.js';
import {filtrarContatosGabinete} from '../js/modules/gabinete/agenda-model.js';
import {listarAniversariantes} from '../js/modules/gabinete/aniversarios-model.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function preparar(){
  const dom=new JSDOM(html,{url:'https://example.invalid'});
  const antigo=globalThis.document;
  globalThis.document=dom.window.document;
  const proto=dom.window.HTMLDialogElement.prototype;
  proto.showModal=function(){this.setAttribute('open','');};
  proto.close=function(){this.removeAttribute('open');this.dispatchEvent(new dom.window.Event('close'));};
  const uid='admin-hml-ficticio';let usuario={uid};let autorizado=true;
  const eventos=[],fichas=[];
  const armazenamento=criarCadastroGabineteEmMemoria({hoje:()=>'2026-11-21'});
  armazenamento.iniciar(uid);
  const ui=criarCadastroGabineteUI({
    armazenamento,obterUsuario:()=>usuario,podeGerenciar:()=>autorizado,
    notificar:(...dados)=>eventos.push(dados),
    abrirFicha:id=>fichas.push(id)
  });
  const d=dom.window.document,id=x=>d.getElementById(x);
  const evento=(x,tipo)=>id(x).dispatchEvent(new dom.window.Event(tipo,{bubbles:true,cancelable:true}));
  const limpar=()=>{ui.limpar();globalThis.document=antigo;dom.window.close();};
  ui.inicializar();ui.renderizar();
  return {dom,d,id,evento,ui,armazenamento,eventos,fichas,limpar,
    trocarUsuario:uid=>{usuario={uid};armazenamento.iniciar(uid);ui.renderizar();},
    negar:()=>{autorizado=false;ui.renderizar();}
  };
}
test('GAB-07 integração CRUD: cadastro, validação, edição, ficha e exclusão restaurável',()=>{
  const f=prepar();
  try{
    assert.equal(f.id('gab-cad-lista').children.length,10);
    f.id('gab-cad-novo').click();assert.equal(f.id('gab-cad-dialogo').open,true);
    f.id('gab-cad-nome').value='Pessoa Teste GAB';
    f.id('gab-cad-unidade').value='Unidade Teste';
    f.id('gab-cad-ramal').value='0007';
    f.id('gab-cad-aniversario').value='30/02';
    f.evento('gab-cad-form','submit');
    assert.match(f.id('gab-cad-erro').textContent,/Aniversário/);
    assert.equal(f.armazenamento.listar().length,10);
    f.id('gab-cad-aniversario').value='29/02';
    f.evento('gab-cad-form','submit');
    assert.equal(f.armazenamento.listar().length,11);
    assert.equal(f.id('gab-cad-dialogo').open,false);
    assert.equal(f.armazenamento.obter('sessao-1').ramal,'0007');
    let card=f.d.querySelector('[data-id="sessao-1"]');
    assert.ok(card);
    assert.equal(filtrarContatosGabinete(f.armazenamento.listar(),{termo:'pessoa teste gab'}).length,1);
    assert.equal(listarAniversariantes(f.armazenamento.listar(),{hoje:'2026-11-21',periodo:'todos'}).length,6);
    card.querySelector('button').click();assert.deepEqual(f.fichas,['sessao-1']);
    card.querySelectorAll('button')[1].click();
    assert.equal(f.id('gab-cad-dialogo-titulo').textContent,'Editar contato');
    f.id('gab-cad-nome').value='Pessoa Teste Editada';
    f.evento('gab-cad-form','submit');
    assert.equal(f.armazenamento.obter('sessao-1').nome,'Pessoa Teste Editada');
    card=f.d.querySelector('[data-id="sessao-1"]');
    card.querySelectorAll('button')[3].click();
    assert.equal(f.id('gab-cad-confirmacao').open,true);
    assert.equal(f.armazenamento.obter('sessao-1').ativo,true);
    f.id('gab-cad-confirmacao-executar').click();
    assert.equal(f.armazenamento.obter('sessao-1').ativo,false);
    f.id('gab-cad-estado').value='arquivados';f.evento('gab-cad-estado','change');
    assert.ok(f.d.querySelector('[data-id="sessao-1"]'));
    f.d.querySelector('[data-id="sessao-1"] button').click();
    f.id('gab-cad-confirmacao-executar').click();
    assert.equal(f.armazenamento.obter('sessao-1').ativo,true);
  }finally{f.limpar();}
});
test('GAB-07 isolamento de usuários e proibição de CRUD sem autorização',()=>{
  const f=prepar();
  try{
    f.id('gab-cad-novo').click();
    f.id('gab-cad-nome').value='Contatinho de Teste';
    f.id('gab-cad-unidade').value='Unidade Demo';
    f.evento('gab-cad-form','submit');
    assert.equal(f.armazenamento.listar().length,11);
    f.trocarUsuario('outro-admin');
    assert.equal(f.armazenamento.listar().length,10);
    assert.equal(f.armazenamento.obter('sessao-1'),null);
    f.negar();assert.equal(f.id('gab-cad-lista').children.length,0);
    const antes=f.armazenamento.listar().length;
    f.id('gab-cad-novo').click();
    assert.equal(f.id('gab-cad-dialogo').open,false);
    assert.equal(f.armazenamento.listar().length,antes);
  }finally{f.limpar();}
});
