import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {criarMatrizAcessosGestaoUI} from '../js/modules/gestao/matriz-acessos-ui.js';
import {CATALOGO_MATRIZ_GESTAO,filtrarMatrizGestao} from '../js/modules/gestao/matriz-acessos-model.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function montar(){
  const dom=new JSDOM(html,{url:'https://example.invalid'});
  const antigo=globalThis.document;
  globalThis.document=dom.window.document;
  let autorizado=true;
  const ui=criarMatrizAcessosGestaoUI({podeConsultar:()=>autorizado});
  const id=valor=>dom.window.document.getElementById(valor);
  ui.inicializar();
  return {dom,ui,id,negar:()=>{autorizado=false;ui.renderizar();},liberar:()=>{autorizado=true;ui.renderizar();},desmontar:()=>{globalThis.document=antigo;dom.window.close();}};
}
test('GEST-01 mapa inicia na Gestão e compara somente permissões declaradas no legado',()=>{
  const x=montar();
  try{
    assert.equal(x.id('gest-matriz-contrato').hidden,false);
    assert.equal(x.id('gest-matriz-modulo').value,'Gestão');
    assert.equal(x.id('gest-matriz-corpo').children.length,filtrarMatrizGestao({modulo:'Gestão'}).length);
    const linha=x.dom.window.document.querySelector('[data-estado="legado"].gest-matriz-linha');
    assert.ok(linha);
    assert.ok(linha.textContent.includes('Declarada no legado'));
    assert.ok(x.id('gest-matriz-contrato').textContent.includes('não concede acesso'));
  }finally{x.desmontar();}
});
test('GEST-01 filtra por módulo e propostas sem gravar no backend',()=>{
  const x=montar();
  try{
    const modulo=x.id('gest-matriz-modulo'),estado=x.id('gest-matriz-estado');
    modulo.value='RH';modulo.dispatchEvent(new x.dom.window.Event('change'));
    assert.equal(x.id('gest-matriz-corpo').children.length,filtrarMatrizGestao({modulo:'RH'}).length);
    assert.equal(x.id('gest-matriz-corpo').querySelectorAll('[data-estado="legado"].gest-matriz-linha').length,0);
    estado.value='legado';estado.dispatchEvent(new x.dom.window.Event('change'));
    assert.equal(x.id('gest-matriz-corpo').children.length,0);
    assert.equal(x.id('gest-matriz-vazio').hidden,false);
    estado.value='proposta';estado.dispatchEvent(new x.dom.window.Event('change'));
    assert.ok(x.id('gest-matriz-corpo').children.length>0);
  }finally{x.desmontar();}
});
test('GEST-01 pesquisa por identificador sem interpolar HTML de fonte dinâmica',()=>{
  const x=montar();
  try{
    const modulo=x.id('gest-matriz-modulo'),estado=x.id('gest-matriz-estado'),busca=x.id('gest-matriz-busca');
    modulo.value='';estado.value='';busca.value='telefone_privado';
    busca.dispatchEvent(new x.dom.window.Event('input'));
    assert.equal(x.id('gest-matriz-corpo').children.length,1);
    assert.equal(x.id('gest-matriz-corpo').querySelector('code').textContent,'gabinete.agenda.telefone_privado');
    assert.equal(x.id('gest-matriz-contrato').querySelectorAll('input[type=checkbox]').length,0);
    assert.equal(x.id('gest-matriz-contrato').querySelectorAll('button').length,0);
    assert.ok(CATALOGO_MATRIZ_GESTAO.every(x=>Object.isFrozen(x)));
  }finally{x.desmontar();}
});
test('GEST-01 negado acesso a tela de Gestão, painel consultivo não revela seus itens',()=>{
  const x=montar();
  try{
    x.negar();
    assert.equal(x.id('gest-matriz-contrato').hidden,true);
    assert.equal(x.id('gest-matriz-corpo').children.length,0);
    x.liberar();
    assert.equal(x.id('gest-matriz-contrato').hidden,false);
    assert.ok(x.id('gest-matriz-corpo').children.length>0);
  }finally{x.desmontar();}
});
