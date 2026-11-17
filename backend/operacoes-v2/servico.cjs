'use strict';
const {criarOperacoes}=require('./dsips-base.cjs');
const {criarCautelas}=require('./cautelas-base.cjs');
const CADASTROS=Object.freeze({categoria:'dsipsCategorias',local:'dsipsLocais',material:'dsipsMateriais'});
const CONSULTAS=Object.freeze({categorias:'dsipsCategorias',locais:'dsipsLocais',materiais:'dsipsMateriais',estoque:'dsipsEstoque',unidades:'dsipsUnidades',cautelas:'dsipsCautelas',devolucoes:'dsipsDevolucoes'});
function criarOperacoesV2({db,FieldValue,HttpsError,contexto:c}){
 const erro=(code,message)=>{throw new HttpsError(code,message);};
 const exigir=async(autor,moduloId,funcionalidadeId,acao,recurso={})=>{if(!(await c.politicaPromise).podeExecutar(autor,{moduloId,funcionalidadeId,acao},recurso))erro('permission-denied','Ação fora das permissões atuais.');};
 const dsips=(autor,acao)=>exigir(autor,'dsips','materiais_cautelas',acao);
 async function autorizar({tx,uid,acao,payload}){
  const autor=await c.identidade(uid,tx);c.ativo(autor);
  if(acao==='cadastro_salvo'){
   await dsips(autor,'consultar');
   const ref=db.doc(CADASTROS[payload.tipo]+'/'+payload.id);const atual=await tx.get(ref);
   await dsips(autor,atual.exists?'alterar':'cadastrar');
   if(atual.exists&&atual.data().ativo!==false&&payload.ativo===false)await dsips(autor,'inativar');
  }else{
   const operacao={saldo_inicial_registrado:'saldo_inicial',cautela_registrada:'cautelar',devolucao_registrada:'devolver'}[acao];
   if(!operacao)erro('failed-precondition','Operação sem política definida.');await dsips(autor,operacao);
  }
  return autor;
 }
 const deps={db,FieldValue,HttpsError,autorizar};const cad=criarOperacoes(deps),cautelas=criarCautelas(deps);
 const pagina=request=>{const limite=request.data?.limite??30;if(!Number.isInteger(limite)||limite<1||limite>50)erro('invalid-argument','Limite entre 1 e 50.');const cursor=request.data?.cursor;if(cursor!==undefined)c.validarId(cursor,'Cursor');return{limite,cursor};};
 // As leituras e a autoridade compartilham a transação: mudanças concorrentes invalidam a tentativa.
 async function consulta(request,tipo){
  const uid=c.uidDoPedido(request);c.campos(request.data,tipo==='eventos'?['limite','cursor']:tipo==='responsaveis'?['limite','cursor']:['tipo','limite','cursor','materialId']);
  const{limite,cursor}=pagina(request);const materialId=request.data?.materialId;if(materialId!==undefined)c.validarId(materialId,'Material');
  if(tipo==='cadastro'&&!Object.hasOwn(CONSULTAS,request.data.tipo))erro('invalid-argument','Consulta inválida.');
  return db.runTransaction(async tx=>{
   const autor=await c.identidade(uid,tx);c.ativo(autor);await dsips(autor,tipo==='eventos'||tipo==='cadastro'&&request.data.tipo==='devolucoes'?'historico':tipo==='responsaveis'?'cautelar':'consultar');
   let q=db.collection(tipo==='responsaveis'?'usuarios':tipo==='eventos'?'dsipsEventos':CONSULTAS[request.data.tipo]);
   if(tipo==='eventos'){
    const p=await c.politicaPromise;const audita=p.podeExecutar(autor,{moduloId:'dsips',funcionalidadeId:'materiais_cautelas',acao:'alterar'});
    if(!audita)q=q.where('tipo','in',['cautela_registrada','devolucao_registrada']);
   }
   if(materialId!==undefined){if(tipo!=='cadastro'||request.data.tipo!=='unidades')erro('invalid-argument','Filtro não suportado.');q=q.where('materialId','==',materialId);}
   if(tipo==='eventos'){
    q=q.orderBy('registradoEm','desc').orderBy('__name__','desc').limit(limite+1);
    if(cursor){const anterior=await tx.get(db.doc('dsipsEventos/'+cursor));const p=await c.politicaPromise;const audita=p.podeExecutar(autor,{moduloId:'dsips',funcionalidadeId:'materiais_cautelas',acao:'alterar'});if(!anterior.exists||!anterior.data().registradoEm||!audita&&!['cautela_registrada','devolucao_registrada'].includes(anterior.data().tipo))erro('invalid-argument','Cursor indisponível. Atualize o histórico.');q=q.startAfter(anterior);}
   }else{q=q.orderBy('__name__').limit(limite+1);if(cursor)q=q.startAfter(cursor);}const snap=await tx.get(q),docs=snap.docs.slice(0,limite);
   const registros=docs.filter(d=>tipo!=='responsaveis'||d.data().ativo!==false).map(d=>tipo==='responsaveis'?{id:d.id,nome:d.data().nome||'Usuário',matricula:d.data().matricula||'',ativo:true}:{...d.data(),id:d.id});
   return{registros,proximoCursor:snap.size>limite?docs.at(-1).id:null,ordenacao:tipo==='eventos'?'registradoEm_desc':'id'};
  });
 }
 const divisaoDoBem=b=>b.localizacaoAtual||b.divisaoOrigem||b.divisao||'';
 async function consultarPatrimonio(request){
  const uid=c.uidDoPedido(request);c.campos(request.data,['id']);const id=c.validarId(request.data.id,'Patrimônio');
  return db.runTransaction(async tx=>{
   const autor=await c.identidade(uid,tx);c.ativo(autor);
   // Não revelar existência a quem sequer possui consulta operacional.
   const p=await c.politicaPromise;
   const tem=autor.papelPlataforma==='superadmin'||(autor.atribuicoes||[]).some(a=>p.atribuicaoValida(a)&&a.moduloId==='da'&&a.funcionalidadeId==='patrimonios'&&p.podeExecutar(autor,{moduloId:'da',funcionalidadeId:'patrimonios',acao:'consultar'},{divisaoId:a.escopo.ids?.[0]}));
   if(!tem)erro('permission-denied','Sem consulta patrimonial.');
   const snap=await tx.get(db.doc('patrimonios/'+id));if(!snap.exists)erro('not-found','Patrimônio não encontrado.');
   const b=snap.data();await exigir(autor,'da','patrimonios','consultar',{divisaoId:divisaoDoBem(b)});
   return{...b,id:snap.id};
  });
 }
 return{salvarCadastro:cad.salvarCadastro,registrarSaldoInicial:cad.registrarSaldoInicial,registrarCautela:cautelas.registrarCautela,registrarDevolucao:cautelas.registrarDevolucao,listarDsips:r=>consulta(r,'cadastro'),listarResponsaveis:r=>consulta(r,'responsaveis'),listarEventos:r=>consulta(r,'eventos'),consultarPatrimonio};
}
module.exports={criarOperacoesV2};
