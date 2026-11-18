import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { podeDevolverCautelaDsips, itensPendentesDevolucaoDsips,
  prepararDevolucaoDsips, devolucaoIntegralDsips, criarReciboDevolucaoDsips
} from '../js/modules/dsips/devolucoes-model.js';
const ler=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const cautela={
  id:'c1',status:'parcial',responsavelNome:'Usuário Teste',responsavelAtivo:false,
  itens:[
    {materialId:'m1',nome:'Colete',controle:'quantidade',unidade:'un',quantidade:5,devolvida:2,ativo:false},
    {materialId:'m2',nome:'Rádio',controle:'individualizado',unidade:'un',quantidade:3,devolvida:1,
      unidades:[{id:'u1',identificacao:'SER-1'},{id:'u2',identificacao:'SER-2'},{id:'u3',identificacao:'SER-3'}],
      unidadesDevolvidas:['u1']},
    {materialId:'m3',nome:'Maleta',controle:'quantidade',unidade:'un',quantidade:1,devolvida:1}
  ]
};
const item=(materialId,quantidade,unidadeIds=[])=>({materialId,quantidade,unidadeIds});
test('cautela aberta ou parcial possui devolução; encerrada ou sem pendências não possui',()=>{
  assert.equal(podeDevolverCautelaDsips(cautela),true);
  assert.equal(podeDevolverCautelaDsips({...cautela,status:'aberta'}),true);
  assert.equal(podeDevolverCautelaDsips({...cautela,status:'encerrada'}),false);
  assert.equal(podeDevolverCautelaDsips({...cautela,itens:[cautela.itens[2]]}),false);
  assert.equal(podeDevolverCautelaDsips(null),false);
});
test('pendências preservam identificações originais e ignoram unidades já devolvidas e itens quitados',()=>{
  const dados=itensPendentesDevolucaoDsips(cautela);
  assert.deepEqual(dados.map(i=>[i.materialId,i.entregue,i.devolvida,i.pendente]),
    [['m1',5,2,3],['m2',3,1,2]]);
  assert.deepEqual(dados[1].unidades.map(u=>u.id),['u2','u3']);
});
test('retorno parcial usa contrato da Callable com cautelaId e não depende de cadastros ativos',()=>{
  const itens=[item('m1',1),item('m2',1,['u3'])];
  assert.deepEqual(prepararDevolucaoDsips(cautela,{itens,observacoes:'  Teste  '}),{
    cautelaId:'c1',itens,observacoes:'Teste'
  });
  assert.equal(cautela.itens[0].devolvida,2);
});
test('devolver tudo seleciona exclusivamente quantidades e unidades ainda pendentes, sem gravar',()=>{
  const itens=devolucaoIntegralDsips(cautela);
  assert.deepEqual(itens,[item('m1',3),item('m2',2,['u2','u3'])]);
  assert.deepEqual(prepararDevolucaoDsips(cautela,{itens}).itens,itens);
  assert.deepEqual(devolucaoIntegralDsips({...cautela,status:'encerrada'}),[]);
});
test('rejeita devolução vazia, excesso, fracionamento, material repetido e já devolvido',()=>{
  for(const itens of [[],[item('m1',4)],[item('m1',1.5)],[item('m1',0)],[item('m1',-1)],
    [item('m1',1),item('m1',1)],[item('m3',1)],[item('inexistente',1)],[item('m1',1,['u2'])]]) {
    assert.throws(()=>prepararDevolucaoDsips(cautela,{itens}));
  }
  assert.throws(()=>prepararDevolucaoDsips({...cautela,status:'encerrada'},{itens:[item('m1',1)]}));
  assert.throws(()=>prepararDevolucaoDsips(cautela,{itens:[item('m1',1)],observacoes:'a'.repeat(501)}));
});
test('rejeita identificações repetidas, de outra cautela, já devolvidas ou quantidade incoerente',()=>{
  for(const i of [item('m2',2,['u2','u2']),item('m2',1,['u1']),item('m2',1,['externa']),
    item('m2',2,['u2']),item('m2',1,['u2','u3'])]){
    assert.throws(()=>prepararDevolucaoDsips(cautela,{itens:[i]}));
  }
});
test('reenvio exato conserva operacaoId; payload diferente recebe novo identificador',()=>{
  const pedido=prepararDevolucaoDsips(cautela,{itens:[item('m1',1)]});
  let chamadas=0;const id=()=>String(++chamadas);
  const a=criarReciboDevolucaoDsips(pedido,null,id);
  const b=criarReciboDevolucaoDsips(structuredClone(pedido),a,id);
  const c=criarReciboDevolucaoDsips({...pedido,itens:[item('m1',2)]},b,id);
  assert.equal(a,b);assert.equal(a.operacaoId,'1');assert.equal(c.operacaoId,'2');
});
test('devolução integra Cautelas com confirmação, acesso, sessão e recuperação de resposta incerta',async()=>{
  const [html,app,ui,service,sw,css]=await Promise.all([
    ler('index.html'),ler('app.js'),ler('js/modules/dsips/registro-cautelas-ui.js'),
    ler('js/modules/dsips/service.js'),ler('service-worker.js'),ler('app.css')
  ]);
  for(const id of ['dsips-devolucao-editor','dsips-devolucao-form','dsips-devolucao-campos',
    'dsips-devolucao-itens','dsips-devolucao-tudo','dsips-devolucao-submit','dsips-devolucao-status'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(ui,/if\(podeEscrever&&podeDevolverCautelaDsips\(cautela\)\)/);
  assert.match(ui,/if\(!podeGravar\(\)\|\|!pronto\|\|carregando\|\|gravando\|\|confirmando/);
  assert.match(ui,/aceito=await confirmar\(\{titulo:'Confirmar devolução dos materiais\?'/);
  assert.match(ui,/await registrarDevolucaoDsips\(\{\.\.\.pedido,operacaoId\}\)/);
  assert.match(ui,/reciboDevolucao=criarReciboDevolucaoDsips/);
  assert.match(ui,/devolucaoCampos\.disabled = bloqueado \|\| envioIncerto/);
  assert.match(ui,/epoca!==sessao\|\|uid!==obterUsuario\(\)\?\.uid/);
  assert.match(ui,/fecharDevolucao\(\);\s*notificar\('Devolução registrada no HML.'/);
  const preencher=ui.slice(ui.indexOf('function preencherDevolucaoIntegral()'),ui.indexOf('async function salvarDevolucao('));
  assert.doesNotMatch(preencher,/registrarDevolucaoDsips|salvarDevolucao\(/);
  assert.match(service,/httpsCallable\(functions, 'dsipsRegistrarDevolucao'\)/);
  assert.match(app,/registro-cautelas-ui\.js\?v=1\.13\.16-h\.2/);
  assert.match(sw,/v1\.13\.16-h\.2-dsips-devolucoes/);
  assert.match(sw,/\.\/js\/modules\/dsips\/devolucoes-model\.js/);
  assert.match(css,/\.dsips-devolucao-item/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
});
