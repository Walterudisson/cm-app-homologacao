import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  podeConsultarCautelasDsips,podeRegistrarCautelasDsips,
  saldoDisponivelDsips,unidadesDisponiveisDsips,
  validarCautelaDsips,filtrarCautelasDsips,STATUS_CAUTELA_DSIPS
} from '../js/modules/dsips/registro-cautelas-model.js';
const ler=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const responsaveis=[{id:'u1',nome:'Usuário Básico',ativo:true},{id:'u2',nome:'Inativo',ativo:false}];
const materiais=[
  {id:'m1',nome:'Colete',ativo:true,controle:'quantidade',unidade:'un'},
  {id:'m2',nome:'Rádio',ativo:true,controle:'individualizado',unidade:'un'},
  {id:'m3',nome:'Inativo',ativo:false,controle:'quantidade',unidade:'un'}
];
const estoque=[
  {materialId:'m1',disponivel:5,total:5,emCautela:0},
  {materialId:'m2',disponivel:2,total:2,emCautela:0},
  {materialId:'m3',disponivel:2,total:2,emCautela:0}
];
const unidadesPorMaterial={m2:[
  {id:'e1',identificacao:'SER-1',situacao:'disponivel'},
  {id:'e2',identificacao:'SER-2',situacao:'disponivel'},
  {id:'e3',identificacao:'SER-3',situacao:'em_cautela',cautelaId:'antiga'}
]};
const ctx={responsaveis,materiais,estoque,unidadesPorMaterial};

test('conferente autorizado consulta sem cadastrar; somente admin e gestor DSIPS gravam',()=>{
  assert.equal(podeConsultarCautelasDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeRegistrarCautelasDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeRegistrarCautelasDsips({perfil:'admin',ativo:true}),true);
  assert.equal(podeRegistrarCautelasDsips({perfil:'gestor',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeRegistrarCautelasDsips({perfil:'gestor',ativo:true,modulos:['patrimonios']}),false);
  assert.equal(podeRegistrarCautelasDsips({perfil:'usuario',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeRegistrarCautelasDsips({perfil:'admin',ativo:false}),false);
  assert.equal(podeRegistrarCautelasDsips({perfil:'admin',ativo:true,autorizacaoVersao:2}),false);
});
test('cautela para UID de usuário básico inclui quantidades e IDs de unidades, não dados da conta',()=>{
  const item=validarCautelaDsips({
    responsavelId:'u1',observacoes:'  Teste  ',itens:[
      {materialId:'m1',quantidade:2,unidadeIds:[]},
      {materialId:'m2',quantidade:2,unidadeIds:['e1','e2']}
    ]
  },ctx);
  assert.deepEqual(item,{
    responsavelId:'u1',observacoes:'Teste',
    itens:[{materialId:'m1',quantidade:2,unidadeIds:[]},
      {materialId:'m2',quantidade:2,unidadeIds:['e1','e2']}]
  });
  assert.equal(Object.hasOwn(item,'email'),false);
});
test('saldo considera todas as posições; não seleciona unidades sob cautela',()=>{
  assert.equal(saldoDisponivelDsips('m1',[...estoque,{materialId:'m1',disponivel:3}]),8);
  assert.deepEqual(unidadesDisponiveisDsips(unidadesPorMaterial.m2).map(x=>x.id),['e1','e2']);
});
test('recusa usuário inativo, material inativo, duplicatas, saldo insuficiente ou quantidade fracionada',()=>{
  const base={responsavelId:'u1',observacoes:'',itens:[{materialId:'m1',quantidade:2,unidadeIds:[]}]};
  for(const change of [
    {responsavelId:'u2'},{responsavelId:'inexistente'},
    {itens:[]},{itens:[{materialId:'m1',quantidade:2,unidadeIds:[]},{materialId:'m1',quantidade:1,unidadeIds:[]}]},
    {itens:[{materialId:'m3',quantidade:1,unidadeIds:[]}]},
    {itens:[{materialId:'m1',quantidade:6,unidadeIds:[]}]},
    {itens:[{materialId:'m1',quantidade:1.5,unidadeIds:[]}]},
    {itens:[{materialId:'m1',quantidade:0,unidadeIds:[]}]},
    {itens:[{materialId:'m1',quantidade:1,unidadeIds:['e1']}]},
    {observacoes:'x'.repeat(501)}
  ])assert.throws(()=>validarCautelaDsips({...base,...change},ctx));
});
test('identificações precisam estar disponíveis, únicas e coincidir com a quantidade',()=>{
  const b={responsavelId:'u1',itens:[{materialId:'m2',quantidade:2,unidadeIds:['e1','e2']}]};
  for(const ids of [['e1','e1'],['e1','e3'],['e1'],['e1','invalido']]){
    assert.throws(()=>validarCautelaDsips({...b,itens:[{materialId:'m2',quantidade:2,unidadeIds:ids}]},ctx));
  }
});
test('filtro consulta abertas, parciais e encerradas sem apagar histórico',()=>{
  const cautelas=[
    {id:'a',status:'aberta',responsavelNome:'João Teste',itens:[{nome:'Rádio'}]},
    {id:'b',status:'parcial',responsavelNome:'Maria',itens:[{nome:'Colete'}]},
    {id:'c',status:'encerrada',responsavelNome:'Antônio',itens:[{nome:'Lanterna'}]}
  ];
  assert.equal(filtrarCautelasDsips(cautelas,'joao').length,1);
  assert.equal(filtrarCautelasDsips(cautelas,'colete').length,1);
  assert.equal(filtrarCautelasDsips(cautelas,'','parcial').length,1);
  assert.equal(filtrarCautelasDsips(cautelas,'','encerrada').length,1);
  assert.equal(STATUS_CAUTELA_DSIPS.aberta,'Sem devolução');
});
test('cautela integra login e navegador do CMAPP, sem rota ou cadastro de responsáveis paralelo',async()=>{
  const [html,app,nav,ui,service,sw,fb,css]=await Promise.all([
    ler('index.html'),ler('app.js'),ler('js/ui/navigation.js'),
    ler('js/modules/dsips/registro-cautelas-ui.js'),ler('js/modules/dsips/service.js'),
    ler('service-worker.js'),ler('js/config/firebase.js'),ler('app.css')
  ]);
  for(const id of [
    'sec-dsips-cautelas','tab-btn-dsips-cautelas','dsips-cautelas-form',
    'dsips-cautelas-user-search','dsips-cautelas-material','dsips-cautelas-quantity',
    'dsips-cautelas-cart','dsips-cautelas-list','dsips-cautelas-status',
    'dsips-cautelas-submit','dsips-cautelas-refresh'
  ]) assert.ok(html.includes('id="'+id+'"'),id);
  assert.equal((html.match(/id="view-login"/g)||[]).length,1);
  assert.match(nav,/'dsips-cautelas': \{ titulo: 'Cautelas DSIPS'/);
  assert.match(app,/cautelasDsips\.limpar\(\)/);
  assert.match(app,/cautelasDsips\.carregar\(\)/);
  assert.match(app,/tab-btn-dsips-cautelas/);
  assert.match(app,/confirmar: confirmarAcao/);
  assert.match(app,/'dsips-cadastros', 'dsips-estoque', 'dsips-cautelas'/);
  assert.match(ui,/listarCadastroDsips\('responsaveis'\)/);
  assert.match(ui,/await confirmar\(\{/);
  assert.match(ui,/await registrarCautelaDsips\(\{\.\.\.pedido,operacaoId\}\)/);
  assert.match(ui,/pendente\.assinatura!==assinatura/);
  assert.match(ui,/uid!==obterUsuario\(\)\?\.uid/);
  assert.match(ui,/epoca!==sessao/);
  assert.match(ui,/if\(!podeGravar\(\)/);
  assert.match(ui,/listarUnidadesDsips\(material.id\)/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
  assert.match(ui,/await registrarCautelaDsips\(\{\.\.\.pedido,operacaoId\}\)/);
  assert.match(service,/httpsCallable\(functions, 'dsipsRegistrarCautela'\)/);
  assert.match(service,/httpsCallable\(functions, 'dsipsListarResponsaveis'\)/);
  assert.match(sw,/v1\.13\.18-h\.1-dsips-historico/);
  assert.match(sw,/\.\/js\/modules\/dsips\/registro-cautelas-model\.js/);
  assert.match(sw,/\.\/js\/modules\/dsips\/registro-cautelas-ui\.js/);
  assert.match(html,/app\.js\?v=1\.13\.18-h\.1/);
  assert.match(css,/\.dsips-cautelas-grid/);
  assert.match(fb,/projectId: "cm-app-homologacao"/);
  assert.doesNotMatch(fb,/projectId: "patrimonioscm"/);
});
