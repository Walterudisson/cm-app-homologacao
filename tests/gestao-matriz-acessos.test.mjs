import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOGO_PERMISSOES,FUNCOES_NATIVAS} from '../js/core/permissoes.js';
import {
  PERFIS_NATIVOS,CATALOGO_MATRIZ_GESTAO,MODULOS_MATRIZ,
  classificacaoMatrizPerfil,filtrarMatrizGestao,resumoMatrizGestao,conferirContratoMatriz
} from '../js/modules/gestao/matriz-acessos-model.js';

test('GEST-01 preserva exatamente seis permissões declaradas no legado, sem alterar nomes',()=>{
 const legados=CATALOGO_MATRIZ_GESTAO.filter(x=>x.estado==='legado');
 assert.equal(legados.length,CATALOGO_PERMISSOES.length);
 assert.deepEqual(legados.map(x=>x.id).sort(),CATALOGO_PERMISSOES.map(x=>x.id).sort());
 assert.equal(legados.length,6);
 assert.deepEqual(conferirContratoMatriz(),{valido:true,redundantes:[],legadosAusentes:[]});
});
test('GEST-01 catálogo novo é consulta, sem concessão de permissão',()=>{
 const novos=CATALOGO_MATRIZ_GESTAO.filter(x=>x.estado==='proposta');
 assert.ok(novos.length>=25);
 assert.ok(novos.every(x=>!CATALOGO_PERMISSOES.some(p=>p.id===x.id)));
 for(const proposta of novos)for(const perfil of PERFIS_NATIVOS)
   assert.equal(classificacaoMatrizPerfil(proposta,perfil.id),'a-definir');
 assert.ok(MODULOS_MATRIZ.includes('Gestão'));
 assert.ok(MODULOS_MATRIZ.includes('DSIPS'));
 assert.ok(MODULOS_MATRIZ.includes('Gabinete'));
 assert.ok(MODULOS_MATRIZ.includes('RH'));
 assert.ok(MODULOS_MATRIZ.includes('Patrimônios'));
});
test('GEST-01 compara nativamente perfis apenas quando existe declaração explícita',()=>{
 for(const item of CATALOGO_MATRIZ_GESTAO.filter(x=>x.estado==='legado')){
   for(const perfil of PERFIS_NATIVOS){
     const declarada=FUNCOES_NATIVAS[perfil.id].includes(item.id);
     assert.equal(classificacaoMatrizPerfil(item,perfil.id),declarada?'declarada':'nao-declarada');
   }
 }
 assert.equal(classificacaoMatrizPerfil(CATALOGO_MATRIZ_GESTAO[0],'desconhecido'),'nao-declarada');
});
test('GEST-01 filtros por módulo, situação e texto são composáveis e sem dados reais',()=>{
 const rh=filtrarMatrizGestao({modulo:'RH'});
 assert.ok(rh.length>=4);
 assert.ok(rh.every(x=>x.modulo==='RH'&&x.estado==='proposta'));
 assert.ok(filtrarMatrizGestao({modulo:'Gestão',estado:'legado'}).length>=4);
 assert.ok(filtrarMatrizGestao({termo:'férias'}).some(x=>x.id==='rh.ferias.gerenciar'));
 assert.ok(filtrarMatrizGestao({termo:'PERMISSÕES'}).some(x=>x.id==='usuarios.atribuir_acessos'));
 assert.deepEqual(filtrarMatrizGestao({modulo:'nada'}),[]);
 assert.deepEqual(filtrarMatrizGestao({estado:'legado',modulo:'RH'}),[]);
});
test('GEST-01 todo item tem recurso, ação, estado, escopo e justificativa',()=>{
 for(const item of CATALOGO_MATRIZ_GESTAO){
   assert.ok(item.id&&item.modulo&&item.recurso&&item.acao&&item.escopo&&item.nota);
   assert.ok(Object.isFrozen(item));
 }
 const total=resumoMatrizGestao();
 assert.equal(total.total,CATALOGO_MATRIZ_GESTAO.length);
 assert.equal(total.legado,6);
 assert.equal(total.total,total.legado+total.propostas);
 assert.equal(total.modulos,MODULOS_MATRIZ.length);
 assert.ok(Object.isFrozen(total));
});
