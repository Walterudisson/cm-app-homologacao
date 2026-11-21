import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOGO_PERMISSOES,FUNCOES_NATIVAS} from '../js/core/permissoes.js';
import {
  PERFIS_ACESSO_ROTULOS,resumirVinculoUsuario,
  filtrarUsuariosPorFuncao,resumirPreviaAtribuicao
} from '../js/modules/gestao/usuarios-acessos-model.js';

const usuario=(perfil='conferente')=>({uid:'u-ficticio',nome:'Pessoa Exemplo',perfil,ativo:true,
  divisoesAtribuidas:['Divisão Exemplo A','Divisão Exemplo B']});
const modulos=[{id:'patrimonios',nome:'Patrimônios'},{id:'dsips',nome:'DSIPS'}];

test('GEST-03 perfis nativos são resumidos somente pela fonte legada',()=>{
  const admin=resumirVinculoUsuario(usuario('admin'),{modulos});
  assert.equal(admin.perfilRotulo,'Administrador');
  assert.equal(admin.permissoesDeclaradas.length,FUNCOES_NATIVAS.admin.length);
  assert.equal(admin.funcaoSituacao,'nativa');
  assert.deepEqual([...admin.modulosNavegacao],['Patrimônios','DSIPS']);
  assert.match(admin.divisaoResumo,/não definida/);
  assert.match(admin.nota,/Não certifica acesso no Firebase/);
  assert.equal(CATALOGO_PERMISSOES.length,6);
});
test('GEST-03 conferente só expõe sua atribuição declarada e divisões cadastradas',()=>{
  const c=resumirVinculoUsuario(usuario(),{modulos:[{id:'patrimonios',nome:'Patrimônios'}]});
  assert.equal(c.perfilRotulo,'Conferente');
  assert.equal(c.permissoesDeclaradas.length,1);
  assert.match(c.divisaoResumo,/Divisão Exemplo A/);
  assert.ok(c.permissoesDeclaradas.every(item=>item.origem==='perfil'));
  assert.ok(Object.isFrozen(c));
  assert.ok(Object.isFrozen(c.modulosNavegacao));
});
test('GEST-03 função personalizada não injeta direitos no perfil',()=>{
  const u={...usuario('conferente'),funcaoId:'fun-apoio'};
  const funcoes=[{id:'fun-apoio',nome:'Apoio Setorial',perfilBase:'admin',
    permissoes:['usuarios.gerenciar'],ativo:true}];
  const perfil=resumirVinculoUsuario(u,{funcoes,modulos});
  assert.equal(perfil.funcaoSituacao,'cadastrada');
  assert.equal(perfil.funcaoRotulo,'Apoio Setorial');
  assert.equal(perfil.permissoesDeclaradas.length,1);
  assert.ok(!perfil.permissoesDeclaradas.some(item=>item.id==='usuarios.gerenciar'));
  assert.equal(u.perfil,'conferente');
});
test('GEST-03 função personalizada inativa ou não carregada gera estado distinto',()=>{
  const u={...usuario(),funcaoId:'fun-apoio'};
  assert.equal(resumirVinculoUsuario(u).funcaoSituacao,'nao-verificada');
  const v=resumirVinculoUsuario(u,{funcoes:[{id:'fun-apoio',nome:'Apoio',ativo:false}]});
  assert.equal(v.funcaoSituacao,'inativa');
  const previa=resumirPreviaAtribuicao({perfil:u.perfil,funcaoId:u.funcaoId,
    divisoesAtribuidas:u.divisoesAtribuidas,funcoes:[{id:'fun-apoio',nome:'Apoio',ativo:false}]});
  assert.ok(previa.avisos.some(x=>/inativa/.test(x)));
});
test('GEST-03 concessões individuais são apenas declaradas e chaves desconhecidas não viram permissões exibidas',()=>{
  const u={...usuario('gestor'),permissoes:['usuarios.gerenciar','privado.legado','usuarios.gerenciar']};
  const v=resumirVinculoUsuario(u);
  assert.equal(v.permissoesDeclaradas.filter(x=>x.id==='usuarios.gerenciar').length,1);
  assert.equal(v.permissoesDeclaradas.find(x=>x.id==='usuarios.gerenciar').origem,'adicional');
  assert.deepEqual([...v.chavesDesconhecidas],['privado.legado']);
});
test('GEST-03 contas inativas e perfis sem acesso não são classificados como ativos',()=>{
  const v=resumirVinculoUsuario({...usuario('usuario'),ativo:false});
  assert.equal(v.ativo,false);
  assert.equal(v.permissoesDeclaradas.length,0);
  assert.equal(v.modulosNavegacao.length,0);
  assert.equal(PERFIS_ACESSO_ROTULOS.usuario,'Usuário');
});
test('GEST-03 filtros por função não mutam lista e nem consultam cadastros adicionais',()=>{
  const usuarios=[{uid:'1',funcaoId:'x'},{uid:'2',funcaoId:''},{uid:'3'},{uid:'4',funcaoId:' y '}];
  assert.deepEqual(filtrarUsuariosPorFuncao(usuarios,'com-funcao').map(x=>x.uid),['1','4']);
  assert.deepEqual(filtrarUsuariosPorFuncao(usuarios,'sem-funcao').map(x=>x.uid),['2','3']);
  assert.deepEqual(filtrarUsuariosPorFuncao(usuarios,'todos').map(x=>x.uid),['1','2','3','4']);
  assert.equal(usuarios.length,4);
});
test('GEST-03 prévia de criação reflete perfil, função e divisões sem concessões automáticas',()=>{
  const v=resumirPreviaAtribuicao({perfil:'conferente',funcaoId:'',divisoesAtribuidas:['Divisão Exemplo']});
  assert.match(v.divisaoResumo,/Divisão Exemplo/);
  assert.equal(v.funcaoRotulo,'Somente perfil nativo');
  assert.ok(v.avisos.some(x=>/Nenhuma nova permissão/.test(x)));
  const semDiv=resumirPreviaAtribuicao({perfil:'conferente'});
  assert.ok(semDiv.avisos.some(x=>/sem divisão atribuída/.test(x)));
  const admin=resumirPreviaAtribuicao({perfil:'admin'});
  assert.ok(admin.avisos.some(x=>/verificação adicional/.test(x)));
});
test('GEST-03 preview avisa que divisão fora de conferente não é enviada pelo serviço atual',()=>{
  const v=resumirPreviaAtribuicao({perfil:'gestor',divisoesAtribuidas:['Divisão Exemplo']});
  assert.ok(v.avisos.some(x=>/só envia divisões para Conferentes/.test(x)));
  assert.match(v.divisaoResumo,/não definida/);
});

test('GEST-03 alerta divergência do perfil com função vinculada sem alterar o cadastro',()=>{
  const funcoes=[{id:'gest-funcao',nome:'Função Exemplo',perfilBase:'gestor',ativo:true}];
  const resumo=resumirPreviaAtribuicao({perfil:'admin',funcaoId:'gest-funcao',funcoes});
  assert.equal(resumo.perfilRotulo,'Administrador');
  assert.ok(resumo.avisos.some(item=>/difere do perfil-base/.test(item)));
  assert.equal(funcoes[0].perfilBase,'gestor');
});
