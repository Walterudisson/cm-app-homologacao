import test from 'node:test';
import assert from 'node:assert/strict';
import {criarCadastroGabineteEmMemoria,situacaoRevisaoGabinete} from '../js/modules/gabinete/cadastro-model.js';
import {criarOrgaosGabineteEmMemoria} from '../js/modules/gabinete/orgaos-model.js';
import {criarDiretorioGabinete} from '../js/modules/gabinete/diretorio-referencias.js';

const hoje=()=>'2026-11-21';
function preparar(){
  let usuario={uid:'admin-A',nome:'Pessoa Exemplo A',email:'a@example.invalid',divisoesAtribuidas:['Unidade Alfa']};
  let foto='https://example.invalid/perfil-a.webp';
  const cadastro=criarCadastroGabineteEmMemoria({hoje});
  const orgaos=criarOrgaosGabineteEmMemoria({hoje});
  orgaos.iniciar(usuario.uid);
  const dir=criarDiretorioGabinete({cadastro,orgaos,obterUsuario:()=>usuario,obterFotoPropria:()=>foto});
  dir.iniciar(usuario.uid);
  return {cadastro,orgaos,dir,usuario:()=>usuario,foto:()=>foto,trocar(uid){usuario={uid,nome:'Pessoa Exemplo B'};foto='';orgaos.iniciar(uid);dir.iniciar(uid);},alterarFoto(valor){foto=valor;}};
}
test('GAB-09 descarta divisões reais e imagens na troca de usuário',()=>{
  const f=preparar();
  f.dir.definirDivisoes([{id:'div-A',nome:'Divisão Confidencial de Teste'}]);
  assert.deepEqual(f.dir.listarDivisoes().map(x=>x.id),['div-A']);
  const self=f.dir.obter('self:admin-A');
  assert.equal(f.dir.fotoDoContato(self),'https://example.invalid/perfil-a.webp');
  f.trocar('admin-B');
  assert.ok(!f.dir.listarDivisoes().some(x=>x.id==='div-A'));
  assert.equal(f.dir.listarDivisoes().length,5);
  assert.equal(f.dir.obter('self:admin-A'),null);
  assert.equal(f.dir.fotoDoContato(self),'');
  assert.equal(f.dir.obter('self:admin-B').nome,'Pessoa Exemplo B');
});
test('GAB-09 lista só divisões reais quando disponíveis, preserva referência de ramal existente',()=>{
  const f=preparar();
  const ramal=f.dir.criar({tipo:'ramal',nome:'Ramal Alfa Exemplo',unidadeId:'demo-div-alfa',unidade:'Unidade Alfa',ramal:'0009'});
  f.dir.definirDivisoes([{id:'div-real',nome:'Unidade Real Exemplo'}]);
  assert.deepEqual(f.dir.listarDivisoes().map(x=>x.id),['div-real']);
  assert.equal(f.dir.obter(ramal.id).unidade,'Unidade Alfa');
  assert.throws(()=>f.dir.criar({tipo:'ramal',nome:'Ramal Sem Divisão',unidadeId:'ausente'}),/Selecione uma divisão/);
  const novo=f.dir.criar({tipo:'ramal',nome:'Ramal Real Exemplo',unidadeId:'div-real',ramal:'0010',unidade:'não confiar'});
  assert.equal(f.dir.obter(novo.id).unidade,'Unidade Real Exemplo');
  f.dir.definirDivisoes([{id:'div-real',nome:'Unidade Real Renomeada'}]);
  assert.equal(f.dir.obter(novo.id).unidade,'Unidade Real Renomeada');
});
test('GAB-09 divisão inexistente não reaparece ao trocar e retornar à mesma conta',()=>{
  const f=preparar();
  f.dir.definirDivisoes([{id:'div-A',nome:'Divisão Exemplo'}]);
  f.trocar('admin-B');
  f.trocar('admin-A');
  assert.ok(!f.dir.listarDivisoes().some(x=>x.id==='div-A'));
  assert.equal(f.dir.listar({}).length,13);
});
test('GAB-09 órgão renomeado atualiza ficha da Agenda por referência',()=>{
  const f=preparar();
  const id='demo-org-002';
  const antes=f.dir.obter('org:'+id);
  const org=f.orgaos.obter(id);
  assert.equal(antes.nome,org.nome);
  f.orgaos.editar(id,{nome:'Parceiro Novo Exemplo',sigla:org.sigla,categoria:org.categoria,cidade:org.cidade,telefone:org.telefone,email:org.email});
  assert.equal(f.dir.obter('org:'+id).nome,'Parceiro Novo Exemplo');
  const contato=f.dir.criar({tipo:'externo',nome:'Contato da Instituição Exemplo',orgaoId:id});
  assert.equal(f.dir.obter(contato.id).unidade,'Parceiro Novo Exemplo');
});
test('GAB-09 revisão conserva limite de 90 dias e nenhuma criação de conta',()=>{
  const f=preparar();
  assert.equal(situacaoRevisaoGabinete('2026-08-23',hoje()).codigo,'vencida');
  assert.equal(situacaoRevisaoGabinete('2026-08-24',hoje()).codigo,'proxima');
  const contato=f.dir.obter('demo-pessoa-001');
  assert.equal(contato.somenteLeitura,true);
  assert.throws(()=>f.dir.editar(contato.id,{}),/Gestão/);
  assert.throws(()=>f.dir.criar({tipo:'pessoa',nome:'Exemplo'}),/Gestão/);
  assert.ok(!f.dir.listar().some(c=>c.cpf||c.telefoneParticular));
});
test('GAB-09 limpa e recria referências ao encerrar sessão',()=>{
  const f=preparar();
  const novo=f.orgaos.criar({nome:'Órgão Exemplo Temporário'});
  f.dir.definirDivisoes([{id:'div-temporaria',nome:'Divisão Exemplo Temporária'}]);
  f.dir.limpar();f.orgaos.limpar();
  assert.equal(f.dir.listar().length,0);
  assert.equal(f.dir.listarDivisoes().some(x=>x.id==='div-temporaria'),false);
  assert.equal(f.dir.obter('org:'+novo.id),null);
  assert.equal(f.dir.fotoDoContato({id:'self:admin-A'}),'');
});
