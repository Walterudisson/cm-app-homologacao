import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {podeNavegarLegado,decidirMudancaAcesso} from '../js/platform/acesso-sessao.js';
import {modulosDoUsuario} from '../js/platform/modules.js';
import {PERMISSOES,usuarioPode} from '../js/core/permissoes.js';
import {projetarMapaInstitucional} from '../js/modules/gestao/pessoas-vinculos-model.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ler=path=>readFile(resolve(ROOT,path),'utf8');
const readSources=async()=> {
 const [app,index,sw,ui,modelo]=await Promise.all([
  ler('app.js'),ler('index.html'),ler('service-worker.js'),
  ler('js/modules/gestao/pessoas-vinculos-ui.js'),
  ler('js/modules/gestao/pessoas-vinculos-model.js')
 ]);
 return {app,index,sw,ui,modelo};
};

test('GEST-05 | login continua inicializável antes de habilitar ENTRAR',async()=>{
 const {app,index}=await readSources();
 const controlador=app.indexOf('const matrizAcessosGestao = criarMatrizAcessosGestaoUI');
 const iniciar=app.indexOf('inicializarGestaoFuncoes();');
 const liberar=app.indexOf("document.getElementById('btn-submit-login').disabled=false;");
 assert.ok(controlador>0&&iniciar>controlador&&liberar>iniciar);
 assert.match(index,/id="btn-submit-login"/);
});

test('GEST-05 | credenciais UID e email vêm do Auth, não do documento',async()=>{
 const {app}=await readSources();
 assert.match(app,/usuarioLogado = \{ \.\.\.userDoc\.data\(\), uid: user\.uid, email: user\.email \}/);
 assert.doesNotMatch(app,/usuarioLogado = \{ uid: user\.uid, email: user\.email, \.\.\.userDoc\.data\(\) \}/);
 assert.match(app,/bancoUsuarios = snapshot\.docs\.map\(docSnap => \(\{ \.\.\.docSnap\.data\(\), uid: docSnap\.id \}\)\)/);
});

test('GEST-05 | gestões e identidade institucional exigem autorização explícita',()=>{
 const autorizado={uid:'auth-admin',perfil:'admin',ativo:true};
 assert.equal(podeNavegarLegado(autorizado,'pessoas'),true);
 assert.equal(podeNavegarLegado({...autorizado,perfil:'gestor'},'pessoas'),false);
 assert.equal(podeNavegarLegado({...autorizado,perfil:'conferente'},'pessoas'),false);
 assert.equal(podeNavegarLegado({...autorizado,ativo:false},'pessoas'),false);
 assert.equal(podeNavegarLegado({...autorizado,autorizacaoVersao:2},'pessoas'),false);
 assert.equal(podeNavegarLegado({...autorizado,perfil:'usuario',permissoes:[PERMISSOES.USUARIOS_VISUALIZAR,PERMISSOES.DIVISOES_VISUALIZAR]},'pessoas'),false);
 assert.ok(modulosDoUsuario(autorizado).length>0);
 assert.equal(usuarioPode({...autorizado,ativo:false},PERMISSOES.USUARIOS_VISUALIZAR),false);
});

test('GEST-05 | revogação de direitos e ativação versionada provocam encerramento da sessão',()=>{
 const base={uid:'u1',perfil:'admin',ativo:true,modulos:['patrimonios']};
 assert.equal(decidirMudancaAcesso(base,{...base,ativo:false}),'encerrar');
 assert.equal(decidirMudancaAcesso(base,{...base,autorizacaoVersao:2}),'encerrar');
 assert.equal(decidirMudancaAcesso(base,{...base,perfil:'gestor'}),'reiniciar');
 assert.equal(decidirMudancaAcesso(base,{...base,modulos:['dsips']}),'reiniciar');
 assert.equal(decidirMudancaAcesso(base,{...base,nome:'Nome atualizado'}),'manter');
 assert.equal(decidirMudancaAcesso(base,{...base},{doCache:true}),'ignorar');
});

test('GEST-05 | isolamento de sessão desativa retornos anteriores de Gestão',async()=>{
 const {app}=await readSources();
 assert.match(app,/uidConsulta!==usuarioLogado\?\.uid\|\|auth\.currentUser\?\.uid!==uidConsulta/);
 assert.match(app,/epoca===epocaAcesso&&abaAtual==='pessoas'/);
 assert.match(app,/painelPessoasVinculos\?\.limpar\(\)/);
 assert.match(app,/bancoUsuarios=\[\];bancoDivisoes=\[\];bancoFuncoes=\[\]/);
});

test('GEST-05 | ficha de usuário não recebe avatar tardio da sessão anterior',async()=>{
 const {app}=await readSources();
 const inicio=app.indexOf('window.abrirDetalhesUsuario = async function(uid)');
 const fim=app.indexOf('window.fecharDetalhesUsuario = function()',inicio);
 assert.ok(inicio>0&&fim>inicio);
 const trecho=app.slice(inicio,fim);
 assert.match(trecho,/sessaoDetalhesUid===usuarioLogado\?\.uid/);
 assert.match(trecho,/sessaoDetalhesUid===auth\.currentUser\?\.uid/);
 assert.match(trecho,/epocaDetalhes===epocaAcesso/);
 assert.match(trecho,/!modal\.classList\.contains\('hidden'\)/);
});

test('GEST-05 | GEST-04 limpa também textos agregados após perda de acesso',async()=>{
 const {ui}=await readSources();
 assert.match(ui,/referencia\.textContent='Nenhum vínculo institucional carregado nesta sessão\.'/);
 assert.match(ui,/tabs\.forEach\(\(b,i\)=>/);
 assert.match(ui,/mapa=null;visao='pessoas';limite=12/);
 assert.match(ui,/lista\?\.replaceChildren\(\)/);
});

test('GEST-05 | relação por UID não unifica pessoas com mesmo nome',()=>{
 const x=projetarMapaInstitucional({
  usuarios:[{uid:'a',nome:'Pessoa Exemplo'},{uid:'b',nome:'Pessoa Exemplo'}],
  divisoes:[{id:'div-1',nome:'Divisão Exemplo',responsavelPrincipalNome:'Pessoa Exemplo'}]
 });
 assert.equal(x.pessoas.length,2);
 assert.equal(x.pendencias.some(p=>p.tipo==='possivel-duplicidade'),true);
 assert.equal(x.vinculos[0].porUid,false);
 assert.equal(x.vinculos[0].status,'somente-nome');
});

test('GEST-05 | login, HTML e SW utilizam a mesma release',async()=>{
 const {app,index,sw}=await readSources();
 assert.match(index,/v1\.13\.49-H\.2/);
 assert.match(index,/app\.js\?v=1\.13\.49-h\.2/);
 assert.match(index,/app\.css\?v=1\.13\.49-h\.2/);
 assert.match(sw,/const VERSAO = 'v1\.13\.49-h\.2-gab10-mobile'/);
 assert.match(app,/matriz-acessos-ui\.js\?v=1\.13\.49-h\.2/);
 assert.match(app,/pessoas-vinculos-ui\.js\?v=1\.13\.49-h\.2/);
});

test('GEST-05 | elementos HTML possuem IDs únicos e rotas de Gestão estáveis',async()=>{
 const {index}=await readSources();
 const ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const id of ['view-login','btn-submit-login','sec-usuarios','sec-divisoes','sec-funcoes',
  'sec-pessoas','gest04-lista','gest04-referencia','gest-matriz-contrato','modal-detalhes-usuario']){
  assert.ok(ids.includes(id),id+' ausente');
 }
});

test('GEST-05 | arquivos principais do PWA constam fisicamente no repositório',async()=>{
 const {sw}=await readSources();
 const lista=sw.match(/const ARQUIVOS_SHELL = \[([\s\S]*?)\];/);
 assert.ok(lista,'Manifest de precache não localizado');
 const itens=[...lista[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 for(const item of itens){
  if(item==='./')continue;
  await assert.doesNotReject(access(resolve(ROOT,item)));
 }
 for(const path of ['js/modules/gestao/pessoas-vinculos-ui.js',
   'js/modules/gestao/pessoas-vinculos-model.js','js/modules/gestao/usuarios-acessos-model.js']){
   assert.ok(itens.includes('./'+path),path+' não incluído no shell');
 }
});

test('GEST-05 | novas projeções não acessam Firestore nem armazenamento local',async()=>{
 const {ui,modelo}=await readSources();
 for(const source of [ui,modelo]){
  assert.doesNotMatch(source,/\b(?:getDocs|setDoc|updateDoc|httpsCallable|deleteDoc)\s*\(/);
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
 }
});
