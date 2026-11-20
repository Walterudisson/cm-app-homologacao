import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {apresentarEventoDsips,filtrarHistoricoDsips,podeConsultarHistoricoDsips} from '../js/modules/dsips/historico-model.js';
const ler=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const data=new Date('2026-11-18T13:30:00Z');
const base={operadorNome:'João Teste',registradoEm:{toDate:()=>data}};
const eventos=[
  {...base,id:'a',tipo:'cadastro_salvo',dados:{tipo:'categoria',nome:'Comunicação'}},
  {...base,id:'b',tipo:'saldo_inicial_registrado',dados:{materialNome:'Rádio',quantidade:0,unidade:'un',localNome:'Depósito',motivo:'Inventário'}},
  {...base,id:'c',tipo:'cautela_registrada',dados:{responsavelNome:'Maria',itens:[{nome:'Rádio',quantidade:2,unidade:'un'}],observacoes:'Teste'}},
  {...base,id:'d',tipo:'devolucao_registrada',dados:{responsavelNome:'Maria',itens:[{nome:'Rádio',quantidade:1,unidade:'un'}]}},
  {id:'e',tipo:'ajuste_futuro',dados:{}}
];
test('histórico restrito a admin e gestor DSIPS',()=>{
  assert.equal(podeConsultarHistoricoDsips({perfil:'admin',ativo:true}),true);
  assert.equal(podeConsultarHistoricoDsips({perfil:'gestor',ativo:true,modulos:['dsips']}),true);
  for(const u of [{perfil:'conferente',ativo:true,modulos:['dsips']},{perfil:'usuario',ativo:true,modulos:['dsips']},{perfil:'gestor',ativo:true,modulos:['patrimonios']},{perfil:'admin',ativo:false},{perfil:'admin',ativo:true,autorizacaoVersao:2}])assert.equal(podeConsultarHistoricoDsips(u),false);
});
test('usa nomes históricos e preserva quantidade zero, operador, data e motivo',()=>{
  const a=apresentarEventoDsips(eventos[1]);assert.equal(a.grupo,'saldo');assert.equal(a.titulo,'Rádio');assert.equal(a.operador,'João Teste');assert.equal(a.data,data);
  assert.deepEqual(a.linhas,['Saldo inicial: 0 un','Local: Depósito','Justificativa: Inventário']);
  assert.deepEqual(apresentarEventoDsips(eventos[2]).linhas,['Rádio: 2 un','Observações: Teste']);
  assert.equal(apresentarEventoDsips(eventos[3]).titulo,'Maria');
});
test('classifica eventos conhecidos, preserva tipo desconhecido e não inventa data ou operador',()=>{
  assert.deepEqual(eventos.map(e=>apresentarEventoDsips(e).grupo),['cadastro','saldo','cautela','devolucao','outro']);
  const e=apresentarEventoDsips(eventos[4]);assert.equal(e.titulo,'ajuste_futuro');assert.equal(e.data,null);assert.equal(e.operador,'Operador não informado');
  assert.equal(apresentarEventoDsips({registradoEm:{toDate:()=>new Date('inválido')}}).data,null);
});
test('busca normalizada e filtros combináveis exclusivamente nos eventos recebidos',()=>{
  assert.equal(filtrarHistoricoDsips(eventos,'joao').length,4);
  assert.equal(filtrarHistoricoDsips(eventos,'radio').length,3);
  assert.equal(filtrarHistoricoDsips(eventos,'maria','devolucao')[0].id,'d');
  assert.equal(filtrarHistoricoDsips(eventos,'inventario','cadastro').length,0);
});
test('navegação protege auditoria antes da ativação, leitura paginada e isolamento da sessão',async()=>{
  const [html,app,nav,ui,serv,sw]=await Promise.all([ler('index.html'),ler('app.js'),ler('js/ui/navigation.js'),ler('js/modules/dsips/historico-ui.js'),ler('js/modules/dsips/service.js'),ler('service-worker.js')]);
  for(const id of ['sec-dsips-historico','tab-btn-dsips-historico','dsips-historico-list','dsips-historico-more','dsips-historico-tipo'])assert.ok(html.includes('id="'+id+'"'));
  assert.match(app,/if \(abaAtiva === 'dsips-historico' && !podeConsultarHistoricoDsips\(usuarioLogado\)\)/);
  assert.match(app,/tab-btn-dsips-historico'\)\?\.classList.toggle\('hidden', !podeConsultarHistoricoDsips\(usuarioLogado\)\)/);
  assert.match(app,/historicoDsips\.limpar\(\)/);assert.match(app,/historicoDsips\.carregar\(\)/);
  assert.match(nav,/'dsips-historico': \{ titulo: 'Histórico DSIPS'/);
  assert.match(ui,/if\(!autorizado\(\)\)\{limpar\(\);return;\}/);
  assert.match(ui,/token!==revisao\|\|uid!==obterUsuario\(\)\?\.uid\|\|!autorizado\(\)/);
  assert.match(ui,/listarPaginaEventosDsips\(acrescentar\?cursor:null\)/);
  assert.match(serv,/restricoes\.push\(startAfter\(cursor\)\)/);
  assert.match(serv,/restricoes\.push\(limit\(31\)\)/);
  assert.match(serv,/snapshot\.docs\.slice\(0, 30\)/);
  assert.match(serv,/temMais: snapshot\.docs\.length > 30/);
  assert.doesNotMatch(ui,/innerHTML|setDoc|updateDoc|deleteDoc|httpsCallable/);
  assert.match(sw,/v1\.13\.32-h\.1-perf-autocomplete/);
});
