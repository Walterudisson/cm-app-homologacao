import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {periodoBi,resumirEstoqueBi,resumirCautelasBi,resumirEventosBi} from '../js/modules/dsips/painel-bi-model.js';
const d=s=>new Date(s);
const periodo=periodoBi(30,d('2026-11-19T15:00:00Z'));
test('disponibilidade soma posições por material e separa saldo ausente ou inválido',()=>{
 const materiais=[{id:'a',nome:'Rádio',estoqueMinimo:4},{id:'b',estoqueMinimo:1},{id:'c'},{id:'d'},{id:'e',ativo:false},{id:'f',estoqueMinimo:2}];
 const estoque=[{materialId:'a',disponivel:1},{materialId:'a',disponivel:2},{materialId:'b',disponivel:0},{materialId:'d',disponivel:null},{materialId:'e',disponivel:0},{materialId:'f',disponivel:2}];
 const r=resumirEstoqueBi(materiais,estoque);
 assert.deepEqual(r.semSaldo.map(x=>x.id),['b']);assert.deepEqual(r.semInicializacao.map(x=>x.id),['c']);assert.deepEqual(r.saldoDesconhecido.map(x=>x.id),['d']);
 assert.deepEqual(r.abaixoMinimo.map(x=>[x.id,x.disponivel,x.minimo]),[['a',3,4],['b',0,1]]);
});
test('ranking conta cautelas distintas, não unidades; situação é geral',()=>{
 const itens=[{materialId:'a',nome:'Rádio',quantidade:30},{materialId:'a',nome:'Rádio',quantidade:10},{materialId:'b',nome:'Colete',quantidade:2}];
 const r=resumirCautelasBi([{id:'1',status:'aberta',criadoEm:d('2026-11-01'),itens},{id:'2',status:'encerrada',criadoEm:d('2026-11-02'),itens:[itens[0]]},{id:'3',status:'parcial',criadoEm:d('2026-08-10'),itens:[itens[2]]},{id:'4',status:'encerrada'}],periodo);
 assert.deepEqual(r.ranking.map(x=>[x.id,x.total]),[['a',2],['b',1]]);assert.deepEqual(r.estados,{aberta:1,parcial:1,encerrada:2,outro:0});assert.equal(r.semData,1);
});
test('tempo médio usa só cautelas encerradas vinculadas; não confunde devolução parcial com integral',()=>{
 const c=[{id:'c1',status:'encerrada',criadoEm:d('2026-10-01T12:00Z')},{id:'c2',status:'parcial',criadoEm:d('2026-11-01T12:00Z')},{id:'c3',status:'encerrada',criadoEm:d('2026-11-05T12:00Z')},{id:'c4',status:'encerrada'}];
 const ev=(tipo,em,id)=>({tipo,registradoEm:d(em),dados:{cautelaId:id}});
 const e=[ev('devolucao_registrada','2026-11-03T12:00Z','c1'),ev('devolucao_registrada','2026-11-02T12:00Z','c1'),ev('devolucao_registrada','2026-11-06T12:00Z','c2'),ev('devolucao_registrada','2026-11-10T12:00Z','c3'),ev('devolucao_registrada','2026-11-10T12:00Z','c4'),ev('devolucao_registrada','2026-11-11T12:00Z',null),ev('cautela_registrada','2026-11-01T12:00Z','c2'),ev('ajuste_estoque_registrado','2026-11-01T12:00Z'),ev('saldo_inicial_registrado','2026-10-21T01:00Z'),ev('saldo_inicial_registrado','2026-08-21T01:00Z')];
 const r=resumirEventosBi(e,c,periodo);assert.equal(r.amostra,2);assert.equal(r.mediaDias,19);assert.equal(r.semVinculo,1);assert.equal(r.invalidas,1);assert.deepEqual(r.totais,{cautelas:1,devolucoes:6,ajustes:1,saldos:1});assert.equal(resumirEventosBi([],c,periodo).mediaDias,null);
});
test('BI consulta período limitado e preserva restrição de auditoria e sessão',async()=>{
 const ler=p=>readFile(new URL('../'+p,import.meta.url),'utf8');const [h,u,s,w]=await Promise.all([ler('index.html'),ler('js/modules/dsips/painel-bi-ui.js'),ler('js/modules/dsips/service.js'),ler('service-worker.js')]);assert.match(h,/id="dsips-bi-periodo"/);assert.match(u,/!podeConsultarHistoricoDsips\(obterUsuario\(\)\)/);assert.match(u,/if\(!resultado.completo\)/);assert.match(u,/uid===obterUsuario\(\)\?\.uid/);assert.match(s,/where\('registradoEm','>=',inicio\)/);assert.match(s,/limit\(1001\)/);assert.match(w,/painel-bi-ui\.js/);assert.match(w,/painel-bi-model\.js/);
});
