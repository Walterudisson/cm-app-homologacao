import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {consolidarPosseDsips,filtrarPosseDsips,podeConsultarPosseDsips} from '../js/modules/dsips/posse-model.js';
const ler=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const base={responsavelId:'u1',responsavelUid:'u1',responsavelOrigem:'usuarios',responsavelNome:'João Teste',responsavelMatricula:'001',status:'aberta'};
const material={materialId:'m1',nome:'Lanterna',unidade:'un',quantidade:5,devolvida:2};
const dados=[
  {...base,id:'c1',status:'parcial',itens:[material,{materialId:'m2',nome:'Rádio',unidade:'un',quantidade:2,devolvida:1,unidades:[{id:'s1',identificacao:'SER-001'},{id:'s2',identificacao:'SER-002'}],unidadesDevolvidas:['s1']}]},
  {...base,id:'c2',itens:[{...material,quantidade:4,devolvida:0}]},
  {...base,id:'c3',status:'encerrada',itens:[material]},
  {id:'c4',responsavelId:'u1',responsavelNome:'João Teste',status:'aberta',itens:[{...material,quantidade:1,devolvida:0}]},
  {...base,id:'c5',responsavelUid:'u2',responsavelId:'u2',itens:[{...material,quantidade:1,devolvida:1}]}
];
test('agrupa pendências por identidade e material, desconta devoluções e ignora encerradas',()=>{
  const grupos=consolidarPosseDsips(dados);
  assert.equal(grupos.length,2);
  const atual=grupos.find(g=>!g.legado);
  const lanterna=atual.materiais.find(m=>m.materialId==='m1');
  assert.equal(lanterna.quantidade,7);
  assert.deepEqual(lanterna.cautelas,[{id:'c1',quantidade:3},{id:'c2',quantidade:4}]);
  assert.deepEqual(atual.materiais.find(m=>m.materialId==='m2').identificacoes,['SER-002']);
  assert.equal(grupos.find(g=>g.legado).materiais[0].quantidade,1);
});
test('busca por nome, matrícula, identificação, material e cautela; não mostra identificações devolvidas',()=>{
  const grupos=consolidarPosseDsips(dados);
  assert.equal(filtrarPosseDsips(grupos,'joao').length,2);
  assert.equal(filtrarPosseDsips(grupos,'001').length,1);
  assert.equal(filtrarPosseDsips(grupos,'SER-001').length,0);
  assert.equal(filtrarPosseDsips(grupos,'SER-002')[0].materiais[0].nome,'Rádio');
  assert.equal(filtrarPosseDsips(grupos,'radio')[0].materiais.length,1);
  assert.equal(filtrarPosseDsips(grupos,'c2')[0].materiais[0].nome,'Lanterna');
  assert.equal(consolidarPosseDsips([]).length,0);
});
test('não confunde unidades de medida diferentes nem homônimos',()=>{
  const grupos=consolidarPosseDsips([
    {...base,id:'a',itens:[material,{...material,unidade:'kit'}]},
    {...base,id:'b',responsavelId:'u2',responsavelUid:'u2',itens:[material]}
  ]);
  assert.equal(grupos.length,2);
  assert.equal(grupos.find(g=>g.chave==='usuario:u1').materiais.length,2);
});
test('somente perfil DSIPS autorizado consulta posse',()=>{
  assert.equal(podeConsultarPosseDsips({perfil:'admin',ativo:true}),true);
  assert.equal(podeConsultarPosseDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeConsultarPosseDsips({perfil:'usuario',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeConsultarPosseDsips({perfil:'gestor',ativo:true,modulos:['patrimonios']}),false);
  assert.equal(podeConsultarPosseDsips({perfil:'admin',ativo:false}),false);
});
test('integra menu e sessão existente, exclusivamente leitura de cautelas',async()=>{
  const [html,app,nav,ui,sw]=await Promise.all([ler('index.html'),ler('app.js'),ler('js/ui/navigation.js'),ler('js/modules/dsips/posse-ui.js'),ler('service-worker.js')]);
  for(const id of ['sec-dsips-posse','tab-btn-dsips-posse','dsips-posse-list','dsips-posse-search','dsips-posse-refresh'])assert.ok(html.includes('id="'+id+'"'));
  assert.match(app,/posseDsips\.limpar\(\)/);
  assert.match(app,/posseDsips\.carregar\(\)/);
  assert.match(app,/'dsips-cautelas', 'dsips-posse'\]\.includes\(abaAtiva\)/);
  assert.match(nav,/'dsips-posse': \{ titulo: 'Quem está com o quê'/);
  assert.match(ui,/await listarCadastroDsips\('cautelas'\)/);
  assert.match(ui,/uid!==obterUsuario\(\)\?\.uid/);
  assert.doesNotMatch(ui,/salvarCadastroDsips|registrarCautelaDsips|registrarDevolucaoDsips|innerHTML|listarEventosDsips|responsaveis'\)/);
  assert.match(sw,/v1\.13\.30-h\.1-perf-autocomplete/);
});
