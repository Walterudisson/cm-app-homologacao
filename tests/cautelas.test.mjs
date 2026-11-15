import test from 'node:test';
import assert from 'node:assert/strict';
import { pendente, unidadesPendentes, resumirPosse, descricaoItens } from '../js/modules/dsips/cautelas-model.js';
import { podeAbrirPagina } from '../js/platform/modules.js';
test('saldo pendente e unidades excluem somente devoluções já registradas', () => {
  const item = { quantidade:3, devolvida:1, unidades:[{id:'a',identificacao:'A'},{id:'b',identificacao:'B'}], unidadesDevolvidas:['a'] };
  assert.equal(pendente(item),2); assert.deepEqual(unidadesPendentes(item),[{id:'b',identificacao:'B'}]);
});
test('Quem está com o quê agrega cautelas por responsável/material e ignora encerradas', () => {
  const item = {materialId:'m',nome:'Material',unidade:'un',quantidade:3,devolvida:1,unidades:[],unidadesDevolvidas:[]};
  const base = {responsavelId:'p',responsavelNome:'Pessoa',responsavelMatricula:'123',itens:[item]};
  const grupos = resumirPosse([{...base,id:'a',status:'parcial'},{...base,id:'b',status:'aberta'},{...base,id:'c',status:'encerrada'}]);
  assert.equal(grupos.length,1); assert.equal(grupos[0].materiais[0].quantidade,4);
  assert.deepEqual(grupos[0].cautelas,['a','b']);
});
test('individualizados em posse não incluem identificações já devolvidas', () => {
  const grupos = resumirPosse([{id:'a',status:'parcial',responsavelId:'p',responsavelNome:'Pessoa',itens:[{
    materialId:'m',nome:'Material',unidade:'un',quantidade:2,devolvida:1,
    unidades:[{id:'1',identificacao:'SER-1'},{id:'2',identificacao:'SER-2'}],unidadesDevolvidas:['1']
  }]}]);
  assert.deepEqual(grupos[0].materiais[0].identificacoes,['SER-2']);
  assert.equal(descricaoItens(grupos[0].materiais),'Material: 1 un');
});
test('consulta de cautelas e posse é operacional, sem ampliar acesso de quem não tem DSIPS', () => {
  for (const pagina of ['dsips-cautelas','dsips-posse']) {
    assert.equal(podeAbrirPagina({perfil:'conferente',modulos:['dsips']},pagina),true);
    assert.equal(podeAbrirPagina({perfil:'gestor',modulos:['patrimonios']},pagina),false);
  }
});
