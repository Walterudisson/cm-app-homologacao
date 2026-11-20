import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  podeConsultarEstoqueDsips, podeRegistrarSaldoDsips,
  identificadoresDoTextoDsips, materiaisPendentesSaldoDsips,
  resumoEstoqueDsips, prepararSaldoInicialDsips
} from '../js/modules/dsips/estoque-model.js';
const ler=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const materiais=[
  {id:'m1',nome:'Colete',controle:'quantidade',unidade:'un',ativo:true,saldoInicialRegistrado:false},
  {id:'m2',nome:'Rádio',controle:'individualizado',unidade:'un',ativo:true,saldoInicialRegistrado:true},
  {id:'m3',nome:'Lanterna',controle:'quantidade',unidade:'un',ativo:false,saldoInicialRegistrado:false},
  {id:'m4',nome:'Estojo',controle:'quantidade',unidade:'kit',ativo:true,saldoInicialRegistrado:false}
];
const locais=[{id:'l1',nome:'Almoxarifado',ativo:true},{id:'l2',nome:'Local antigo',ativo:false}];
const estoque=[{materialId:'m2',localId:'l1',total:3,disponivel:2,emCautela:1},
  {materialId:'m4',localId:'l1',total:0,disponivel:0,emCautela:0}];

test('perfil DSIPS mantém consulta separada de gravação sem conceder permissões',()=>{
  assert.equal(podeConsultarEstoqueDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeRegistrarSaldoDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeRegistrarSaldoDsips({perfil:'admin',ativo:true}),true);
  assert.equal(podeRegistrarSaldoDsips({perfil:'gestor',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeRegistrarSaldoDsips({perfil:'gestor',ativo:true,modulos:['patrimonios']}),false);
  assert.equal(podeRegistrarSaldoDsips({perfil:'usuario',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeRegistrarSaldoDsips({perfil:'admin',ativo:false}),false);
  assert.equal(podeRegistrarSaldoDsips({perfil:'admin',ativo:true,autorizacaoVersao:2}),false);
});
test('pendências e resumo consideram saldos zero, mas não somam unidades heterogêneas',()=>{
  assert.deepEqual(materiaisPendentesSaldoDsips(materiais,estoque).map(m=>m.id),['m1']);
  assert.deepEqual(resumoEstoqueDsips(materiais,estoque),{
    inicializados:2,pendentes:1,identificacoesDisponiveis:2
  });
});
test('saldo por quantidade envia contrato exato da Callable de HML',()=>{
  assert.deepEqual(prepararSaldoInicialDsips({
    materialId:'m1',localId:'l1',quantidade:'25',motivo:'  Conferência de teste  ',identificadores:'não aplicável'
  },{materiais,locais,estoque}),{
    materialId:'m1',localId:'l1',quantidade:25,motivo:'Conferência de teste',identificadores:[]
  });
  assert.equal(prepararSaldoInicialDsips({
    materialId:'m1',localId:'l1',quantidade:'0',motivo:'Teste'
  },{materiais,locais,estoque}).quantidade,0);
});
test('identificados contam linhas, removem brancos e aceitam duas identificações únicas',()=>{
  const ids=identificadoresDoTextoDsips('SER-001\r\n\n SER-002 \n');
  assert.deepEqual(ids,['SER-001','SER-002']);
  assert.deepEqual(prepararSaldoInicialDsips({
    materialId:'m2',localId:'l1',quantidade:'2',motivo:'Teste',identificadores:'SER-001\nSER-002'
  },{materiais:materiais.map(m=>m.id==='m2'?{...m,saldoInicialRegistrado:false}:m),
      locais,estoque:[]}),{
    materialId:'m2',localId:'l1',quantidade:2,motivo:'Teste',identificadores:['SER-001','SER-002']
  });
});
test('não permite local inativo, material inicializado, quantidade fracionada ou identificações duplicadas',()=>{
  const origem={materialId:'m1',localId:'l1',quantidade:'2',motivo:'Conferência'};
  for(const alteracao of [
    {materialId:'m2'}, {materialId:'m3'}, {materialId:'m4'}, {materialId:'desconhecido'},
    {localId:'l2'},{localId:'desconhecido'},
    {quantidade:'1.5'},{quantidade:'-1'},{quantidade:'1000001'},{quantidade:''},{motivo:'   '}
  ]) assert.throws(()=>prepararSaldoInicialDsips({...origem,...alteracao},{materiais,locais,estoque}));
  const opts={materiais:materiais.map(m=>m.id==='m2'?{...m,saldoInicialRegistrado:false}:m),locais,estoque:[]};
  for(const ids of ['SÉR-001\nser-001','A\n'.repeat(201),'X'.repeat(121)]) {
    assert.throws(()=>prepararSaldoInicialDsips({materialId:'m2',localId:'l1',motivo:'Teste',identificadores:ids},opts));
  }
});
test('Estoque fica no CMAPP principal com controle de sessão, confirmação e sem edição de saldo',async()=>{
  const [html,app,nav,ui,service,sw,fb,css]=await Promise.all([
    ler('index.html'),ler('app.js'),ler('js/ui/navigation.js'),
    ler('js/modules/dsips/estoque-ui.js'),ler('js/modules/dsips/service.js'),
    ler('service-worker.js'),ler('js/config/firebase.js'),ler('app.css')
  ]);
  for(const id of ['sec-dsips-estoque','tab-btn-dsips-estoque','dsips-estoque-form',
    'dsips-estoque-new','dsips-estoque-list','dsips-estoque-unidades',
    'dsips-estoque-editor-status','dsips-estoque-save']) assert.ok(html.includes('id="'+id+'"'),id);
  assert.equal((html.match(/id="view-login"/g)||[]).length,1);
  assert.match(nav,/'dsips-estoque': \{ titulo: 'Estoque DSIPS'/);
  assert.match(app,/estoqueDsips\.limpar\(\)/);
  assert.match(app,/estoqueDsips\.carregar\(\)/);
  assert.match(app,/tab-btn-dsips-estoque/);
  assert.match(app,/confirmar: confirmarAcao/);
  assert.match(app,/'dsips-materiais', 'dsips-cadastros', 'dsips-estoque'/);
  assert.match(ui,/await confirmar\(\{/);
  assert.match(ui,/await registrarSaldoInicialDsips\(\{ \.\.\.pedido, operacaoId \}\)/);
  assert.match(ui,/pendente\.assinatura !== assinatura/);
  assert.match(ui,/uid !== obterUsuario\(\)\?\.uid/);
  assert.match(ui,/epoca !== sessao/);
  assert.match(ui,/if \(!podeGravar\(\)/);
  assert.match(ui,/listarUnidadesDsips\(materialId\)/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
  assert.doesNotMatch(ui,/deleteDoc|updateDoc|setDoc/);
  assert.match(service,/gravarDsips\('dsipsRegistrarSaldoInicial',dados\)/);
  assert.match(sw,/v1\.13\.35-h\.1-qa-acesso/);
  assert.match(sw,/\.\/js\/modules\/dsips\/estoque-model\.js/);
  assert.match(sw,/\.\/js\/modules\/dsips\/estoque-ui\.js/);
  assert.match(html,/app\.js\?v=1\.13\.35-h\.1/);
  assert.match(css,/\.dsips-estoque-grid/);
  assert.match(fb,/projectId: "cm-app-homologacao"/);
  assert.doesNotMatch(fb,/projectId: "patrimonioscm"/);
});

