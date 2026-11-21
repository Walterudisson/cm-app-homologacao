import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {criarPainelPessoasVinculos} from '../js/modules/gestao/pessoas-vinculos-ui.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const usuarios=[
  {uid:'u1',nome:'Pessoa Alpha',email:'alpha@example.invalid',ativo:true},
  {uid:'u2',nome:'Pessoa Beta',email:'beta@example.invalid',ativo:false}
];
const divisoes=[
  {id:'d1',nome:'Divisão Exemplo',responsavelPrincipalUid:'u1',responsavelPrincipalNome:'Pessoa Alpha'},
  {id:'d2',nome:'Divisão com Pendência',responsavelPrincipalNome:'Pessoa sem UID'}
];
function montar(){
  const dom=new JSDOM(html,{url:'https://example.invalid'});
  const original=globalThis.document;
  globalThis.document=dom.window.document;
  const clicks=[],usuario={perfil:'admin'};
  let autorizado=true;
  const ui=criarPainelPessoasVinculos({
    obterUsuario:()=>usuario,podeConsultar:()=>autorizado,
    abrirConta:uid=>clicks.push(['usuario',uid]),abrirDivisao:id=>clicks.push(['divisao',id])
  });
  const id=k=>dom.window.document.getElementById(k);
  ui.inicializar();
  return {dom,ui,id,clicks,usuario,negar:()=>{autorizado=false;ui.limpar();},
    fechar:()=>{globalThis.document=original;dom.window.close();}};
}
test('GEST-04 mostra apenas referências de contas, divisões e UIDs existentes',()=>{
  const x=montar();
  try{
    x.ui.atualizar({usuarios,divisoes});
    assert.equal(x.id('gest04-total-contas').textContent,'2');
    assert.equal(x.id('gest04-total-divisoes').textContent,'2');
    assert.equal(x.id('gest04-total-vinculos').textContent,'1');
    assert.equal(x.id('gest04-lista').children.length,2);
    assert.ok(x.id('gest04-referencia').textContent.includes('sem pessoaId'));
    assert.ok(x.id('gest04-lista').textContent.includes('Pessoa Alpha'));
    assert.ok(!x.id('gest04-lista').textContent.includes('divisaoId inventado'));
  }finally{x.fechar();}
});
test('GEST-04 alterna divisões e pendências, filtra por texto e não permite mesclagem',()=>{
  const x=montar();
  try{
    x.ui.atualizar({usuarios,divisoes});
    const tabs=x.dom.window.document.querySelectorAll('[data-gest04-visao]');
    tabs[1].click();
    assert.equal(x.id('gest04-lista').children.length,2);
    assert.equal(tabs[1].getAttribute('aria-pressed'),'true');
    tabs[2].click();
    assert.ok(x.id('gest04-lista').textContent.includes('Divisão com Pendência'));
    assert.ok(!x.id('gest04-lista').querySelector('[data-gest04-merge]'));
    const input=x.id('gest04-busca');
    input.value='inexistente';
    input.dispatchEvent(new x.dom.window.Event('input'));
    assert.equal(x.id('gest04-lista').children.length,0);
    assert.ok(x.id('gest04-mensagem').textContent.includes('Nenhum registro'));
  }finally{x.fechar();}
});
test('GEST-04 oferece abertura dos cadastros existentes sem criar registros novos',()=>{
  const x=montar();
  try{
    x.ui.atualizar({usuarios,divisoes});
    const botao=x.id('gest04-lista').querySelector('.gest04-acao');
    botao.click();
    assert.deepEqual(x.clicks,[['usuario','u1']]);
    x.dom.window.document.querySelector('[data-gest04-visao="divisoes"]').click();
    x.id('gest04-lista').querySelector('.gest04-acao').click();
    assert.equal(x.clicks[1][0],'divisao');
  }finally{x.fechar();}
});
test('GEST-04 troca de sessão ou perda de autorização limpa todos os dados',()=>{
  const x=montar();
  try{
    x.ui.atualizar({usuarios,divisoes});
    x.negar();
    assert.equal(x.id('gest04-lista').children.length,0);
    assert.equal(x.id('gest04-total-contas').textContent,'0');
    assert.ok(!x.id('gest04-lista').textContent.includes('Pessoa Alpha'));
    x.usuario.perfil='gestor';
    x.ui.atualizar({usuarios,divisoes});
    assert.equal(x.id('gest04-lista').children.length,0);
    assert.equal(x.id('gest04-total-contas').textContent,'0');
  }finally{x.fechar();}
});
