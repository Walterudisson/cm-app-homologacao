'use strict';
const {test,before,beforeEach,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');
if(!process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:'))throw Error('Execute apenas no Firestore Emulator local.');
const req=createRequire(path.resolve(process.env.CMAPP_INTERNAL_ROOT,'functions/package.json'));
const {initializeTestEnvironment,assertFails}=req('@firebase/rules-unit-testing');const {doc,getDoc,setDoc,updateDoc}=req('firebase/firestore');const {initializeApp,deleteApp}=req('firebase-admin/app');const {getFirestore,FieldValue}=req('firebase-admin/firestore');
const {criarServicoAcessos}=require('./servico.cjs');class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code;}}
const projectId='demo-cmapp-acessos-v2';let env,app,db,api,seq=0;
const grant=(papelId='operador')=>({moduloId:'dsips',funcionalidadeId:'materiais_cautelas',papelId,escopo:{tipo:'todos'}});
const patrimonio=(papelId='conferente',ids=['DA'])=>({moduloId:'da',funcionalidadeId:'patrimonios',papelId,escopo:ids?{tipo:'divisoes',ids}:{tipo:'todos'}});
const deleg=(pat=false)=>({nivel:'funcionalidade',moduloId:pat?'da':'dsips',funcionalidadeId:pat?'patrimonios':'materiais_cautelas',limites:[{funcionalidadeId:pat?'patrimonios':'materiais_cautelas',papeis:pat?['consulta','conferente']:['consulta','operador'],escopo:pat?{tipo:'divisoes',ids:['DA']}:{tipo:'todos'}}]});
const request=(data={},uid='super')=>({auth:uid?{uid}:null,data:{operacaoId:'op-'+(++seq),...data}});
const negar=(promise,code='permission-denied')=>assert.rejects(promise,e=>e.code===code);
const dados=async uid=>(await db.doc('cmappAcessos/'+uid).get()).data();const eventos=async()=>(await db.collection('cmappAcessosEventos').get()).size;
before(async()=>{env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync(path.resolve(process.env.CMAPP_INTERNAL_ROOT,'firestore.rules'),'utf8')}});app=initializeApp({projectId},'acessos-v2-test');db=getFirestore(app);api=criarServicoAcessos({db,FieldValue,HttpsError});});
beforeEach(async()=>{
 await env.clearFirestore();const b=db.batch();
 const users={super:{papelPlataforma:'superadmin'},ti:{papelPlataforma:'administrador',permissoesPlataforma:['contas.consultar','contas.gerenciar']},gestor:{delegacoes:[deleg()]},pat:{delegacoes:[deleg(true)]},operador:{atribuicoes:[{...grant(),id:'op-inicial'}]},alvo:{},inativo:{},legacy:{}};
 for(const [uid,x]of Object.entries(users)){
  b.set(db.doc('usuarios/'+uid),{nome:'Pessoa '+uid,email:uid+'@exemplo.invalid',lotacao:uid==='alvo'?'Gabinete':'DA',ativo:uid!=='inativo',perfil:'admin',...(uid==='legacy'?{}:{autorizacaoVersao:2})});
  if(uid!=='legacy')b.set(db.doc('cmappAcessos/'+uid),{uid,versao:2,ativo:true,papelPlataforma:'usuario',permissoesPlataforma:[],atribuicoes:[],delegacoes:[],revisao:0,...x});
 }
 await b.commit();
});
after(async()=>{await env?.cleanup();if(app)await deleteApp(app);});
test('conta/autorização vêm do servidor: login, legado, inativo e perfil forjado não liberam gestão',async()=>{
 await negar(api.consultarMeusAcessos(request({},null)),'unauthenticated');await negar(api.consultarMeusAcessos(request({},'legacy')),'failed-precondition');await negar(api.consultarMeusAcessos(request({},'inativo')));
 await negar(api.conceder(request({uid:'alvo',atribuicao:grant()},'operador')));await negar(api.conceder(request({uid:'alvo',atribuicao:grant(),papelPlataforma:'superadmin'},'operador')),'invalid-argument');assert.equal(await eventos(),0);
});
test('concessão e auditoria são atômicas; recibo impede duplicação de reenvio',async()=>{
 const r=request({uid:'alvo',atribuicao:grant()});const a=await api.conceder(r);const b=await api.conceder(r);assert.deepEqual(a,b);assert.equal((await dados('alvo')).atribuicoes.length,1);assert.equal(await eventos(),1);assert.equal((await db.collection('cmappAcessosOperacoes').get()).size,1);
 const e=(await db.collection('cmappAcessosEventos').get()).docs[0].data();assert.equal(e.operadorUid,'super');assert.equal(e.alvoUid,'alvo');assert.ok(e.registradoEm.toDate() instanceof Date);assert.equal(e.antes,null);
});
test('gestor concede a usuário de outra divisão, limitado à área e aos papéis delegados',async()=>{
 await api.conceder(request({uid:'alvo',atribuicao:grant()},'gestor'));assert.equal((await dados('alvo')).atribuicoes.length,1);
 for(const a of [patrimonio(),grant('gestor')])await negar(api.conceder(request({uid:'alvo',atribuicao:a},'gestor')));assert.equal(await eventos(),1);
});
test('concessão patrimonial não ultrapassa divisões nem ganha escopo global',async()=>{
 await api.conceder(request({uid:'alvo',atribuicao:patrimonio()},'pat'));
 for(const ids of [['Gabinete'],null])await negar(api.conceder(request({uid:'alvo',atribuicao:patrimonio('conferente',ids)},'pat')));assert.equal((await dados('alvo')).atribuicoes.length,1);
});
test('TI com administração de contas não recebe poder implícito de conceder ou designar gestão',async()=>{
 await negar(api.conceder(request({uid:'alvo',atribuicao:grant()},'ti')));await negar(api.designarDelegacao(request({uid:'alvo',delegacao:deleg()},'ti')));
 await db.doc('cmappAcessos/ti').update({permissoesPlataforma:['contas.consultar','gestores.designar']});await api.designarDelegacao(request({uid:'alvo',delegacao:deleg()},'ti'));assert.equal((await dados('alvo')).delegacoes.length,1);
});
test('autoelevação, novos acessos a inativo e superadmin por papel operacional são negados',async()=>{
 await negar(api.conceder(request({uid:'super',atribuicao:grant()})));await negar(api.conceder(request({uid:'inativo',atribuicao:grant()})));
 await negar(api.conceder(request({uid:'alvo',atribuicao:{...grant(),papelId:'superadmin'}})),'invalid-argument');assert.equal(await eventos(),0);
});
test('revogação registra antes/depois, aceita conta inativa e repetição não duplica evento',async()=>{
 const {id}=await api.conceder(request({uid:'alvo',atribuicao:grant()},'gestor'));await db.doc('usuarios/alvo').update({ativo:false});
 const r=request({uid:'alvo',id},'gestor');await api.revogar(r);await api.revogar(r);assert.equal((await dados('alvo')).atribuicoes.length,0);assert.equal(await eventos(),2);
 const e=(await db.collection('cmappAcessosEventos').where('tipo','==','revogar').get()).docs[0].data();assert.equal(e.antes.papelId,'operador');assert.equal(e.depois,null);
});
test('revogação de gestor impede nova chamada e até reenvio de operação anteriormente autorizada',async()=>{
 const r=request({uid:'alvo',atribuicao:grant()},'gestor');await api.conceder(r);await db.doc('cmappAcessos/gestor').update({delegacoes:[]});await negar(api.conceder(r));await negar(api.listarUsuarios(request({},'gestor')));assert.equal(await eventos(),1);
});
test('duas concessões concorrentes preservam ambas e incrementam revisão sem perder atualização',async()=>{
 await Promise.all([api.conceder(request({uid:'alvo',atribuicao:grant()})),api.conceder(request({uid:'alvo',atribuicao:patrimonio()}))]);assert.equal((await dados('alvo')).atribuicoes.length,2);assert.equal((await dados('alvo')).revisao,2);assert.equal(await eventos(),2);
});
test('mesmo pedido concorrente gera somente um recibo/evento; ID de operação não pode ser reutilizado com outro conteúdo',async()=>{
 const r=request({uid:'alvo',atribuicao:grant()});const [a,b]=await Promise.all([api.conceder(r),api.conceder(r)]);assert.equal(a.id,b.id);assert.equal(await eventos(),1);
 await negar(api.conceder({...r,data:{...r.data,atribuicao:grant('consulta')}}),'already-exists');assert.equal((await dados('alvo')).atribuicoes.length,1);
});
test('concessões iguais com operações diferentes não duplicam acesso nem auditoria',async()=>{
 await api.conceder(request({uid:'alvo',atribuicao:grant()}));await negar(api.conceder(request({uid:'alvo',atribuicao:grant()})),'already-exists');assert.equal(await eventos(),1);
});
test('diretório de gestores contém somente projeção de ativos, TI pode consultar contas completas permitidas',async()=>{
 const g=await api.listarUsuarios(request({},'gestor'));assert.ok(g.usuarios.some(u=>u.uid==='alvo'));assert.ok(!g.usuarios.some(u=>u.uid==='inativo'));for(const u of g.usuarios){assert.equal(u.email,undefined);assert.equal(u.perfil,undefined);assert.equal(u.delegacoes,undefined);}
 const ti=await api.listarUsuarios(request({},'ti'));assert.ok(ti.usuarios.some(u=>u.uid==='inativo'));assert.ok(ti.usuarios[0].email);await negar(api.listarUsuarios(request({},'operador')));
});
test('diretório pagina por ID sem repetir página e valida limites/cursor',async()=>{
 const a=await api.listarUsuarios(request({limite:2},'ti'));const b=await api.listarUsuarios(request({limite:2,cursor:a.proximoCursor},'ti'));assert.equal(a.usuarios.length,2);assert.ok(!b.usuarios.some(u=>a.usuarios.some(x=>x.uid===u.uid)));await negar(api.listarUsuarios(request({limite:100},'ti')),'invalid-argument');await negar(api.listarUsuarios(request({cursor:'a/b'},'ti')),'invalid-argument');
});
test('consulta de acessos de gestor é filtrada por sua área; próprio acesso é consultável sem diretório',async()=>{
 await api.conceder(request({uid:'alvo',atribuicao:grant()}));await api.conceder(request({uid:'alvo',atribuicao:patrimonio()}));const g=await api.consultarAcessos(request({uid:'alvo'},'gestor'));assert.equal(g.atribuicoes.length,1);assert.equal(g.atribuicoes[0].moduloId,'dsips');assert.equal(g.delegacoes,undefined);assert.equal(g.permissoesPlataforma,undefined);
 const own=await api.consultarMeusAcessos(request({},'operador'));assert.equal(own.uid,'operador');await negar(api.consultarAcessos(request({uid:'alvo'},'operador')));
});
test('auditoria é filtrada pelos limites atuais; operador não consulta auditoria administrativa',async()=>{
 await api.conceder(request({uid:'alvo',atribuicao:grant()}));await api.conceder(request({uid:'alvo',atribuicao:patrimonio()}));const g=await api.consultarAuditoria(request({uid:'alvo'},'gestor'));assert.equal(g.eventos.length,1);assert.equal(g.eventos[0].objeto.moduloId,'dsips');assert.equal((await api.consultarAuditoria(request())).eventos.length,2);await negar(api.consultarAuditoria(request({},'operador')));
 await db.doc('cmappAcessos/gestor').update({delegacoes:[]});await negar(api.consultarAuditoria(request({},'gestor')));
});
test('delegação não é operação: designação/revogação exige autoridade explícita e impede subdelegar gestores',async()=>{
 const r=await api.designarDelegacao(request({uid:'alvo',delegacao:deleg()}));assert.equal((await dados('alvo')).delegacoes.length,1);await api.conceder(request({uid:'operador',atribuicao:grant('consulta')},'alvo'));
 await negar(api.designarDelegacao(request({uid:'pat',delegacao:deleg()},'alvo')));await negar(api.designarDelegacao(request({uid:'pat',delegacao:{...deleg(),limites:[{...deleg().limites[0],papeis:['gestor']}]}})),'invalid-argument');
 await api.removerDelegacao(request({uid:'alvo',id:r.id}));await negar(api.conceder(request({uid:'ti',atribuicao:grant('consulta')},'alvo')));
});
test('Rules publicadas já impedem escrita/leitura direta de acessos, eventos e recibos, inclusive por admin legado',async()=>{
 const client=env.authenticatedContext('super').firestore();for(const c of ['cmappAcessos','cmappAcessosEventos','cmappAcessosOperacoes']){await assertFails(setDoc(doc(client,c+'/novo'),{papelPlataforma:'superadmin'}));await assertFails(getDoc(doc(client,c+'/super')));}
 await assertFails(updateDoc(doc(client,'usuarios/super'),{autorizacaoVersao:3}));
});
test('documento v2 ausente ou versão inválida não recorre ao admin legado; falha não grava parte da operação',async()=>{
 await db.doc('cmappAcessos/gestor').delete();await negar(api.conceder(request({uid:'alvo',atribuicao:grant()},'gestor')),'failed-precondition');assert.equal(await eventos(),0);
 await db.doc('cmappAcessos/alvo').update({versao:3});await negar(api.conceder(request({uid:'alvo',atribuicao:grant()})),'failed-precondition');assert.equal(await eventos(),0);
});

test('delegação corrompida não libera diretório ou concessão',async()=>{
 await db.doc('cmappAcessos/gestor').update({delegacoes:[{nivel:'modulo',moduloId:'dsips',limites:[]}]});
 await negar(api.listarUsuarios(request({},'gestor')));await negar(api.conceder(request({uid:'alvo',atribuicao:grant()},'gestor')));assert.equal(await eventos(),0);
});
test('revisão acompanha conta e concessões atomicamente; formato inconsistente falha antes de gravar',async()=>{
 await api.conceder(request({uid:'alvo',atribuicao:grant()}));assert.equal((await db.doc('usuarios/alvo').get()).data().autorizacaoRevisao,1);assert.equal((await dados('alvo')).revisao,1);
 await db.doc('cmappAcessos/alvo').update({revisao:'invalida'});await negar(api.conceder(request({uid:'alvo',atribuicao:patrimonio()})),'failed-precondition');assert.equal(await eventos(),1);
});

test('atribuição com identificador legado diferente não é duplicada por equivalência de conteúdo',async()=>{
 await negar(api.conceder(request({uid:'operador',atribuicao:grant()})),'already-exists');assert.equal((await dados('operador')).atribuicoes.length,1);assert.equal(await eventos(),0);
});

test('usuário sem gestão é barrado antes de consultar existência ou versão da conta alvo',async()=>{
 await negar(api.consultarAcessos(request({uid:'legacy'},'operador')));await negar(api.conceder(request({uid:'legacy',atribuicao:grant()},'operador')));await negar(api.consultarAcessos(request({uid:'nao-existe'},'operador')));
});

function contasFake(){
 const pessoas=new Map(),chamadas=[];let falhar=false;
 const auth={async createUser(u){chamadas.push(['create',u.uid]);if(pessoas.has(u.uid))throw Object.assign(Error(),{code:'auth/uid-already-exists'});if([...pessoas.values()].some(x=>x.email===u.email))throw Object.assign(Error(),{code:'auth/email-already-exists'});pessoas.set(u.uid,u);return u;},async getUser(uid){return pessoas.get(uid);},async updateUser(uid,d){chamadas.push(['update',uid,d]);if(falhar)throw Error('falha simulada');return{uid,...d};},async revokeRefreshTokens(uid){chamadas.push(['revoke',uid]);}};
 return{api:require('./contas.cjs').criarContasV2({db,auth,FieldValue,HttpsError,contexto:api.contexto}),pessoas,chamadas,falhar(){falhar=true;}};
}
test('cadastro v2 cria somente conta básica e reenvio não duplica identidade ou evento',async()=>{
 const f=contasFake(),r=request({nome:'Pessoa Nova',email:'nova@exemplo.invalid',lotacao:'Gabinete'},'ti');const a=await f.api.criar(r);assert.deepEqual(await f.api.criar(r),a);assert.equal(f.pessoas.size,1);const p=await dados(a.uid);assert.deepEqual(p.atribuicoes,[]);assert.deepEqual(p.delegacoes,[]);assert.equal(p.papelPlataforma,'usuario');assert.equal(await eventos(),1);
 await negar(f.api.criar(request({nome:'Pessoa Nova',email:'outra@exemplo.invalid',lotacao:'Gabinete',papelPlataforma:'superadmin'},'ti')),'invalid-argument');
 await negar(f.api.criar(request({nome:'Pessoa Nova',email:'outra@exemplo.invalid',lotacao:'Gabinete'},'operador')));
});
test('TI altera dados preservando concessões e não administra a própria conta ou Superadmin',async()=>{
 const f=contasFake();await api.conceder(request({uid:'alvo',atribuicao:grant()}));await f.api.atualizar(request({uid:'alvo',nome:'Nome Atualizado',lotacao:'Gabinete'},'ti'));assert.equal((await dados('alvo')).atribuicoes.length,1);
 for(const uid of ['super','ti'])await negar(f.api.alterarEstado(request({uid,ativo:false},'ti')));assert.equal((await dados('super')).ativo,true);
});
test('falha do Authentication não reabre conta bloqueada; replay não repete efeito externo',async()=>{
 const f=contasFake();f.falhar();const r=request({uid:'alvo',ativo:false},'ti');const a=await f.api.alterarEstado(r);assert.equal(a.sincronizado,false);assert.equal((await dados('alvo')).ativo,false);assert.equal((await db.doc('usuarios/alvo').get()).data().ativo,false);const n=f.chamadas.length;const b=await f.api.alterarEstado(r);assert.equal(b.repetida,true);assert.equal(f.chamadas.length,n);assert.equal(await eventos(),1);
});
test('replay antigo não desfaz reativação posterior; recibo com outro conteúdo é recusado',async()=>{
 const f=contasFake(),r=request({uid:'alvo',ativo:false},'ti');await f.api.alterarEstado(r);await f.api.alterarEstado(request({uid:'alvo',ativo:true},'ti'));const n=f.chamadas.length;await f.api.alterarEstado(r);assert.equal((await dados('alvo')).ativo,true);assert.equal(f.chamadas.length,n);await negar(f.api.alterarEstado({...r,data:{...r.data,ativo:true}}),'already-exists');assert.equal(f.chamadas.length,n);
});
test('recuperação exige capacidade específica, alvo ativo e registra somente intenção',async()=>{
 const f=contasFake();await negar(f.api.recuperar({auth:{uid:'ti'},data:{uid:'alvo'}}));await db.doc('cmappAcessos/ti').update({permissoesPlataforma:['contas.consultar','contas.gerenciar','contas.recuperar']});const a=await f.api.recuperar({auth:{uid:'ti'},data:{uid:'alvo'}});assert.equal(a.email,'alvo@exemplo.invalid');assert.equal(f.chamadas.length,0);await negar(f.api.recuperar({auth:{uid:'ti'},data:{uid:'inativo'}}));const e=await api.consultarAuditoria(request({},'ti'));assert.equal(e.eventos.length,1);assert.equal(e.eventos[0].tipo,'recuperacao_solicitada');
});
test('proteção legada bloqueia ator/alvo versionado e manutenção; preserva chamada legada válida',async()=>{
 let n=0;const guard=require('./legado.cjs')({db,HttpsError,regiao:'southamerica-east1',onCall:(_,fn)=>fn,exportsAtuais:{atualizarUsuario:{run:async()=>++n}}}).atualizarUsuario;
 await negar(guard(request({uid:'alvo'},'super')));await negar(guard(request({uid:'alvo'},'legacy')));await guard(request({uid:'legacy'},'legacy'));assert.equal(n,1);await db.doc('cmappConfiguracao/acessos').set({legadoBloqueado:true});await negar(guard(request({uid:'legacy'},'legacy')),'failed-precondition');assert.equal(n,1);
});
test('catálogo de divisões usa dados reais ativos e restringe gestor ao próprio escopo',async()=>{
 await db.doc('divisoes/da').set({nome:'DA',ativo:true});await db.doc('divisoes/gab').set({nome:'Gabinete',ativo:true});await db.doc('divisoes/old').set({nome:'Antiga',ativo:false});const r=await api.listarDivisoes(request({},'pat'));assert.deepEqual(r.divisoes.map(x=>x.codigo),['DA']);await negar(api.listarDivisoes(request({},'operador')));
});
test('Rules de transição bloqueiam admin marcado no legado e preservam leitura do próprio perfil',async()=>{
 const{mkdtempSync,writeFileSync,readFileSync,rmSync}=require('node:fs');const{tmpdir}=require('node:os');const{execFileSync}=require('node:child_process');const dir=mkdtempSync(path.join(tmpdir(),'cmapp-rules-'));const file=path.join(dir,'firestore.rules');const original=readFileSync(path.resolve(process.env.CMAPP_INTERNAL_ROOT,'firestore.rules'),'utf8');
 try{writeFileSync(file,original);execFileSync(process.execPath,['scripts/preparar-rules-transicao-v2.mjs',file]);const preparado=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:readFileSync(file,'utf8')}});await preparado.cleanup();const client=env.authenticatedContext('super').firestore();await getDoc(doc(client,'usuarios/super'));await assertFails(getDoc(doc(client,'usuarios/alvo')));await assertFails(getDoc(doc(client,'patrimonios/exemplo')));const legado=env.authenticatedContext('legacy').firestore();await getDoc(doc(legado,'usuarios/alvo'));}finally{const restaurado=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:original}});await restaurado.cleanup();rmSync(dir,{recursive:true});}
});

const negocio=()=>require('../operacoes-v2/servico.cjs').criarOperacoesV2({db,FieldValue,HttpsError,contexto:api.contexto});
const reqSemOp=(data,uid='operador')=>({auth:{uid},data});
const saldoV2=()=>({materialId:'mat',localId:'local',quantidade:5,identificadores:[],motivo:'Contagem física de teste'});
const cautelaV2=()=>({responsavelId:'alvo',itens:[{materialId:'mat',quantidade:2}],observacoes:''});
async function prepararEstoqueV2(){const b=negocio();await db.doc('dsipsCategorias/cat').set({nome:'Categoria',ativo:true});await db.doc('dsipsLocais/local').set({nome:'Local',ativo:true});await b.salvarCadastro(request({tipo:'material',id:'mat',dados:{nome:'Material',categoriaId:'cat',controle:'quantidade',unidade:'un'}}));await b.registrarSaldoInicial(request(saldoV2()));return b;}
test('DSIPS v2 não usa admin legado, capacidade TI ou delegação como permissão operacional',async()=>{
 const b=negocio();for(const uid of ['ti','gestor','alvo','pat'])await negar(b.listarDsips(reqSemOp({tipo:'materiais'},uid)));await negar(b.listarDsips(reqSemOp({tipo:'materiais'},'legacy')),'failed-precondition');
});
test('Operador cautela e devolve com estoque e eventos atômicos sem administrar cadastros',async()=>{
 const b=await prepararEstoqueV2();const c=await b.registrarCautela(request(cautelaV2(),'operador'));let e=(await db.doc('dsipsEstoque/mat').get()).data();assert.equal(e.disponivel,3);assert.equal(e.emCautela,2);const evento=(await db.collection('dsipsEventos').where('tipo','==','cautela_registrada').get()).docs[0].data();assert.equal(evento.autorizacaoVersao,2);assert.equal(evento.operadorUid,'operador');await b.registrarDevolucao(request({cautelaId:c.id,itens:[{materialId:'mat',quantidade:1}]},'operador'));e=(await db.doc('dsipsEstoque/mat').get()).data();assert.equal(e.disponivel,4);assert.equal(e.emCautela,1);assert.equal((await db.doc('dsipsCautelas/'+c.id).get()).data().status,'parcial');await negar(b.registrarSaldoInicial(request(saldoV2(),'operador')));await negar(b.salvarCadastro(request({tipo:'categoria',id:'outra',dados:{nome:'Outra'}},'operador')));
});
test('gestor operacional cadastra, altera e inativa; delegação de gestão isolada não basta',async()=>{
 const b=negocio();await api.conceder(request({uid:'alvo',atribuicao:grant('gestor')}));await b.salvarCadastro(request({tipo:'categoria',id:'cat',dados:{nome:'Categoria'}},'alvo'));await b.salvarCadastro(request({tipo:'categoria',id:'cat',dados:{nome:'Categoria Corrigida',ativo:false}},'alvo'));assert.equal((await db.doc('dsipsCategorias/cat').get()).data().ativo,false);await negar(b.salvarCadastro(request({tipo:'local',id:'l',dados:{nome:'Local'}},'gestor')));
});
test('revogação operacional impede reenvio já confirmado sem duplicar estoque',async()=>{
 const b=await prepararEstoqueV2(),r=request(cautelaV2(),'operador');const a=await b.registrarCautela(r);assert.deepEqual(await b.registrarCautela(r),a);await api.revogar(request({uid:'operador',id:'op-inicial'}));await negar(b.registrarCautela(r));assert.equal((await db.doc('dsipsEstoque/mat').get()).data().disponivel,3);
});
test('consulta DSIPS não revela usuários completos; responsáveis são projeção paginada de ativos',async()=>{
 const b=await prepararEstoqueV2();await api.conceder(request({uid:'alvo',atribuicao:grant('consulta')}));const r=await b.listarDsips(reqSemOp({tipo:'materiais'},'alvo'));assert.equal(r.registros.length,1);await negar(b.listarResponsaveis(reqSemOp({},'alvo')));const u=await b.listarResponsaveis(reqSemOp({}));assert.ok(u.registros.some(x=>x.id==='alvo'));assert.ok(!u.registros.some(x=>x.id==='inativo'));for(const v of u.registros)assert.deepEqual(Object.keys(v).sort(),['ativo','id','matricula','nome']);
});
test('histórico de Operador contém só cautelas/devoluções e consulta não acessa eventos',async()=>{
 const b=await prepararEstoqueV2();await b.registrarCautela(request(cautelaV2(),'operador'));const r=await b.listarEventos(reqSemOp({}));assert.deepEqual(r.registros.map(x=>x.tipo),['cautela_registrada']);const geral=await b.listarEventos(reqSemOp({},'super'));assert.equal(geral.registros.length,3);await api.conceder(request({uid:'alvo',atribuicao:grant('consulta')}));await negar(b.listarEventos(reqSemOp({},'alvo')));await negar(b.listarDsips(reqSemOp({tipo:'devolucoes'},'alvo')));
});
test('paginação operacional limita volume e não repete registros; coleções arbitrárias são negadas',async()=>{
 const b=negocio();for(const id of ['a','b','c'])await db.doc('dsipsMateriais/'+id).set({nome:id});const a=await b.listarDsips(reqSemOp({tipo:'materiais',limite:2}));const r=await b.listarDsips(reqSemOp({tipo:'materiais',limite:2,cursor:a.proximoCursor}));assert.equal(a.registros.length,2);assert.equal(r.registros.length,1);assert.ok(!r.registros.some(x=>a.registros.some(y=>y.id===x.id)));await negar(b.listarDsips(reqSemOp({tipo:'usuarios'})),'invalid-argument');await negar(b.listarDsips(reqSemOp({tipo:'materiais',limite:51})),'invalid-argument');
});
test('consulta patrimonial usa localização efetiva no servidor e não lotação ou origem antiga',async()=>{
 const b=negocio();await api.conceder(request({uid:'alvo',atribuicao:patrimonio('consulta')}));await db.doc('usuarios/alvo').update({lotacao:'Gabinete'});await db.doc('patrimonios/p1').set({divisao:'DA',localizacaoAtual:'Gabinete'});await db.doc('patrimonios/p2').set({divisao:'Gabinete',localizacaoAtual:'DA'});await negar(b.consultarPatrimonio(reqSemOp({id:'p1'},'alvo')));assert.equal((await b.consultarPatrimonio(reqSemOp({id:'p2'},'alvo'))).id,'p2');await negar(b.consultarPatrimonio(reqSemOp({id:'p2'},'ti')));await negar(b.consultarPatrimonio(reqSemOp({id:'p2',divisaoId:'DA'},'alvo')),'invalid-argument');
});
test('DSIPS rejeita estoque insuficiente e excesso de devolução sem gravação parcial',async()=>{
 const b=await prepararEstoqueV2();await negar(b.registrarCautela(request({...cautelaV2(),itens:[{materialId:'mat',quantidade:6}]},'operador')),'failed-precondition');assert.equal((await db.doc('dsipsEstoque/mat').get()).data().disponivel,5);const c=await b.registrarCautela(request(cautelaV2(),'operador'));await negar(b.registrarDevolucao(request({cautelaId:c.id,itens:[{materialId:'mat',quantidade:3}]},'operador')),'failed-precondition');assert.equal((await db.doc('dsipsEstoque/mat').get()).data().disponivel,3);
});
test('duas cautelas concorrentes não consomem o mesmo saldo nem deixam auditoria parcial',async()=>{
 const b=await prepararEstoqueV2();const r=await Promise.allSettled([b.registrarCautela(request({...cautelaV2(),itens:[{materialId:'mat',quantidade:4}]},'operador')),b.registrarCautela(request({...cautelaV2(),itens:[{materialId:'mat',quantidade:4}]},'operador'))]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await db.doc('dsipsEstoque/mat').get()).data().disponivel,1);assert.equal((await db.collection('dsipsCautelas').get()).size,1);
});
test('unidade individualizada não sai duas vezes e devolução restaura seu vínculo',async()=>{
 const b=negocio();await db.doc('dsipsCategorias/cat').set({ativo:true});await db.doc('dsipsLocais/local').set({ativo:true,nome:'Local'});await b.salvarCadastro(request({tipo:'material',id:'mat',dados:{nome:'Rádio',categoriaId:'cat',controle:'individualizado',unidade:'un'}}));await b.registrarSaldoInicial(request({...saldoV2(),quantidade:1,identificadores:['RAD-001']}));const u=(await db.collection('dsipsUnidades').get()).docs[0].id;const c=await b.registrarCautela(request({...cautelaV2(),itens:[{materialId:'mat',quantidade:1,unidadeIds:[u]}]},'operador'));await negar(b.registrarCautela(request({...cautelaV2(),itens:[{materialId:'mat',quantidade:1,unidadeIds:[u]}]},'operador')),'failed-precondition');await b.registrarDevolucao(request({cautelaId:c.id,itens:[{materialId:'mat',quantidade:1,unidadeIds:[u]}]},'operador'));const d=(await db.doc('dsipsUnidades/'+u).get()).data();assert.equal(d.situacao,'disponivel');assert.equal(d.cautelaId,null);
});
test('responsável inativo não recebe cautela e ator desativado não reutiliza recibo',async()=>{
 const b=await prepararEstoqueV2();await negar(b.registrarCautela(request({...cautelaV2(),responsavelId:'inativo'},'operador')),'failed-precondition');const r=request(cautelaV2(),'operador');await b.registrarCautela(r);await db.doc('usuarios/operador').update({ativo:false});await negar(b.registrarCautela(r));assert.equal((await db.collection('dsipsCautelas').get()).size,1);
});
test('revogação durante abertura da operação é lida na transação antes de movimentar',async()=>{
 await prepararEstoqueV2();let primeira=true;const contexto={...api.contexto,identidade:async(...args)=>{assert.ok(args[1],'autorização deve usar a mesma transação');if(args[0]==='operador'&&primeira){primeira=false;await db.doc('cmappAcessos/operador').update({atribuicoes:[]});}return api.contexto.identidade(...args);}};const b=require('../operacoes-v2/servico.cjs').criarOperacoesV2({db,FieldValue,HttpsError,contexto});await negar(b.registrarCautela(request(cautelaV2(),'operador')));assert.equal((await db.collection('dsipsCautelas').get()).size,0);assert.equal((await db.doc('dsipsEstoque/mat').get()).data().disponivel,5);
});
test('ausência ou versão desconhecida da política nunca usa perfil admin nas operações',async()=>{
 const b=negocio();await db.doc('cmappAcessos/operador').update({versao:99});await negar(b.listarDsips(reqSemOp({tipo:'materiais'})),'failed-precondition');await db.doc('cmappAcessos/operador').delete();await negar(b.listarDsips(reqSemOp({tipo:'materiais'})),'failed-precondition');await negar(b.consultarPatrimonio(reqSemOp({id:'x'})),'failed-precondition');
});
