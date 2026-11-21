import test from 'node:test';
import assert from 'node:assert/strict';
import {criarOrgaosGabineteEmMemoria,validarOrgaoGabinete} from '../js/modules/gabinete/orgaos-model.js';
import {criarCadastroGabineteEmMemoria} from '../js/modules/gabinete/cadastro-model.js';
import {criarDiretorioGabinete,contatoProprioAutorizado,iniciaisInstitucionais} from '../js/modules/gabinete/diretorio-referencias.js';

const hoje=()=>'2026-11-21';
function inicio(){
  let usuario={uid:'admin-teste',nome:'Usuário Teste',email:'user@example.invalid',divisoesAtribuidas:['Unidade Alfa']};
  let foto='https://example.invalid/meu-perfil.webp';
  const orgaos=criarOrgaosGabineteEmMemoria({hoje});
  const cadastro=criarCadastroGabineteEmMemoria({hoje});
  orgaos.iniciar(usuario.uid);cadastro.iniciar(usuario.uid);
  const diretorio=criarDiretorioGabinete({cadastro,orgaos,obterUsuario:()=>usuario,obterFotoPropria:()=>foto});
  return {orgaos,cadastro,diretorio,getUsuario:()=>usuario,definirUsuario:v=>{usuario=v;},definirFoto:v=>{foto=v;}};
}
test('GAB-07.1 não cria contas internas e projeta apenas o titular autenticado',()=>{
 const {diretorio}=inicio();
 assert.equal(diretorio.listar().length,13);
 const proprio=diretorio.obter('self:admin-teste');
 assert.equal(proprio.uid,'admin-teste');
 assert.equal(proprio.nome,'Usuário Teste');
 assert.equal(proprio.origem,'usuarios');
 assert.equal(proprio.somenteLeitura,true);
 assert.equal(diretorio.fotoDoContato(proprio),'https://example.invalid/meu-perfil.webp');
 assert.equal(diretorio.fotoDoContato(diretorio.obter('demo-pessoa-001')),'');
 assert.equal(iniciaisInstitucionais('Pessoa Exemplo A'),'PA');
 assert.equal(contatoProprioAutorizado({uid:'',nome:'X'}),null);
 assert.throws(()=>diretorio.criar({tipo:'pessoa',nome:'Nova Pessoa'}),/Gestão/);
 assert.throws(()=>diretorio.editar('demo-pessoa-001',{}),/Gestão/);
 assert.throws(()=>diretorio.excluir('self:admin-teste'),/Gestão/);
});
test('GAB-07.1 login de outro usuário não herda foto nem contato próprio',()=>{
 const s=inicio();
 s.cadastro.iniciar('uid-segundo');s.orgaos.iniciar('uid-segundo');
 assert.equal(s.diretorio.obter('self:admin-teste'),null);
 assert.equal(s.diretorio.listar().some(c=>c.uid==='admin-teste'),false);
 s.definirUsuario({uid:'uid-segundo',nome:'Outro Usuário'});
 assert.equal(s.diretorio.obter('self:uid-segundo').nome,'Outro Usuário');
 s.definirFoto('');assert.equal(s.diretorio.fotoDoContato(s.diretorio.obter('self:uid-segundo')),'');
});
test('GAB-07.1 órgãos externos aparecem uma vez por referência, sem usuários criados',()=>{
 const s=inicio();
 assert.equal(s.orgaos.listar().length,2);
 const org=s.orgaos.criar({nome:'Órgão Exemplo Z',sigla:'OEZ',cidade:'Curitiba'});
 assert.equal(s.diretorio.obter('org:'+org.id).nome,'Órgão Exemplo Z');
 assert.equal(s.diretorio.obter('org:'+org.id).origem,'orgaos');
 assert.equal(s.diretorio.listar().filter(x=>x.id==='org:'+org.id).length,1);
 assert.throws(()=>s.orgaos.criar({nome:'ÓRGÃO EXEMPLO Z'}),{codigo:'duplicado'});
 assert.throws(()=>validarOrgaoGabinete({nome:'Órgão Exemplo',cpf:'000'}),{codigo:'proibido'});
});
test('GAB-07.1 vincula contato externo por id e reflete alteração do órgão',()=>{
 const s=inicio();
 const id='demo-org-001';
 const contato=s.diretorio.criar({tipo:'externo',nome:'Atendimento Externo Teste',orgaoId:id,unidade:'ignorada',email:'teste@example.invalid'});
 assert.equal(contato.orgaoId,id);
 assert.equal(s.diretorio.obter(contato.id).unidade,'Órgão Externo Alfa (exemplo)');
 const antiga=s.orgaos.obter(id);
 s.orgaos.editar(id,{nome:'Órgão Externo Renomeado',sigla:antiga.sigla,categoria:antiga.categoria,cidade:antiga.cidade,telefone:antiga.telefone,email:antiga.email});
 assert.equal(s.diretorio.obter(contato.id).unidade,'Órgão Externo Renomeado');
 assert.throws(()=>s.orgaos.arquivar(id,{vinculosAtivos:2}),{codigo:'vinculo'});
 assert.throws(()=>s.diretorio.criar({tipo:'externo',nome:'Contato Sem Órgão',unidade:'Livre'}),/Selecione um órgão externo ativo/);
});
test('GAB-07.1 vínculo de ramal por id permite renomear divisão sem regravar contato',()=>{
 const s=inicio();
 s.diretorio.definirDivisoes([{id:'divisao-uuid-a',nome:'Divisão Teste'}]);
 const c=s.diretorio.criar({tipo:'ramal',nome:'Recepção Vinculada',unidade:'qualquer',unidadeId:'divisao-uuid-a',ramal:'0001'});
 assert.equal(c.unidadeId,'divisao-uuid-a');
 assert.equal(s.diretorio.obter(c.id).unidade,'Divisão Teste');
 s.diretorio.definirDivisoes([{id:'divisao-uuid-a',nome:'Divisão Teste Atualizada'}]);
 assert.equal(s.diretorio.obter(c.id).unidade,'Divisão Teste Atualizada');
 assert.equal(s.cadastro.obter(c.id).unidade,'Divisão Teste');
 assert.throws(()=>s.diretorio.criar({tipo:'ramal',nome:'Ramal Sem Divisão',unidadeId:'ausente'}),/Selecione uma divisão disponível/);
});
test('GAB-07.1 exclusão reversível de órgão, limpeza de sessão e campos protegidos',()=>{
 const s=inicio();
 const org=s.orgaos.criar({nome:'Órgão Teste Limpeza'});
 assert.equal(s.orgaos.arquivar(org.id).ativo,false);
 assert.equal(s.diretorio.obter('org:'+org.id),null);
 assert.equal(s.orgaos.restaurar(org.id).ativo,true);
 s.cadastro.limpar();s.orgaos.limpar();
 assert.equal(s.orgaos.listar().length,0);
 assert.equal(s.diretorio.listar().length,0);
 assert.equal(s.diretorio.obter('self:admin-teste'),null);
});
