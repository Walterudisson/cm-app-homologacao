import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { internalFile } from './internal-source.mjs';
import { criarInterfaceCautelas } from '../js/modules/dsips/cautelas-controller.js';
const { JSDOM } = createRequire(internalFile('functions/package.json'))('jsdom');
const html = await readFile(new URL('../index.html',import.meta.url),'utf8');
const esperar = async () => { for (let i=0;i<8;i++) await new Promise(resolve=>setImmediate(resolve)); };
function ambiente(perfil='admin') {
  const dom = new JSDOM(html,{url:'https://teste.invalid/'});const originais={document:globalThis.document,Option:globalThis.Option};
  globalThis.document=dom.window.document;globalThis.Option=dom.window.Option;
  const estado={responsaveis:[{id:'p',nome:'Pessoa Teste',matricula:'123',ativo:true}],materiais:[
    {id:'m',nome:'Quantidade',unidade:'un',controle:'quantidade',ativo:true},{id:'i',nome:'Individual',unidade:'un',controle:'individualizado',ativo:true}
  ],estoque:[{materialId:'m',disponivel:10},{materialId:'i',disponivel:2}],cautelas:[]};
  const chamadas=[],avisos=[];const usuario={uid:'teste',perfil,modulos:['dsips']};
  const servicos={listar:async tipo=>structuredClone(estado[tipo]),listarUnidades:async()=>[
    {id:'u1',identificacao:'SER-1',situacao:'disponivel'},{id:'u2',identificacao:'SER-2',situacao:'em_cautela',cautelaId:'outra'}
  ],registrarCautela:async payload=>{chamadas.push(payload);},registrarDevolucao:async payload=>{chamadas.push(payload);}};
  const ui=criarInterfaceCautelas({obterUsuario:()=>usuario,servicos,confirmar:async()=>true,notificar:(...args)=>avisos.push(args)});
  const id=nome=>dom.window.document.getElementById(nome);
  const evento=(elemento,nome)=>elemento.dispatchEvent(new dom.window.Event(nome,{bubbles:true,cancelable:true}));
  return{ui,estado,servicos,chamadas,avisos,usuario,id,evento,dom,fechar(){Object.assign(globalThis,originais);dom.window.close();}};
}
const cautela=()=>({id:'C-123',status:'aberta',responsavelId:'p',responsavelNome:'Pessoa Teste',responsavelMatricula:'123',itens:[
  {materialId:'m',nome:'Quantidade',quantidade:5,devolvida:0,unidade:'un',controle:'quantidade',unidades:[],unidadesDevolvidas:[]},
  {materialId:'i',nome:'Individual',quantidade:1,devolvida:0,unidade:'un',controle:'individualizado',unidades:[{id:'u1',identificacao:'SER-1'}],unidadesDevolvidas:[]}
]});
test('formulário monta cautela com vários materiais e seleciona somente unidades disponíveis',async()=>{
  const f=ambiente();try{
    await f.ui.carregar('dsips-cautelas');const form=f.id('dsips-cautela-form');form.elements.responsavelId.value='p';
    let rows=f.id('dsips-cautela-rows').children;rows[0].querySelector('select').value='m';f.evento(rows[0].querySelector('select'),'change');rows[0].querySelector('input[type=number]').value='3';
    f.id('dsips-add-material').click();const individual=rows[1];individual.querySelector('select').value='i';f.evento(individual.querySelector('select'),'change');await esperar();
    assert.equal(individual.querySelectorAll('input[type=checkbox]').length,1);
    const unidade=individual.querySelector('input[type=checkbox]');unidade.checked=true;f.evento(unidade,'change');
    assert.equal(individual.querySelector('input[type=number]').value,'1');
    f.evento(form,'submit');await esperar();assert.equal(f.chamadas.length,1);assert.equal(f.chamadas[0].itens.length,2);
    assert.deepEqual(f.chamadas[0].itens[1].unidadeIds,['u1']);assert.equal(f.chamadas[0].itens[0].quantidade,3);
  }finally{f.fechar();}
});
test('devolução parcial não inclui os materiais que continuam com o responsável',async()=>{
  const f=ambiente();try{
    f.estado.cautelas=[cautela()];await f.ui.carregar('dsips-cautelas');f.id('dsips-cautela-list').querySelector('button').click();
    assert.ok(!f.id('dsips-devolucao-form').classList.contains('hidden'));
    f.id('dsips-devolucao-rows').querySelector('input[type=number]').value='2';f.evento(f.id('dsips-devolucao-form'),'submit');await esperar();
    assert.equal(f.chamadas[0].cautelaId,'C-123');assert.deepEqual(f.chamadas[0].itens,[{materialId:'m',quantidade:2,unidadeIds:[]}]);
  }finally{f.fechar();}
});
test('selecionar tudo pendente inclui quantidades e identificações da cautela original',async()=>{
  const f=ambiente();try{
    f.estado.cautelas=[cautela()];await f.ui.carregar('dsips-cautelas');f.id('dsips-cautela-list').querySelector('button').click();
    f.id('dsips-devolver-tudo').click();f.evento(f.id('dsips-devolucao-form'),'submit');await esperar();
    assert.equal(f.chamadas[0].itens[0].quantidade,5);assert.deepEqual(f.chamadas[0].itens[1].unidadeIds,['u1']);
  }finally{f.fechar();}
});
test('Conferente consulta posse e cautelas sem formularios de operação ou botões de devolução',async()=>{
  const f=ambiente('conferente');try{
    f.estado.cautelas=[cautela()];await f.ui.carregar('dsips-cautelas');assert.ok(f.id('dsips-cautela-form').classList.contains('hidden'));
    assert.equal(f.id('dsips-cautela-list').querySelectorAll('button').length,0);
    await f.ui.carregar('dsips-posse');assert.match(f.id('dsips-posse-list').textContent,/Quantidade: 5 un/);assert.match(f.id('dsips-posse-list').textContent,/SER-1/);
    f.evento(f.id('dsips-cautela-form'),'submit');await esperar();assert.equal(f.chamadas.length,0);
  }finally{f.fechar();}
});
test('filtros e busca não mostram cautelas encerradas na visão de posse',async()=>{
  const f=ambiente();try{
    f.estado.cautelas=[{...cautela(),status:'encerrada'}];await f.ui.carregar('dsips-posse');assert.match(f.id('dsips-posse-list').textContent,/Nenhum material/);
    await f.ui.carregar('dsips-cautelas');assert.match(f.id('dsips-cautela-list').textContent,/Nenhuma cautela/);
    f.id('dsips-cautela-status').value='todas';f.evento(f.id('dsips-cautela-status'),'change');assert.match(f.id('dsips-cautela-list').textContent,/Encerrada/);
  }finally{f.fechar();}
});
test('reenvio após erro mantém o identificador de operação e evita duplo clique',async()=>{
  const f=ambiente();try{
    f.estado.cautelas=[cautela()];f.servicos.registrarDevolucao=async payload=>{f.chamadas.push(payload);throw new Error('Sem conexão');};
    await f.ui.carregar('dsips-cautelas');f.id('dsips-cautela-list').querySelector('button').click();f.id('dsips-devolver-tudo').click();
    f.evento(f.id('dsips-devolucao-form'),'submit');f.evento(f.id('dsips-devolucao-form'),'submit');await esperar();assert.equal(f.chamadas.length,1);
    f.evento(f.id('dsips-devolucao-form'),'submit');await esperar();assert.equal(f.chamadas[0].operacaoId,f.chamadas[1].operacaoId);
  }finally{f.fechar();}
});
