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
 const client=env.authenticatedContext('super').firestore();for(const c of ['cmappAcessos','cmappAcessosEventos','cmappAcessosOperacoes','patrimoniosEventos','patrimoniosOperacoes']){await assertFails(setDoc(doc(client,c+'/novo'),{papelPlataforma:'superadmin'}));await assertFails(getDoc(doc(client,c+'/super')));}
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

function contasFake(opcoes={}){
 const pessoas=new Map(),chamadas=[];let falhar=false,aoAtualizar=null;
 const auth={async createUser(u){chamadas.push(['create',u.uid]);if(pessoas.has(u.uid))throw Object.assign(Error(),{code:'auth/uid-already-exists'});if([...pessoas.values()].some(x=>x.email===u.email))throw Object.assign(Error(),{code:'auth/email-already-exists'});pessoas.set(u.uid,u);return u;},async getUser(uid){return pessoas.get(uid);},async updateUser(uid,d){chamadas.push(['update',uid,d]);if(falhar)throw Error('falha simulada');if(aoAtualizar)await aoAtualizar(uid,d);return{uid,...d};},async revokeRefreshTokens(uid){chamadas.push(['revoke',uid]);}};
 return{api:require('./contas.cjs').criarContasV2({db,auth,FieldValue,HttpsError,contexto:api.contexto,...opcoes}),pessoas,chamadas,falhar(){falhar=true;},reparar(){falhar=false;},aoAtualizar(fn){aoAtualizar=fn;}};
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
test('reconciliação retoma falha com estado atual e recusa operador sem gestão',async()=>{
 const f=contasFake();f.falhar();await f.api.alterarEstado(request({uid:'alvo',ativo:false},'ti'));
 assert.equal((await db.doc('cmappContasSincronizacao/alvo').get()).data().pendente,true);
 await negar(f.api.reconciliar({auth:{uid:'operador'},data:{uid:'alvo'}}));
 f.reparar();const r=await f.api.reconciliar({auth:{uid:'ti'},data:{uid:'alvo'}});assert.equal(r.sincronizado,true);
 assert.equal((await db.doc('cmappContasSincronizacao/alvo').get()).data().pendente,false);
 assert.equal(f.chamadas.filter(x=>x[0]==='update').at(-1)[2].disabled,true);
});
test('alteração concorrente durante sincronização converge para o estado mais recente',async()=>{
 const f=contasFake();let primeira=true;
 f.aoAtualizar(async()=>{if(primeira){primeira=false;const r=await f.api.alterarEstado(request({uid:'alvo',ativo:true},'ti'));assert.equal(r.sincronizado,false);}});
 const r=await f.api.alterarEstado(request({uid:'alvo',ativo:false},'ti'));assert.equal(r.sincronizado,true);
 assert.equal(f.chamadas.filter(x=>x[0]==='update').at(-1)[2].disabled,false);
 assert.equal((await dados('alvo')).ativo,true);assert.equal((await db.doc('cmappContasSincronizacao/alvo').get()).data().pendente,false);
});
test('consulta de sincronização não revela pendências a gestor operacional',async()=>{
 const f=contasFake(),r={auth:{uid:'ti'},data:{uid:'alvo'}};
 assert.equal((await f.api.consultarSincronizacao(r)).estado,'nao_verificado');
 f.falhar();await f.api.alterarEstado(request({uid:'alvo',ativo:false},'ti'));
 assert.equal((await f.api.consultarSincronizacao(r)).estado,'pendente');
 await negar(f.api.consultarSincronizacao({auth:{uid:'operador'},data:{uid:'alvo'}}));
 f.reparar();await f.api.reconciliar(r);assert.equal((await f.api.consultarSincronizacao(r)).estado,'sincronizado');
});
test('trabalho só executa com ativação explícita e retoma pendências sem ação de usuário',async()=>{
 const f=contasFake();f.falhar();await f.api.alterarEstado(request({uid:'alvo',ativo:false},'ti'));f.reparar();
 assert.equal((await f.api.processarPendencias()).ativo,false);
 await db.doc('cmappConfiguracao/acessos').set({sincronizacaoContasAtiva:true});
 assert.equal((await f.api.processarPendencias()).sincronizadas,1);assert.equal((await f.api.consultarSincronizacao({auth:{uid:'ti'},data:{uid:'alvo'}})).estado,'sincronizado');
 await db.doc('cmappConfiguracao/acessos').update({manutencaoV2:true});assert.equal((await f.api.processarPendencias()).ativo,false);await negar(api.consultarMeusAcessos(request()),'unavailable');
});
test('cursor da retomada não deixa falhas permanentes bloquearem contas posteriores',async()=>{
 const f=contasFake();const b=db.batch();for(let i=0;i<25;i++)b.set(db.doc('cmappContasSincronizacao/a'+String(i).padStart(2,'0')),{pendente:true,geracao:1});
 b.set(db.doc('cmappContasSincronizacao/alvo'),{pendente:true,geracao:1});b.set(db.doc('cmappConfiguracao/acessos'),{sincronizacaoContasAtiva:true});await b.commit();
 assert.equal((await f.api.processarPendencias()).processadas,25);assert.equal((await f.api.processarPendencias()).sincronizadas,1);assert.equal((await db.doc('cmappContasSincronizacao/alvo').get()).data().pendente,false);
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
 try{writeFileSync(file,original);execFileSync(process.execPath,['scripts/preparar-rules-transicao-v2.mjs',file]);const preparado=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:readFileSync(file,'utf8')}});await preparado.cleanup();const client=env.authenticatedContext('super').firestore();await getDoc(doc(client,'usuarios/super'));await assertFails(getDoc(doc(client,'usuarios/alvo')));await assertFails(getDoc(doc(client,'patrimonios/exemplo')));const legado=env.authenticatedContext('legacy').firestore();await getDoc(doc(legado,'usuarios/alvo'));await getDoc(doc(legado,'patrimonios/exemplo'));await db.doc('cmappConfiguracao/acessos').set({patrimoniosOperacaoVersao:2});await assertFails(getDoc(doc(legado,'patrimonios/exemplo')));await assertFails(getDoc(doc(legado,'inventarios/DA')));await getDoc(doc(legado,'dsipsMateriais/exemplo'));await db.doc('cmappConfiguracao/acessos').update({manutencaoV2:true});await assertFails(getDoc(doc(legado,'dsipsMateriais/exemplo')));await assertFails(updateDoc(doc(client,'usuarios/super'),{nome:'Em manutenção'}));}finally{const restaurado=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8088,rules:original}});await restaurado.cleanup();rmSync(dir,{recursive:true});}
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
test('histórico DSIPS pagina por data decrescente com desempate por ID sem expor auditoria ao Operador',async()=>{
 const b=negocio();const datas=[['z-antigo','cautela_registrada',1000],['a-novo','devolucao_registrada',3000],['b-meio','cautela_registrada',2000],['c-privado','cadastro_salvo',4000]];for(const[id,tipo,ms]of datas)await db.doc('dsipsEventos/'+id).set({tipo,registradoEm:new Date(ms),dados:{}});
 const a=await b.listarEventos(reqSemOp({limite:2}));assert.deepEqual(a.registros.map(x=>x.id),['a-novo','b-meio']);assert.equal(a.ordenacao,'registradoEm_desc');const r=await b.listarEventos(reqSemOp({limite:2,cursor:a.proximoCursor}));assert.deepEqual(r.registros.map(x=>x.id),['z-antigo']);assert.equal(r.proximoCursor,null);
 await negar(b.listarEventos(reqSemOp({cursor:'c-privado'})),'invalid-argument');await negar(b.listarEventos(reqSemOp({cursor:'nao-existe'})),'invalid-argument');const root=await b.listarEventos(reqSemOp({},'super'));assert.equal(root.registros[0].id,'c-privado');
});
test('cursor cronológico desempata eventos com a mesma data sem repetir ou perder linhas',async()=>{
 const b=negocio();for(const id of ['a','b','c'])await db.doc('dsipsEventos/'+id).set({tipo:'cautela_registrada',registradoEm:new Date(1000)});const a=await b.listarEventos(reqSemOp({limite:2}));assert.deepEqual(a.registros.map(e=>e.id),['c','b']);const r=await b.listarEventos(reqSemOp({limite:2,cursor:a.proximoCursor}));assert.deepEqual(r.registros.map(e=>e.id),['a']);
});

const patApi=()=>require('../operacoes-v2/patrimonios.cjs').criarPatrimoniosV2({db,FieldValue,HttpsError,contexto:api.contexto});
async function prepararPat(){await db.doc('divisoes/da').set({nome:'DA',ativo:true});await db.doc('divisoes/gab').set({nome:'Gabinete',ativo:true});await db.doc('cmappConfiguracao/acessos').set({patrimoniosIndiceVersao:2,patrimoniosOperacaoVersao:2});await db.doc('patrimonios/p1').set({descricao:'Bem de teste',divisao:'DA',localizacaoAtual:'DA',localizacaoEfetivaV2:'DA',localizado:false,historico:[],revisaoOperacionalV2:0});await api.conceder(request({uid:'alvo',atribuicao:patrimonio()}));return patApi();}
const conferencia=(mais={})=>({id:'p1',destino:'DA',metodoLocalizacao:'digitacao',observacao:'Conferência física',revisaoEsperada:0,...mais});
test('Patrimônios: consulta por divisão não usa lotação, perfil antigo ou delegação de gestão',async()=>{
 const p=await prepararPat();await db.doc('patrimonios/p2').set({divisao:'Gabinete',localizacaoAtual:'Gabinete',localizacaoEfetivaV2:'Gabinete'});const r=await p.listar(reqSemOp({divisao:'DA'},'alvo'));assert.deepEqual(r.registros.map(x=>x.id),['p1']);await negar(p.listar(reqSemOp({},'alvo')));await negar(p.listar(reqSemOp({divisao:'Gabinete'},'alvo')));await negar(p.listar(reqSemOp({divisao:'DA'},'ti')));await negar(p.listar(reqSemOp({divisao:'DA'},'pat')));
});
test('Patrimônios: preparação incompleta ou índice divergente falha, sem total parcial',async()=>{
 const p=await prepararPat();await db.doc('cmappConfiguracao/acessos').update({patrimoniosIndiceVersao:1});await negar(p.listar(reqSemOp({divisao:'DA'},'alvo')),'failed-precondition');await db.doc('cmappConfiguracao/acessos').update({patrimoniosIndiceVersao:2});await db.doc('patrimonios/p1').update({localizacaoAtual:'Gabinete'});await negar(p.listar(reqSemOp({divisao:'DA'},'alvo')),'failed-precondition');
});
test('Patrimônios: conferência usa autor/data de servidor e grava histórico, evento e recibo atomicamente',async()=>{
 const p=await prepararPat(),r=request(conferencia(),'alvo');const a=await p.conferir(r);assert.deepEqual(await p.conferir(r),a);const b=(await db.doc('patrimonios/p1').get()).data();assert.equal(b.localizado,true);assert.equal(b.conferidoPor,'alvo@exemplo.invalid');assert.equal(b.revisaoOperacionalV2,1);assert.equal(b.historico.length,1);assert.equal(b.historico[0].metodoLocalizacao,'digitacao');assert.equal((await db.collection('patrimoniosEventos').get()).size,1);assert.equal((await db.collection('patrimoniosOperacoes').get()).size,1);
});
test('Patrimônios: conta TI e consulta não conferem, campos privilegiados e método forjado são rejeitados',async()=>{
 const p=await prepararPat();await api.conceder(request({uid:'operador',atribuicao:patrimonio('consulta')}));for(const uid of ['ti','operador','pat'])await negar(p.conferir(request(conferencia(),uid)));await negar(p.conferir(request({...conferencia(),perfil:'admin'},'alvo')),'invalid-argument');await negar(p.conferir(request(conferencia({metodoLocalizacao:'automatico'}),'alvo')),'invalid-argument');assert.equal((await db.doc('patrimonios/p1').get()).data().historico.length,0);
});
test('Patrimônios: conferência em destino fora da abrangência é negada, sugestão não concede acesso ao destino',async()=>{
 const p=await prepararPat();await negar(p.conferir(request(conferencia({destino:'Gabinete'}),'alvo')));await p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0,observacao:'Verificar destino'},'alvo'));const b=(await db.doc('patrimonios/p1').get()).data();assert.equal(b.localizado,false);assert.equal(b.localizacaoAtual,'DA');assert.equal(b.sugestaoDestinoStatus,'pendente');await db.doc('patrimonios/p2').set({localizacaoAtual:'Gabinete'});await negar(negocio().consultarPatrimonio(reqSemOp({id:'p2'},'alvo')));
});
test('Patrimônios: aprovação de sugestão muda destino sem declarar conferência física',async()=>{
 const p=await prepararPat();await p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo'));await p.resolverSugestao(request({id:'p1',decisao:'aprovar',revisaoEsperada:1}));const b=(await db.doc('patrimonios/p1').get()).data();assert.equal(b.localizado,false);assert.equal(b.localizacaoAtual,'Gabinete');assert.equal(b.localizacaoEfetivaV2,'Gabinete');assert.equal(b.sugestaoDestinoStatus,'aprovada');assert.equal(b.historico.length,2);await negar(negocio().consultarPatrimonio(reqSemOp({id:'p1'},'alvo')));
});
test('Patrimônios: aprovação exige atribuição em ambas divisões, além de papel operacional',async()=>{
 const p=await prepararPat();await p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo'));await api.conceder(request({uid:'pat',atribuicao:patrimonio('gestor')}));await negar(p.resolverSugestao(request({id:'p1',decisao:'aprovar',revisaoEsperada:1},'pat')));await api.conceder(request({uid:'pat',atribuicao:patrimonio('gestor',['Gabinete'])}));await p.resolverSugestao(request({id:'p1',decisao:'aprovar',revisaoEsperada:1},'pat'));assert.equal((await db.doc('patrimonios/p1').get()).data().localizacaoAtual,'Gabinete');
});
test('Patrimônios: transferência mantém local até decisão; rejeição conserva origem',async()=>{
 const p=await prepararPat();await p.conferir(request(conferencia({destino:'Gabinete'})));let b=(await db.doc('patrimonios/p1').get()).data();assert.equal(b.statusTransferencia,'pendente');assert.equal(b.localizacaoEfetivaV2,'DA');await p.resolverTransferencia(request({id:'p1',decisao:'rejeitar',revisaoEsperada:1}));b=(await db.doc('patrimonios/p1').get()).data();assert.equal(b.localizacaoAtual,'DA');assert.equal(b.statusTransferencia,'rejeitado');assert.equal(b.localizado,true);
});
test('Patrimônios: revisão antiga não resolve uma solicitação posterior',async()=>{
 const p=await prepararPat();await p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo'));const antigo=request({id:'p1',decisao:'aprovar',revisaoEsperada:1});await p.resolverSugestao(request({id:'p1',decisao:'rejeitar',revisaoEsperada:1}));await p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:2},'alvo'));await negar(p.resolverSugestao(antigo),'aborted');assert.equal((await db.doc('patrimonios/p1').get()).data().sugestaoDestinoStatus,'pendente');
});
test('Patrimônios: inventário bloqueado em origem ou destino impede operação sem gravações parciais',async()=>{
 const p=await prepararPat();await db.doc('inventarios/DA').set({estado:'encerrado'});await negar(p.conferir(request(conferencia(),'alvo')),'failed-precondition');await db.doc('inventarios/DA').delete();await db.doc('inventarios/Gabinete').set({estado:'encerrando'});await negar(p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo')),'failed-precondition');assert.equal((await db.collection('patrimoniosEventos').get()).size,0);
});
test('Patrimônios: destino inativo ou duplicado e solicitação paralela são bloqueados',async()=>{
 const p=await prepararPat();await db.doc('divisoes/gab').update({ativo:false});await negar(p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo')),'failed-precondition');await db.doc('divisoes/gab').update({ativo:true});await db.doc('divisoes/gab2').set({nome:'Gabinete',ativo:true});await negar(p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo')),'failed-precondition');await db.doc('divisoes/gab2').delete();await p.sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo'));await negar(p.conferir(request(conferencia({revisaoEsperada:1}),'alvo')),'failed-precondition');
});
test('Patrimônios: duas conferências concorrentes da mesma revisão confirmam somente uma',async()=>{
 const p=await prepararPat();const r=await Promise.allSettled([p.conferir(request(conferencia(),'alvo')),p.conferir(request(conferencia(),'alvo'))]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await db.doc('patrimonios/p1').get()).data().historico.length,1);assert.equal((await db.collection('patrimoniosEventos').get()).size,1);
});
test('Patrimônios: reenvio não permite permissão revogada ou reutilização do ID com conteúdo diferente',async()=>{
 const p=await prepararPat(),r=request(conferencia(),'alvo');await p.conferir(r);await negar(p.conferir({...r,data:{...r.data,observacao:'Outra'}}),'already-exists');await db.doc('cmappAcessos/alvo').update({atribuicoes:[]});await negar(p.conferir(r));assert.equal((await db.doc('patrimonios/p1').get()).data().historico.length,1);
});
test('Patrimônios: paginação por divisão preserva registros, incluindo páginas filtradas vazias',async()=>{
 const p=await prepararPat();await db.doc('patrimonios/p2').set({divisao:'DA',localizacaoEfetivaV2:'DA',statusTransferencia:'pendente'});const a=await p.listar(reqSemOp({divisao:'DA',limite:1,somentePendentes:true},'alvo'));assert.equal(a.registros.length,0);assert.equal(a.proximoCursor,'p1');const b=await p.listar(reqSemOp({divisao:'DA',limite:1,somentePendentes:true,cursor:a.proximoCursor},'alvo'));assert.deepEqual(b.registros.map(x=>x.id),['p2']);assert.equal(b.proximoCursor,null);await negar(p.listar(reqSemOp({divisao:'DA',limite:51},'alvo')),'invalid-argument');
});
test('Patrimônios: replay concorrente confirma um histórico e rejeição de sugestão preserva não localizado',async()=>{
 const p=await prepararPat(),r=request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo');const[a,b]=await Promise.all([p.sugerir(r),p.sugerir(r)]);assert.deepEqual(a,b);await p.resolverSugestao(request({id:'p1',decisao:'rejeitar',revisaoEsperada:1}));const item=(await db.doc('patrimonios/p1').get()).data();assert.equal(item.localizado,false);assert.equal(item.localizacaoAtual,'DA');assert.equal(item.historico.length,2);
});
test('Patrimônios: transferência aprovada atualiza índice e mantém a origem histórica',async()=>{
 const p=await prepararPat();await p.conferir(request(conferencia({destino:'Gabinete'})));await p.resolverTransferencia(request({id:'p1',decisao:'aprovar',revisaoEsperada:1}));const item=(await db.doc('patrimonios/p1').get()).data();assert.equal(item.divisaoOrigem,'DA');assert.equal(item.localizacaoAtual,'Gabinete');assert.equal(item.localizacaoEfetivaV2,'Gabinete');assert.equal(item.statusTransferencia,'aprovado');assert.equal((await p.listar(reqSemOp({divisao:'DA'},'alvo'))).registros.length,0);
});
const invApi=()=>require('../operacoes-v2/inventarios.cjs').criarInventariosV2({db,FieldValue,HttpsError,contexto:api.contexto});
const pedidoInv=(comando,revisaoEsperada,divisao='DA',mais={})=>request({comando,revisaoEsperada,divisao,...mais});
async function fecharInv(divisao='DA'){const api=invApi();const atual=await api.consultar(reqSemOp({divisao},'super'));let r=await api.comandar(pedidoInv('encerrar',atual.inventario.revisaoV2,divisao));while(r.estado==='encerrando')r=await api.comandar(pedidoInv('avancar',r.revisaoV2,divisao));return r;}
test('catálogo patrimonial retorna destinos e capacidades sem conceder consulta ao conteúdo de outras divisões',async()=>{const p=await prepararPat();const r=await p.catalogo(reqSemOp({},'alvo'));assert.equal(r.consultaGlobal,false);assert.equal(r.divisoes.find(d=>d.nome==='DA').conferir,true);assert.equal(r.divisoes.find(d=>d.nome==='Gabinete').consultar,false);await negar(p.catalogo(reqSemOp({},'ti')));});
test('inventário fecha fotografia imutável e bloqueia conferência durante/apos fechamento',async()=>{await prepararPat();const a=invApi();let r=await a.comandar(pedidoInv('encerrar',0));await negar(patApi().conferir(request(conferencia(),'alvo')),'failed-precondition');r=await a.comandar(pedidoInv('avancar',r.revisaoV2));assert.equal(r.estado,'encerrado');const s=await a.consultar(reqSemOp({divisao:'DA'},'alvo'));assert.equal(s.fechamentos[0].total,1);const itens=await a.itens(reqSemOp({divisao:'DA',fechamentoId:s.fechamentos[0].id},'alvo'));assert.equal(itens.registros[0].plaqueta,'p1');await negar(a.itens(reqSemOp({divisao:'DA',fechamentoId:s.fechamentos[0].id,exportar:true},'alvo')));});
test('inventário processa mais de um lote e reenvio não duplica fotografia',async()=>{await prepararPat();const lote=db.batch();for(let i=0;i<105;i++)lote.set(db.doc('patrimonios/item-'+String(i).padStart(3,'0')),{divisao:'DA',localizacaoEfetivaV2:'DA',localizado:i%2===0});await lote.commit();const a=invApi();const ini=await a.comandar(pedidoInv('encerrar',0));const req=pedidoInv('avancar',ini.revisaoV2);const r=await a.comandar(req);assert.equal(r.estado,'encerrando');assert.deepEqual(await a.comandar(req),r);const fim=await a.comandar(pedidoInv('avancar',r.revisaoV2));assert.equal(fim.total,106);assert.equal(fim.estado,'encerrado');const s=await a.consultar(reqSemOp({divisao:'DA'},'super'));const fotos=await db.collection('inventarios/DA/fechamentos/'+s.fechamentos[0].id+'/itens').get();assert.equal(fotos.size,106);});
test('inventário não fecha com solicitação pendente de saída ou entrada',async()=>{await prepararPat();await patApi().sugerir(request({id:'p1',destino:'Gabinete',revisaoEsperada:0},'alvo'));await negar(invApi().comandar(pedidoInv('encerrar',0)),'failed-precondition');await negar(invApi().comandar(pedidoInv('encerrar',0,'Gabinete')),'failed-precondition');});
test('reabertura exige justificativa, preserva fotografia e consolidação não aceita subconjunto de divisões',async()=>{await prepararPat();await fecharInv();const a=invApi();let d=(await a.consultar(reqSemOp({divisao:'DA'},'super'))).inventario;await negar(a.comandar(pedidoInv('reabrir',d.revisaoV2)),'invalid-argument');await a.comandar(pedidoInv('reabrir',d.revisaoV2,'DA',{justificativa:'Correção física'}));assert.equal((await a.consultar(reqSemOp({divisao:'DA'},'super'))).fechamentos.length,1);await fecharInv();await negar(a.consolidar(request({ciclo:1,divisoes:['DA']})),'invalid-argument');await negar(a.consolidar(request({ciclo:1})),'failed-precondition');});
test('consolidação e reinício mantêm histórico anterior e invalidam revisão antiga de conferência',async()=>{await prepararPat();await patApi().conferir(request(conferencia(),'alvo'));await fecharInv();await fecharInv('Gabinete');const a=invApi(),r=request({ciclo:1});const geral=await a.consolidar(r);assert.equal(geral.total,1);assert.deepEqual(await a.consolidar(r),geral);const d=(await a.consultar(reqSemOp({divisao:'DA'},'super'))).inventario;await negar(a.comandar(pedidoInv('reabrir',d.revisaoV2,'DA',{justificativa:'Não permitido após geral'})),'failed-precondition');let proximo=await a.comandar(pedidoInv('reiniciar',d.revisaoV2));proximo=await a.comandar(pedidoInv('avancar',proximo.revisaoV2));assert.equal(proximo.ciclo,2);assert.equal(proximo.estado,'aberto');const bem=(await db.doc('patrimonios/p1').get()).data();assert.equal(bem.localizado,false);assert.equal(bem.historico.length,1);assert.equal(bem.revisaoOperacionalV2,2);await negar(patApi().conferir(request(conferencia({revisaoEsperada:1}),'alvo')),'aborted');assert.equal((await a.consultar(reqSemOp({divisao:'DA'},'super'))).fechamentos.length,1);});
test('gestão de inventário exige papel operacional e revogação impede continuar lote já iniciado',async()=>{await prepararPat();for(const uid of ['ti','alvo','pat'])await negar(invApi().comandar({...pedidoInv('encerrar',0),auth:{uid}}));await api.conceder(request({uid:'pat',atribuicao:patrimonio('gestor')}));const a=invApi(),r=await a.comandar({...pedidoInv('encerrar',0),auth:{uid:'pat'}});await db.doc('cmappAcessos/pat').update({atribuicoes:[]});await negar(a.comandar({...pedidoInv('avancar',r.revisaoV2),auth:{uid:'pat'}}));assert.equal((await db.doc('inventarios/DA').get()).data().estado,'encerrando');});
test('fotografia preserva campos patrimoniais e consolidação rejeita totais inconsistentes',async()=>{await prepararPat();await db.doc('patrimonios/p1').update({valor:1200,marca:'Fabricante de teste'});await fecharInv();await fecharInv('Gabinete');const a=invApi(),s=await a.consultar(reqSemOp({divisao:'DA'},'super'));const r=await a.itens(reqSemOp({divisao:'DA',fechamentoId:s.fechamentos[0].id},'super'));assert.equal(r.registros[0].valor,1200);assert.equal(r.registros[0].marca,'Fabricante de teste');await db.doc('inventarios/DA/fechamentos/'+s.fechamentos[0].id).update({total:99});await negar(a.consolidar(request({ciclo:1})),'failed-precondition');});
test('divisão acrescentada após consolidação não encerra ou reinicia fotografia fora do geral',async()=>{await prepararPat();await fecharInv();await fecharInv('Gabinete');const a=invApi();await a.consolidar(request({ciclo:1}));await db.doc('divisoes/nova').set({nome:'Nova',ativo:true});await negar(a.comandar(pedidoInv('encerrar',0,'Nova')),'failed-precondition');});
test('filtros patrimoniais preservam sugestão como não localizado e busca sem acentos',async()=>{const p=await prepararPat();await db.doc('patrimonios/p1').update({descricao:'Rádio portátil',sugestaoDestinoStatus:'pendente',sugestaoDestinoDivisao:'Gabinete'});const r=await p.listar(reqSemOp({divisao:'DA',situacao:'nao_localizados',busca:'radio'},'alvo'));assert.equal(r.registros.length,1);assert.equal((await p.listar(reqSemOp({divisao:'DA',situacao:'aguardando'},'alvo'))).registros.length,0);await negar(p.listar(reqSemOp({divisao:'DA',situacao:'inexistente'},'alvo')),'invalid-argument');});
test('exportação da relação exige ação específica e mantém escopo da divisão',async()=>{const p=await prepararPat();await negar(p.listar(reqSemOp({divisao:'DA',exportar:true},'alvo')));await api.conceder(request({uid:'pat',atribuicao:patrimonio('gestor')}));assert.equal((await p.listar(reqSemOp({divisao:'DA',exportar:true},'pat'))).registros.length,1);await negar(p.listar(reqSemOp({divisao:'Gabinete',exportar:true},'pat')));});
test('mutação patrimonial permanece bloqueada enquanto a transição dos escritores não estiver concluída',async()=>{const p=await prepararPat();await db.doc('cmappConfiguracao/acessos').update({patrimoniosOperacaoVersao:1});await negar(p.conferir(request(conferencia(),'alvo')),'failed-precondition');assert.equal((await db.doc('patrimonios/p1').get()).data().historico.length,0);assert.equal((await db.collection('patrimoniosEventos').get()).size,0);});
test('resumo patrimonial usa contagens de toda a abrangência, sem misturar sugestão e transferência',async()=>{const p=await prepararPat();await db.doc('patrimonios/p2').set({divisao:'DA',localizacaoEfetivaV2:'DA',localizado:true});await db.doc('patrimonios/p3').set({divisao:'DA',localizacaoEfetivaV2:'DA',localizado:true,statusTransferencia:'pendente'});await db.doc('patrimonios/p4').set({divisao:'DA',localizacaoEfetivaV2:'DA',localizado:false,sugestaoDestinoStatus:'pendente'});await db.doc('patrimonios/p5').set({divisao:'Gabinete',localizacaoEfetivaV2:'Gabinete',localizado:false});const r=await p.resumir(reqSemOp({divisao:'DA'},'alvo'));assert.deepEqual(r,{abrangencia:'DA',total:4,localizados:1,pendentes:2,aguardando:1,sugestoes:1,percentualLocalizado:25});assert.equal((await p.resumir(reqSemOp({},'super'))).total,5);await negar(p.resumir(reqSemOp({},'alvo')));await negar(p.resumir(reqSemOp({divisao:'Gabinete'},'alvo')));await negar(p.resumir(reqSemOp({divisao:'DA'},'ti')));});
test('resumo não é limitado pela paginação e exige preparação integral e autorização atuais',async()=>{const p=await prepararPat(),b=db.batch();for(let i=0;i<60;i++)b.set(db.doc('patrimonios/contagem-'+i),{divisao:'DA',localizacaoEfetivaV2:'DA',localizado:true});await b.commit();assert.equal((await p.resumir(reqSemOp({divisao:'DA'},'alvo'))).total,61);await negar(p.resumir(reqSemOp({divisao:'DA',busca:'texto'},'alvo')),'invalid-argument');await db.doc('cmappConfiguracao/acessos').update({patrimoniosIndiceVersao:1});await negar(p.resumir(reqSemOp({divisao:'DA'},'alvo')),'failed-precondition');await db.doc('cmappConfiguracao/acessos').update({patrimoniosIndiceVersao:2});await db.doc('cmappAcessos/alvo').update({atribuicoes:[]});await negar(p.resumir(reqSemOp({divisao:'DA'},'alvo')));});
test('relatório de pendências reúne não localizados e transferências, sem incluir conferidos concluídos',async()=>{const p=await prepararPat();await db.doc('patrimonios/ok').set({divisao:'DA',localizacaoEfetivaV2:'DA',localizado:true,statusTransferencia:'concluido'});await db.doc('patrimonios/transf').set({divisao:'DA',localizacaoEfetivaV2:'DA',localizado:true,statusTransferencia:'pendente'});const r=await p.listar(reqSemOp({divisao:'DA',situacao:'nao_concluidos',exportar:true},'super'));assert.deepEqual(r.registros.map(x=>x.id),['p1','transf']);});
test('busca numérica usa prefixo de plaqueta no banco e rejeita cursor de outro filtro',async()=>{const p=await prepararPat();await db.doc('patrimonios/123001').set({divisao:'DA',localizacaoEfetivaV2:'DA',descricao:'Bem'});await db.doc('patrimonios/912300').set({divisao:'DA',localizacaoEfetivaV2:'DA',descricao:'Modelo 123'});const r=await p.listar(reqSemOp({divisao:'DA',busca:'123'},'alvo'));assert.deepEqual(r.registros.map(x=>x.id),['123001']);await negar(p.listar(reqSemOp({divisao:'DA',busca:'12'},'alvo')),'invalid-argument');await negar(p.listar(reqSemOp({divisao:'DA',busca:'123',cursor:'912300'},'alvo')),'invalid-argument');});

async function planoLegado(){
 const m=await import('../../scripts/lib/migracao-acessos-v2.mjs');
 const snapshot={formato:1,ambiente:'hml',projectId:m.PROJETOS.hml,documentos:{'usuarios/legacy':(await db.doc('usuarios/legacy').get()).data()}};
 const revisao={ambiente:'hml',projectId:m.PROJETOS.hml,superadminUid:'legacy',revisadoPor:'Revisor Teste',contas:[{uid:'legacy',revisado:true,politica:{papelPlataforma:'superadmin',permissoesPlataforma:[],atribuicoes:[],delegacoes:[]}}]};
 return{m,plano:m.prepararMigracao(snapshot,revisao)};
}
test('migração e reversão transacionais preservam dados e reenvios não duplicam eventos',async()=>{
 const {m,plano}=await planoLegado(),antes=(await db.doc('usuarios/legacy').get()).data();
 await assert.rejects(m.executarPlano({db,plano,modo:'aplicar'}),/manutenção/);
 await db.doc('cmappConfiguracao/acessos').set({manutencaoV2:true,legadoBloqueado:true,sincronizacaoContasAtiva:false});
 assert.equal((await m.executarPlano({db,plano,modo:'aplicar'})).estado,'aplicada');assert.equal((await dados('legacy')).papelPlataforma,'superadmin');
 assert.equal((await m.executarPlano({db,plano,modo:'aplicar'})).repetida,true);
 assert.equal((await m.executarPlano({db,plano,modo:'reverter'})).estado,'revertida');assert.deepEqual((await db.doc('usuarios/legacy').get()).data(),antes);assert.equal((await db.doc('cmappAcessos/legacy').get()).exists,false);
 assert.equal((await m.executarPlano({db,plano,modo:'reverter'})).repetida,true);assert.equal(await eventos(),2);
});
test('mudança posterior impede reversão inteira, sem sobrescrever histórico ou conta',async()=>{
 const {m,plano}=await planoLegado();await db.doc('cmappConfiguracao/acessos').set({manutencaoV2:true,legadoBloqueado:true});await m.executarPlano({db,plano,modo:'aplicar'});
 await db.doc('usuarios/legacy').update({nome:'Mudança Posterior'});
 await assert.rejects(m.executarPlano({db,plano,modo:'reverter'}),/Divergência/);assert.equal((await dados('legacy')).papelPlataforma,'superadmin');assert.equal((await db.doc('usuarios/legacy').get()).data().nome,'Mudança Posterior');
});
test('novo documento após snapshot completo impede aplicação da migração',async()=>{
 const {m}=await planoLegado();const snap=await db.collection('usuarios').get();const snapshot={formato:1,ambiente:'hml',projectId:m.PROJETOS.hml,colecoesCompletas:['usuarios'],documentos:Object.fromEntries(snap.docs.map(d=>[d.ref.path,d.data()]))};
 const plano=m.prepararMigracao(snapshot,{ambiente:'hml',projectId:m.PROJETOS.hml,superadminUid:'legacy',revisadoPor:'Revisor Teste',contas:[{uid:'legacy',revisado:true,politica:{papelPlataforma:'superadmin',permissoesPlataforma:[],atribuicoes:[],delegacoes:[]}}]});
 await db.doc('usuarios/novo').set({nome:'Posterior'});await db.doc('cmappConfiguracao/acessos').set({manutencaoV2:true,legadoBloqueado:true});
 await assert.rejects(m.executarPlano({db,plano,modo:'aplicar'}),/Coleção mudou/);assert.equal((await db.doc('cmappAcessos/legacy').get()).exists,false);
});

test('retomada respeita concessão vigente e recupera trabalho interrompido após expiração',async()=>{
 let instante=100000;const f=contasFake({agora:()=>instante});await db.doc('cmappConfiguracao/acessos').set({sincronizacaoContasAtiva:true});await db.doc('cmappTrabalhos/sincronizacaoContas').set({token:'interrompido',leaseAte:instante+120000});await db.doc('cmappContasSincronizacao/alvo').set({pendente:true,geracao:1,token:'interrompido',leaseAte:instante+120000});
 assert.equal((await f.api.processarPendencias()).ocupado,true);assert.equal(f.chamadas.length,0);instante+=120001;assert.equal((await f.api.processarPendencias()).sincronizadas,1);assert.equal((await db.doc('cmappContasSincronizacao/alvo').get()).data().pendente,false);
});

test('preflight lê snapshot real do emulador e preserva Timestamp no plano sem mutações',async()=>{
 const {prepararHml}=await import('../../scripts/lib/preflight-hml-v2.mjs');const{criarCodecFirestore}=await import('../../scripts/lib/codec-firestore-v2.mjs');const{Timestamp,GeoPoint}=req('firebase-admin/firestore');
 await db.doc('usuarios/legacy').update({criadoEm:new Timestamp(100,12345)});const quando=(await db.doc('usuarios/legacy').get()).data().criadoEm;
 const {encode,decode}=criarCodecFirestore({Timestamp,GeoPoint,db,projectId});
 const revisao={ambiente:'hml',projectId:'cm-app-homologacao',superadminUid:'legacy',revisadoPor:'Revisor Teste',contas:[{uid:'legacy',revisado:true,politica:{papelPlataforma:'superadmin',permissoesPlataforma:[],atribuicoes:[],delegacoes:[]}}]};
 const r=await prepararHml({db,auth:{getUser:async uid=>({uid,email:'legacy@exemplo.invalid',disabled:false})},revisao,encode});
 assert.equal(r.resumo.documentosPropostos,2);assert.equal((await db.doc('usuarios/legacy').get()).data().autorizacaoVersao,undefined);assert.equal((await db.doc('cmappAcessos/legacy').get()).exists,false);
 const m=await import('../../scripts/lib/migracao-acessos-v2.mjs');await db.doc('cmappConfiguracao/acessos').set({manutencaoV2:true,legadoBloqueado:true});await m.executarPlano({db,plano:r.plano,modo:'aplicar',encode,decode});assert.deepEqual((await db.doc('usuarios/legacy').get()).data().criadoEm,quando);await m.executarPlano({db,plano:r.plano,modo:'reverter',encode,decode});assert.deepEqual((await db.doc('usuarios/legacy').get()).data().criadoEm,quando);
});
