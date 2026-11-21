import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTRATO_IDENTIDADE,projetarMapaInstitucional,filtrarMapaInstitucional,
  avaliarReferenciaResponsavelDsips,avaliarReferenciaGabinete
} from '../js/modules/gestao/pessoas-vinculos-model.js';

const usuarios=[
  {uid:'uid-ana',nome:'Ana Exemplo',email:'ana@example.invalid',perfil:'admin',ativo:true,
    divisoesAtribuidas:['Divisão Azul']},
  {uid:'uid-bia',nome:'Bia Exemplo',email:'bia@example.invalid',perfil:'conferente',ativo:true,pessoaId:'pessoa-002'},
  {uid:'uid-cai',nome:'Caio Exemplo',email:'caio@example.invalid',ativo:false}
];
const divisoes=[
  {id:'div-azul',nome:'Divisão Azul',responsavelPrincipalUid:'uid-ana',responsavelPrincipalNome:'Ana Exemplo',
    responsavelSubstitutoUid:'uid-bia',responsavelSubstitutoNome:'Bia Exemplo'},
  {id:'div-verde',nome:'Divisão Verde',responsavelPrincipalNome:'Ana Exemplo'},
  {id:'div-gama',nome:'Divisão Gama',responsavelPrincipalUid:'uid-fantasma',responsavelPrincipalNome:'Usuário ausente'},
  {id:'div-cai',nome:'Divisão Caio',responsavelPrincipalUid:'uid-cai',responsavelPrincipalNome:'Caio Exemplo'},
  {id:'div-alt',nome:'Divisão Antiga',responsavelPrincipalUid:'uid-ana',responsavelPrincipalNome:'Ana Antiga'},
  {id:'div-erro',nome:'Divisão Erro',responsavelPrincipalUid:'uid-bia',
    responsavelSubstitutoUid:'uid-bia'}
];
test('GEST-04 referências são criadas exclusivamente por UID e ID explícitos',()=>{
  const r=projetarMapaInstitucional({usuarios,divisoes});
  assert.equal(r.estatisticas.contas,3);
  assert.equal(r.estatisticas.divisoes,6);
  assert.equal(r.estatisticas.contasSemPessoaId,2);
  assert.equal(r.estatisticas.contasComPessoaId,1);
  assert.equal(r.pessoas[0].uid,'uid-ana');
  assert.equal(r.pessoas[0].pessoaId,'');
  assert.equal(r.pessoas[1].pessoaId,'pessoa-002');
  assert.equal(r.pessoas[0].tipoIdentidade,'somente-conta');
  assert.equal(r.pessoas[1].tipoIdentidade,'pessoa-id-informado');
  assert.equal(CONTRATO_IDENTIDADE.pessoa,'pessoaId');
});
test('GEST-04 vínculo por UID é confirmado e substituto opcional não é pendência',()=>{
  const r=projetarMapaInstitucional({usuarios,divisoes});
  const azul=r.vinculos.filter(x=>x.divisaoId==='div-azul');
  assert.equal(azul.length,2);
  assert.ok(azul.every(x=>x.status==='confirmado'&&x.porUid));
  assert.equal(r.pessoas[0].vinculos.filter(x=>x.divisaoId==='div-azul').length,1);
  assert.ok(!r.pendencias.some(p=>p.id==='div-verde:substituto'));
});
test('GEST-04 nomes históricos sem UID não viram vínculo mesmo com nome igual',()=>{
  const r=projetarMapaInstitucional({usuarios,divisoes});
  const pend=r.vinculos.find(x=>x.divisaoId==='div-verde'&&x.tipo==='principal');
  assert.equal(pend.status,'somente-nome');
  assert.equal(pend.porUid,false);
  assert.ok(!r.pessoas[0].vinculos.some(x=>x.divisaoId==='div-verde'));
});
test('GEST-04 detecta UID ausente, conta inativa, nome desatualizado e responsável repetido',()=>{
  const r=projetarMapaInstitucional({usuarios,divisoes});
  const principal=id=>r.vinculos.find(x=>x.divisaoId===id&&x.tipo==='principal').status;
  assert.equal(principal('div-gama'),'nao-localizado');
  assert.equal(principal('div-cai'),'conta-inativa');
  assert.equal(principal('div-alt'),'nome-desatualizado');
  assert.equal(principal('div-erro'),'mesma-conta');
  assert.equal(r.vinculos.find(x=>x.divisaoId==='div-erro'&&x.tipo==='substituto').status,'mesma-conta');
});
test('GEST-04 filtros procuram nome, e-mail e divisão; nunca juntam IDs pelo nome',()=>{
  const r=projetarMapaInstitucional({usuarios,divisoes});
  assert.equal(filtrarMapaInstitucional(r,{visao:'pessoas',termo:'Ana'}).length,1);
  assert.equal(filtrarMapaInstitucional(r,{visao:'pessoas',termo:'Divisão Azul'}).length,2);
  assert.equal(filtrarMapaInstitucional(r,{visao:'pessoas',situacao:'pendentes'}).length,2);
  assert.equal(filtrarMapaInstitucional(r,{visao:'pessoas',situacao:'confirmados'}).length,1);
  assert.equal(filtrarMapaInstitucional(r,{visao:'divisoes',situacao:'confirmados'}).length,1);
  assert.equal(filtrarMapaInstitucional(r,{visao:'divisoes',situacao:'pendentes'}).length,5);
  assert.equal(filtrarMapaInstitucional(r,{visao:'pendencias',termo:'UID não localizado'}).length,1);
  assert.equal(filtrarMapaInstitucional(null,{}).length,0);
});
test('GEST-04 pistas de duplicidade não fundem UIDs nem criam pessoaId',()=>{
  const repetidos=[
    {uid:'c1',nome:'Nome Igual',email:'contato1@example.invalid'},
    {uid:'c2',nome:'Nome Igual',email:'contato2@example.invalid'}
  ];
  const r=projetarMapaInstitucional({usuarios:repetidos,divisoes:[]});
  assert.equal(r.pessoas.length,2);
  assert.ok(r.pistas.some(p=>p.tipo==='nome'));
  assert.ok(r.pendencias.some(p=>p.tipo==='possivel-duplicidade'));
  assert.ok(r.pessoas.every(p=>p.pessoaId===''));
  assert.ok(r.pessoas[0].uid!==r.pessoas[1].uid);
});
test('GEST-04 DSIPS só usa responsavelUid ou origem usuarios com id',()=>{
  const a=avaliarReferenciaResponsavelDsips({responsavelUid:'uid-ana',responsavelNome:'Qualquer nome'},usuarios);
  assert.equal(a.status,'uid-identificado');
  assert.equal(a.vinculado,true);
  const b=avaliarReferenciaResponsavelDsips({responsavelOrigem:'usuarios',responsavelId:'uid-bia'},usuarios);
  assert.equal(b.status,'uid-identificado');
  const c=avaliarReferenciaResponsavelDsips({responsavelId:'uid-ana',responsavelNome:'Ana Exemplo'},usuarios);
  assert.equal(c.status,'referencia-legada');
  assert.equal(c.vinculado,false);
  const d=avaliarReferenciaResponsavelDsips({responsavelUid:'inexistente'},usuarios);
  assert.equal(d.status,'uid-nao-localizado');
});
test('GEST-04 Gabinete não incorpora protótipos por nome nem contato sem origem autorizada',()=>{
  const a=avaliarReferenciaGabinete({origem:'usuarios',uid:'uid-ana'},usuarios);
  assert.equal(a.status,'uid-identificado');
  const b=avaliarReferenciaGabinete({tipo:'pessoa',uid:'uid-ana',origem:'usuarios-referencia-demo'},usuarios);
  assert.equal(b.vinculado,false);
  const c=avaliarReferenciaGabinete({tipo:'pessoa',nome:'Ana Exemplo'},usuarios);
  assert.equal(c.status,'sem-referencia-autorizada');
});
test('GEST-04 modelo puro, imutável, sem mexer nas entradas',()=>{
  const before=JSON.stringify({usuarios,divisoes});
  const r=projetarMapaInstitucional({usuarios,divisoes});
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.pessoas));
  assert.ok(Object.isFrozen(r.pendencias));
  assert.ok(Object.isFrozen(r.estatisticas));
  assert.equal(JSON.stringify({usuarios,divisoes}),before);
});
