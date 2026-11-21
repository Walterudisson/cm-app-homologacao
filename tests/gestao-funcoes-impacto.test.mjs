import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOGO_PERMISSOES} from '../js/core/permissoes.js';
import {
  descreverPermissaoLegada,permissoesDesconhecidas,prepararPermissoesFuncao,
  analisarImpactoFuncao,resumoImpactoFuncao,mensagemConfirmacaoFuncao
} from '../js/modules/gestao/funcoes-impacto-model.js';

const original=()=>({
  id:'funcao-exemplo',nome:'Exemplo de Função',descricao:'Apoio de demonstração',
  perfilBase:'conferente',
  permissoes:['patrimonios.conferir','divisoes.visualizar']
});
const proposta=o=>({
  nome:o.nome,descricao:o.descricao,perfilBase:o.perfilBase,
  permissoes:[...o.permissoes]
});
test('GEST-02 não altera nem cria permissões além das seis chaves legadas',()=>{
  assert.equal(CATALOGO_PERMISSOES.length,6);
  assert.equal(prepararPermissoesFuncao({selecionadas:['usuarios.visualizar','usuarios.visualizar']}).length,1);
  assert.throws(()=>prepararPermissoesFuncao({selecionadas:['gabinete.agenda.telefone_privado']}),/catálogo legado/);
  assert.throws(()=>prepararPermissoesFuncao({selecionadas:['usuarios.visualizar','chave.inventada']}),/catálogo legado/);
  assert.match(descreverPermissaoLegada('usuarios.visualizar'),/Usuários/);
});
test('GEST-02 nova função mostra prévia mas não atribui acesso a usuário',()=>{
  const novo={nome:'Função Exemplo',descricao:'',perfilBase:'gestor',permissoes:['usuarios.visualizar']};
  const impacto=analisarImpactoFuncao(null,novo);
  assert.equal(impacto.nova,true);
  assert.equal(impacto.mudou,true);
  assert.equal(impacto.totalSelecionadas,1);
  assert.deepEqual(impacto.adicionadas,['usuarios.visualizar']);
  assert.match(resumoImpactoFuncao(impacto),/Nenhum acesso será concedido automaticamente/);
  assert.match(mensagemConfirmacaoFuncao(impacto,novo.nome),/backend/);
});
test('GEST-02 nenhuma alteração é reconhecida mesmo se a ordem dos campos variar',()=>{
  const antigo=original();
  const dados=proposta(antigo);
  dados.permissoes.reverse();
  const analise=analisarImpactoFuncao(antigo,dados);
  assert.equal(analise.nova,false);
  assert.equal(analise.mudou,false);
  assert.equal(analise.alteraConfiguracaoDeAcesso,false);
  assert.deepEqual(analise.adicionadas,[]);
  assert.deepEqual(analise.removidas,[]);
  assert.match(resumoImpactoFuncao(analise),/Nenhuma alteração/);
});
test('GEST-02 diferenças são direcionais e não confundem metadados com configuração',()=>{
  const antigo=original();
  const dados=proposta(antigo);
  dados.permissoes=['usuarios.visualizar','patrimonios.conferir'];
  const r=analisarImpactoFuncao(antigo,dados);
  assert.deepEqual(r.adicionadas,['usuarios.visualizar']);
  assert.deepEqual(r.removidas,['divisoes.visualizar']);
  assert.equal(r.alteraConfiguracaoDeAcesso,true);
  assert.match(mensagemConfirmacaoFuncao(r,antigo.nome),/Adicionadas:/);
  assert.match(mensagemConfirmacaoFuncao(r,antigo.nome),/Removidas:/);
  const apenasNome=analisarImpactoFuncao(antigo,{...proposta(antigo),nome:'Nova descrição de função'});
  assert.equal(apenasNome.mudou,true);
  assert.equal(apenasNome.alteraConfiguracaoDeAcesso,false);
  assert.deepEqual(apenasNome.removidas,[]);
});
test('GEST-02 troca de perfil-base tem aviso e não modifica perfil efetivo de ninguém',()=>{
  const antigo=original();
  const dados={...proposta(antigo),perfilBase:'admin'};
  const impacto=analisarImpactoFuncao(antigo,dados);
  assert.equal(impacto.perfilAlterado,true);
  assert.equal(impacto.baseAnterior,'conferente');
  assert.equal(impacto.baseNova,'admin');
  assert.equal(impacto.alteraConfiguracaoDeAcesso,true);
  assert.match(resumoImpactoFuncao(impacto),/perfil-base alterado/);
  assert.match(mensagemConfirmacaoFuncao(impacto,antigo.nome),/conferente → admin/);
  assert.equal(antigo.perfilBase,'conferente');
});
test('GEST-02 preserva chaves históricas desconhecidas sem permitir novas',()=>{
  const antigo={...original(),permissoes:['usuarios.visualizar','outro.legado.zz','outro.legado.zz']};
  const selecionadas=['patrimonios.conferir'];
  const resultado=prepararPermissoesFuncao({selecionadas,original:antigo});
  assert.deepEqual([...resultado],['outro.legado.zz','patrimonios.conferir']);
  assert.deepEqual([...permissoesDesconhecidas(antigo)],['outro.legado.zz']);
  assert.ok(Object.isFrozen(resultado));
  assert.deepEqual(antigo.permissoes,['usuarios.visualizar','outro.legado.zz','outro.legado.zz']);
  const impacto=analisarImpactoFuncao(antigo,{...proposta(antigo),permissoes:resultado});
  assert.deepEqual(impacto.removidas,['usuarios.visualizar']);
  assert.deepEqual(impacto.adicionadas,['patrimonios.conferir']);
  assert.match(mensagemConfirmacaoFuncao(impacto,antigo.nome),/preservadas sem alteração/);
});
test('GEST-02 prévia só utiliza campos de configuração, nunca dados pessoais ou sessões',()=>{
  const impacto=analisarImpactoFuncao(original(),{...proposta(original()),descricao:'Exemplo revisado'});
  const keys=Object.keys(impacto);
  assert.ok(keys.includes('alteraConfiguracaoDeAcesso'));
  assert.ok(!keys.includes('uids')&&!keys.includes('email')&&!keys.includes('telefone'));
  assert.equal(impacto.mudou,true);
  assert.ok(Object.isFrozen(impacto));
});
