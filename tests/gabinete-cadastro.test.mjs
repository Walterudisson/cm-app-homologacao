import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarCadastroGabinete,situacaoRevisaoGabinete,qualidadeContatoGabinete,
  criarCadastroGabineteEmMemoria,ErroCadastroGabinete,PRAZO_REVISAO_DIAS
} from '../js/modules/gabinete/cadastro-model.js';

const hoje=()=>'2026-11-21';
const valido={tipo:'pessoa',nome:'Pessoa Exemplo Teste',unidade:'Unidade Épsilon',ramal:'0003'};
const nova=()=>criarCadastroGabineteEmMemoria({hoje});

test('GAB-07 valida obrigatórios e não aceita atributos privados',()=>{
  const c=validarCadastroGabinete(valido);
  assert.equal(c.ramal,'0003');
  assert.equal(c.nome,'Pessoa Exemplo Teste');
  assert.equal(Object.hasOwn(c,'cpf'),false);
  assert.throws(()=>validarCadastroGabinete({...valido,cpf:'999'}),{name:'ErroCadastroGabinete',codigo:'proibido'});
  assert.throws(()=>validarCadastroGabinete({...valido,telefoneParticular:'(41) 99999-0000'}),{codigo:'proibido'});
  assert.throws(()=>validarCadastroGabinete({...valido,dataNascimento:'1980-01-01'}),{codigo:'proibido'});
  assert.throws(()=>validarCadastroGabinete({...valido,permissoes:['admin']}),{codigo:'proibido'});
  assert.throws(()=>validarCadastroGabinete({...valido,nome:'A'}),{campo:'nome'});
  assert.throws(()=>validarCadastroGabinete({...valido,unidade:' '}),{campo:'unidade'});
  assert.throws(()=>validarCadastroGabinete({...valido,tipo:'desconhecido'}),{campo:'tipo'});
});
test('GAB-07 mantém ramal como texto e verifica telefone/e-mail',()=>{
  assert.equal(validarCadastroGabinete({...valido,ramal:'0001'}).ramal,'0001');
  assert.throws(()=>validarCadastroGabinete({...valido,ramal:'7'}),{campo:'ramal'});
  assert.throws(()=>validarCadastroGabinete({...valido,ramal:'11AB'}),{campo:'ramal'});
  assert.throws(()=>validarCadastroGabinete({...valido,email:'não-é-email'}),{campo:'email'});
  assert.throws(()=>validarCadastroGabinete({...valido,telefoneInstitucional:'999'}),{campo:'telefoneInstitucional'});
  assert.equal(validarCadastroGabinete({...valido,email:'TESTE@EXEMPLO.INVALID'}).email,'teste@exemplo.invalid');
  assert.equal(validarCadastroGabinete({...valido,telefoneInstitucional:'(41) 3000-0000'}).telefoneInstitucional,'(41) 3000-0000');
});
test('GAB-07 valida apenas dia/mês no aniversário',()=>{
  assert.equal(validarCadastroGabinete({...valido,aniversario:'02-29'}).aniversario,'02-29');
  assert.throws(()=>validarCadastroGabinete({...valido,aniversario:'02-30'}),{campo:'aniversario'});
  assert.throws(()=>validarCadastroGabinete({...valido,aniversario:'12-00'}),{campo:'aniversario'});
  assert.throws(()=>validarCadastroGabinete({...valido,tipo:'ramal',aniversario:'11-21'}),{campo:'aniversario'});
  assert.equal(validarCadastroGabinete({...valido,tipo:'ramal'}).aniversario,'');
});
test('GAB-07 cria, consulta, edita sem renovar revisão e preserva UID de sessão',()=>{
  const s=nova();
  assert.throws(()=>s.criar(valido),{codigo:'acesso'});
  s.iniciar('usuario-A');
  assert.equal(s.listar().length,10);
  const c=s.criar(valido);
  assert.equal(c.id,'sessao-1');
  assert.equal(c.revisadoEm,'2026-11-21');
  assert.equal(s.listar().length,11);
  const editado=s.editar(c.id,{...valido,nome:'Pessoa Exemplo Editada'});
  assert.equal(editado.id,c.id);
  assert.equal(editado.nome,'Pessoa Exemplo Editada');
  assert.equal(editado.revisadoEm,'2026-11-21');
  assert.equal(s.obter(c.id).nome,'Pessoa Exemplo Editada');
  assert.equal(s.usuarioAtual(),'usuario-A');
});
test('GAB-07 impede duplicidades com normalização e permite ramal compartilhado',()=>{
  const s=nova();s.iniciar('usuario-A');
  const primeiro=s.criar(valido);
  assert.throws(()=>s.criar({...valido,nome:'  PESSOA exemplo teste ',unidade:'Unidade Epsilon'}),{codigo:'duplicado'});
  assert.throws(()=>s.editar('demo-pessoa-001',{...valido,nome:primeiro.nome,unidade:primeiro.unidade}),{codigo:'duplicado'});
  const outro=s.criar({...valido,nome:'Outra Pessoa',ramal:'0003'});
  assert.notEqual(outro.id,primeiro.id);
  assert.equal(outro.ramal,primeiro.ramal);
  assert.equal(s.listar().length,12);
});
test('GAB-07 exclusão reversível exige confirmação na UI e impede restauração duplicada',()=>{
  const s=nova();s.iniciar('usuario-A');
  const c=s.criar(valido);
  assert.equal(s.excluir(c.id).ativo,false);
  assert.equal(s.listar().some(x=>x.id===c.id),false);
  assert.equal(s.listar({incluirInativos:true}).some(x=>x.id===c.id),true);
  assert.throws(()=>s.editar(c.id,valido),{codigo:'ausente'});
  s.criar(valido);
  assert.throws(()=>s.restaurar(c.id),{codigo:'duplicado'});
  const novo=s.listar().find(x=>x.id==='sessao-2');
  s.excluir(novo.id);
  assert.equal(s.restaurar(c.id).ativo,true);
  assert.throws(()=>s.restaurar(c.id),{codigo:'ausente'});
});
test('GAB-07 revisão de 90 dias com data civil e pendências',()=>{
  assert.equal(PRAZO_REVISAO_DIAS,90);
  assert.equal(situacaoRevisaoGabinete('2026-08-24',hoje()).codigo,'proxima');
  assert.equal(situacaoRevisaoGabinete('2026-08-23',hoje()).codigo,'vencida');
  assert.equal(situacaoRevisaoGabinete('2026-08-22',hoje()).codigo,'vencida');
  assert.equal(situacaoRevisaoGabinete('',hoje()).codigo,'sem-revisao');
  assert.equal(situacaoRevisaoGabinete('2026-12-01',hoje()).codigo,'sem-revisao');
  assert.equal(situacaoRevisaoGabinete('2024-01-01','2024-03-31').codigo,'vencida');
  assert.equal(situacaoRevisaoGabinete('2024-01-01','2024-03-30').codigo,'proxima');
  assert.equal(qualidadeContatoGabinete({tipo:'ramal',ramal:'',revisadoEm:'2026-11-20'},hoje()).precisaAtencao,true);
  assert.equal(qualidadeContatoGabinete({tipo:'pessoa',ramal:'',email:'',telefoneInstitucional:'',revisadoEm:'2026-11-20'},hoje()).pendencias[0],'Sem contato institucional');
  assert.equal(qualidadeContatoGabinete({tipo:'externo',email:'',revisadoEm:''},hoje()).precisaAtencao,true);
});
test('GAB-07 revisão declarada não muda dados e notifica assinantes',()=>{
  const s=nova();let eventos=0;const cancelar=s.assinar(()=>eventos++);
  s.iniciar('usuario-A');
  const antes=s.obter('demo-pessoa-002');
  const depois=s.revisar('demo-pessoa-002');
  assert.equal(depois.revisadoEm,'2026-11-21');
  assert.equal(depois.nome,antes.nome);
  assert.equal(depois.id,antes.id);
  assert.equal(depois.ativo,true);
  assert.ok(eventos>=2);
  cancelar();const total=eventos;s.revisar('demo-pessoa-003');
  assert.equal(eventos,total);
});
test('GAB-07 isola contas e descarta absolutamente todos os cadastros editados',()=>{
  const s=nova();s.iniciar('usuario-A');s.criar(valido);s.editar('demo-pessoa-001',{...valido,nome:'Alteração Local'});
  s.iniciar('usuario-B');
  assert.equal(s.listar().length,10);
  assert.equal(s.obter('sessao-1'),null);
  assert.equal(s.obter('demo-pessoa-001').nome,'SGT Exemplo A');
  s.limpar();assert.equal(s.listar().length,0);assert.equal(s.usuarioAtual(),'');
});
