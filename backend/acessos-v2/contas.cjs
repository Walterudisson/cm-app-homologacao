'use strict';
const {randomBytes}=require('node:crypto');
function criarContasV2({db,auth,FieldValue,HttpsError,contexto:c}){
 const erro=(code,msg)=>{throw new HttpsError(code,msg);};
 const texto=(v,n,max=120)=>{if(typeof v!=='string'||v.trim().length<3||v.trim().length>max)erro('invalid-argument',n+' inválido.');return v.trim();};
 const idOperacao=request=>c.validarId(request.data?.operacaoId,'Operação');
 async function criar(request){
  const autorUid=c.uidDoPedido(request);c.campos(request.data,['nome','email','lotacao','operacaoId']);
  const nome=texto(request.data.nome,'Nome'),email=texto(request.data.email,'E-mail',180).toLowerCase(),lotacao=texto(request.data.lotacao,'Lotação');
  if(!/^\S+@\S+\.\S+$/.test(email))erro('invalid-argument','E-mail inválido.');
  const op=idOperacao(request);const fp=c.hash({nome,email,lotacao});const key=c.hash({autorUid,op,tipo:'criar_conta'});const uid='cmapp-'+key.slice(0,40);const recibo=db.doc('cmappContasOperacoes/'+key);
  const p=await c.politicaPromise;
  const reserva=await db.runTransaction(async tx=>{
   const autor=await c.identidade(autorUid,tx);c.ativo(autor);if(!p.podeNaPlataforma(autor,'contas.gerenciar'))erro('permission-denied','Sem permissão para cadastrar contas.');
   const r=await tx.get(recibo);if(r.exists&&r.data().fingerprint!==fp)erro('already-exists','Operação utilizada com outros dados.');
   if(r.data()?.status==='confirmada')return{resultado:r.data().resultado};
   if(!r.exists)tx.create(recibo,{fingerprint:fp,uid,status:'reservada',autorUid,criadoEm:FieldValue.serverTimestamp()});return{uid};
  });
  if(reserva.resultado)return reserva.resultado;
  // UID determinístico da reserva: retomada não associa conta pré-existente por e-mail.
  try{await auth.createUser({uid,email,displayName:nome,password:randomBytes(32).toString('base64url'),disabled:false});}
  catch(e){if(e.code==='auth/uid-already-exists'){const u=await auth.getUser(uid);if(u.email?.toLowerCase()!==email)erro('failed-precondition','Reserva de identidade inconsistente.');}
   else if(e.code==='auth/email-already-exists')erro('already-exists','E-mail já cadastrado.');else throw e;}
  return db.runTransaction(async tx=>{
   const autor=await c.identidade(autorUid,tx);c.ativo(autor);if(!p.podeNaPlataforma(autor,'contas.gerenciar'))erro('permission-denied','Autorização revogada durante o cadastro.');
   const r=await tx.get(recibo);const uref=db.doc('usuarios/'+uid),aref=db.doc('cmappAcessos/'+uid);const u=await tx.get(uref);const a=await tx.get(aref);
   if(r.data()?.status==='confirmada')return r.data().resultado;
   if(u.exists||a.exists)erro('failed-precondition','Identidade já vinculada; revisão administrativa necessária.');
   const agora=FieldValue.serverTimestamp();const resultado={uid,email};
   tx.create(uref,{nome,email,lotacao,perfil:'usuario',modulos:[],ativo:true,autorizacaoVersao:2,autorizacaoRevisao:0,criadoPor:autorUid,criadoEm:agora});
   tx.create(aref,{uid,versao:2,ativo:true,papelPlataforma:'usuario',permissoesPlataforma:[],atribuicoes:[],delegacoes:[],revisao:0});
   tx.update(recibo,{status:'confirmada',resultado,confirmadoEm:agora});tx.create(db.doc('cmappAcessosEventos/'+key),{tipo:'conta_criada',alvoUid:uid,operadorUid:autorUid,operadorNome:autor.nome,antes:null,depois:{nome,email,lotacao,ativo:true},registradoEm:agora});return resultado;
  });
 }
 async function alterar(request,tipo){
  const autorUid=c.uidDoPedido(request);c.campos(request.data,tipo==='dados'?['uid','nome','lotacao','operacaoId']:['uid','ativo','operacaoId']);
  const uid=c.validarId(request.data.uid,'Alvo');const op=idOperacao(request);const dados=tipo==='dados'?{nome:texto(request.data.nome,'Nome'),lotacao:texto(request.data.lotacao,'Lotação')}:{ativo:request.data.ativo};
  if(tipo==='estado'&&typeof dados.ativo!=='boolean')erro('invalid-argument','Situação inválida.');
  const key=c.hash({autorUid,op,tipo});const fp=c.hash({uid,dados,tipo});const ref=db.doc('cmappContasOperacoes/'+key);const p=await c.politicaPromise;
  const reserva=await db.runTransaction(async tx=>{
   const autor=await c.identidade(autorUid,tx);c.ativo(autor);const alvo=await c.identidade(uid,tx,true);
   if(!p.podeGerenciarConta(autor,alvo,'contas.gerenciar'))erro('permission-denied','Sem permissão sobre a conta.');
   const r=await tx.get(ref);if(r.exists&&r.data().fingerprint!==fp)erro('already-exists','Operação utilizada com outros dados.');
   if(r.data()?.status==='confirmada')return{finalizada:true,resultado:r.data().resultado,sincronizado:r.data().sincronizado===true};
   if(!r.exists)tx.create(ref,{fingerprint:fp,status:'reservada',autorUid,alvoUid:uid,criadoEm:FieldValue.serverTimestamp()});return{finalizada:false};
  });
  if(reserva.finalizada)return{...reserva.resultado,sincronizado:reserva.sincronizado,repetida:true};
  // Auth é liberado primeiro; a conta no aplicativo continua bloqueada até a transação confirmar.
  if(tipo==='estado'&&dados.ativo)await auth.updateUser(uid,{disabled:false});
  const resultado=await db.runTransaction(async tx=>{
   const autor=await c.identidade(autorUid,tx);c.ativo(autor);const alvo=await c.identidade(uid,tx,true);if(!p.podeGerenciarConta(autor,alvo,'contas.gerenciar'))erro('permission-denied','Sem permissão sobre a conta.');
   const r=await tx.get(ref);if(r.exists&&r.data().fingerprint!==fp)erro('already-exists','Operação utilizada com outros dados.');if(r.data()?.status==='confirmada')return{...r.data().resultado,repetida:true};
   const agora=FieldValue.serverTimestamp();const revisao=(alvo.revisao||0)+1;const res={uid,revisao};
   tx.update(alvo.contaRef,{...dados,autorizacaoRevisao:revisao,atualizadoPor:autorUid,atualizadoEm:agora});
   tx.update(alvo.acessoRef,{...(tipo==='estado'?dados:{}),revisao,atualizadoPor:autorUid,atualizadoEm:agora});
   tx.create(db.doc('cmappAcessosEventos/'+key),{tipo:tipo==='dados'?'conta_atualizada':dados.ativo?'conta_reativada':'conta_desativada',alvoUid:uid,operadorUid:autorUid,operadorNome:autor.nome,antes:tipo==='dados'?{nome:alvo.nome,lotacao:alvo.lotacao}:{ativo:alvo.ativo},depois:dados,registradoEm:agora,revisao});tx.update(ref,{status:'confirmada',resultado:res,confirmadoEm:agora});return res;
  });
  if(resultado.repetida)return{...resultado,sincronizado:false};
  let sincronizado=true;try{if(tipo==='dados')await auth.updateUser(uid,{displayName:dados.nome});else if(!dados.ativo){await auth.updateUser(uid,{disabled:true});await auth.revokeRefreshTokens(uid);}}catch{sincronizado=false;}
  // Nunca reabrir o acesso Firestore se a sincronização de bloqueio com Authentication falhar.
  await ref.update({sincronizado}).catch(()=>null);
  return{...resultado,sincronizado};
 }
 async function recuperar(request){
  const autorUid=c.uidDoPedido(request);c.campos(request.data,['uid']);const uid=c.validarId(request.data.uid,'Alvo');const p=await c.politicaPromise;
  const autor=await c.identidade(autorUid);c.ativo(autor);const alvo=await c.identidade(uid,undefined,true);
  if(!alvo.ativo||!p.podeGerenciarConta(autor,alvo,'contas.recuperar'))erro('permission-denied','Sem permissão para recuperação dessa conta.');
  if(!alvo.email)erro('failed-precondition','Conta sem e-mail.');
  await db.collection('cmappAcessosEventos').add({tipo:'recuperacao_solicitada',alvoUid:uid,operadorUid:autorUid,operadorNome:autor.nome,registradoEm:FieldValue.serverTimestamp()});
  return{uid,email:alvo.email};
 }
 return{criar,atualizar:r=>alterar(r,'dados'),alterarEstado:r=>alterar(r,'estado'),recuperar};
}
module.exports={criarContasV2};
