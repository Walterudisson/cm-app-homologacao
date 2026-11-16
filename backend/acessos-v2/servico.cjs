'use strict';
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const json = value => JSON.stringify(value && typeof value === 'object' ? Array.isArray(value) ? value.map(v => JSON.parse(json(v))) : Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(json(value[k]))])) : value);
const hash = value => createHash('sha256').update(json(value)).digest('hex');
const POLITICA_ORIGEM = pathToFileURL(path.resolve(__dirname, '../../js/platform/access/politica.js')).href;
function criarServicoAcessos({ db, FieldValue, HttpsError, politicaUrl = POLITICA_ORIGEM }) {
  const politicaPromise = import(politicaUrl);
  const falhar = (code,message) => { throw new HttpsError(code,message); };
  const validarId = (value,nome='Identificador') => {
    if (typeof value !== 'string' || !value || value.length > 128 || value.includes('/') || value.trim() !== value) falhar('invalid-argument',nome+' inválido.'); return value;
  };
  const uidDoPedido = request => { if (!request.auth?.uid) falhar('unauthenticated','Faça login novamente.');return validarId(request.auth.uid,'Usuário'); };
  function campos(obj,permitidos) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || Object.keys(obj).some(k=>!permitidos.includes(k))) falhar('invalid-argument','Campos não permitidos.');
  }
  function normalizarEscopo(input) {
    campos(input,['tipo','ids']);
    if(input.tipo==='divisoes'&&(!Array.isArray(input.ids)||input.ids.some(id=>typeof id!=='string')))falhar('invalid-argument','Divisões inválidas.');
    return input.tipo === 'divisoes' && Array.isArray(input.ids) ? {tipo:input.tipo,ids:[...input.ids].sort()} : {...input};
  }
  async function normalizarAtribuicao(input) {
    campos(input,['moduloId','funcionalidadeId','papelId','escopo']);
    const a={moduloId:input.moduloId,funcionalidadeId:input.funcionalidadeId,papelId:input.papelId,escopo:normalizarEscopo(input.escopo)};
    if (!(await politicaPromise).atribuicaoValida(a)) falhar('invalid-argument','Atribuição inválida.');return a;
  }
  async function normalizarDelegacao(input) {
    campos(input,['nivel','moduloId','funcionalidadeId','limites']);
    if(!Array.isArray(input.limites)||!input.limites.length||input.limites.length>20)falhar('invalid-argument','Limites inválidos.');
    const d={nivel:input.nivel,moduloId:input.moduloId,...(input.nivel==='funcionalidade'?{funcionalidadeId:input.funcionalidadeId}:{}),limites:input.limites.map(l=>{
      campos(l,['funcionalidadeId','papeis','escopo']);if(!Array.isArray(l.papeis)||l.papeis.some(p=>typeof p!=='string'))falhar('invalid-argument','Papéis inválidos.');return{funcionalidadeId:l.funcionalidadeId,papeis:[...l.papeis].sort(),escopo:normalizarEscopo(l.escopo)};
    }).sort((a,b)=>String(a.funcionalidadeId).localeCompare(String(b.funcionalidadeId)))};
    if(new Set(d.limites.map(l=>l.funcionalidadeId)).size!==d.limites.length)falhar('invalid-argument','Funcionalidade repetida.');
    const validar=(await politicaPromise).podeDesignarDelegacao;
    if(!validar({uid:'validador',versao:2,ativo:true,papelPlataforma:'superadmin'},{uid:'alvo',versao:2,ativo:true,papelPlataforma:'usuario'},d))falhar('invalid-argument','Delegação inválida.');return d;
  }
  // Cada chamada carrega os documentos atuais. Não recebe perfil, concessões ou divisão do cliente.
  async function identidade(uid, tx, permitirInativo=false) {
    const ler=ref=>tx?tx.get(ref):ref.get();
    const conta=await ler(db.doc('usuarios/'+uid));const acesso=await ler(db.doc('cmappAcessos/'+uid));
    const u=conta.data(),a=acesso.data();
    if(!conta.exists||u.ativo===false&&!permitirInativo)falhar('permission-denied','Conta indisponível.');
    if(u.autorizacaoVersao!==2||!acesso.exists||a.versao!==2||a.uid!==uid)falhar('failed-precondition','Conta ainda não habilitada para a gestão v2.');
    if(!Number.isSafeInteger(a.revisao??0)||(a.revisao??0)<0||!Array.isArray(a.atribuicoes??[])||!Array.isArray(a.delegacoes??[])||!Array.isArray(a.permissoesPlataforma??[]))falhar('failed-precondition','Documento de autorização inconsistente.');
    if(!['usuario','administrador','superadmin'].includes(a.papelPlataforma)||typeof a.ativo!=='boolean')falhar('permission-denied','Autorização inválida.');
    return {...a,uid,ativo:a.ativo===true&&u.ativo!==false,nome:u.nome||'',email:u.email||'',lotacao:u.lotacao||'',contaRef:conta.ref,acessoRef:acesso.ref};
  }
  function dto(a){return{uid:a.uid,versao:a.versao,ativo:a.ativo,papelPlataforma:a.papelPlataforma,permissoesPlataforma:a.permissoesPlataforma||[],atribuicoes:a.atribuicoes||[],delegacoes:a.delegacoes||[],revisao:a.revisao||0};}
  const ativo=a=>{if(!a.ativo)falhar('permission-denied','Acesso v2 desativado.');};
  async function consultarMeusAcessos(request){const a=await identidade(uidDoPedido(request));ativo(a);return dto(a);}
  const gerenciaPermitida=(a,p)=>p.podeNaPlataforma(a,'contas.consultar')||p.podeNaPlataforma(a,'acessos.conceder')||p.podeNaPlataforma(a,'gestores.designar')||(a.delegacoes||[]).some(p.delegacaoValida);
  async function consultarAcessos(request){
    const uid=uidDoPedido(request);const alvoUid=validarId(request.data?.uid,'Alvo');const autor=await identidade(uid);ativo(autor);const p=await politicaPromise;
    if(autor.uid!==alvoUid&&!gerenciaPermitida(autor,p))falhar('permission-denied','Sem acesso à consulta.');
    const alvo=await identidade(alvoUid,undefined,true);
    if(autor.uid===alvo.uid||p.podeGerenciarConta(autor,alvo,'contas.consultar')||p.podeNaPlataforma(autor,'acessos.conceder')||p.podeNaPlataforma(autor,'gestores.designar'))return dto(alvo);
    return{uid:alvo.uid,ativo:alvo.ativo,revisao:alvo.revisao||0,atribuicoes:(alvo.atribuicoes||[]).filter(a=>p.podeConceder(autor,{...alvo,ativo:true},a))};
  }
  async function listarUsuarios(request){
    const autor=await identidade(uidDoPedido(request));ativo(autor);const p=await politicaPromise;
    const admin=p.podeNaPlataforma(autor,'contas.consultar');
    if(!admin && !p.podeNaPlataforma(autor,'acessos.conceder')&&!p.podeNaPlataforma(autor,'gestores.designar')&&!(autor.delegacoes||[]).some(p.delegacaoValida))falhar('permission-denied','Sem acesso ao diretório.');
    // Página limitada e cursor por ID; não depende de índice composto. Gestores veem somente ativos.
    const limite=request.data?.limite??30;if(!Number.isInteger(limite)||limite<1||limite>50)falhar('invalid-argument','Limite inválido.');
    const cursor=request.data?.cursor;if(cursor!==undefined)validarId(cursor,'Cursor');
    let q=db.collection('usuarios').orderBy('__name__').limit(limite+1);if(cursor)q=q.startAfter(cursor);
    const snap=await q.get();const docs=snap.docs.slice(0,limite);
    return{usuarios:docs.filter(d=>admin||d.data().ativo!==false).map(d=>{const u=d.data();return{uid:d.id,nome:u.nome||'',ativo:u.ativo!==false,lotacao:u.lotacao||'',acessosProntos:u.autorizacaoVersao===2,...(admin?{email:u.email||''}:{})};}),proximoCursor:snap.size>limite?docs.at(-1).id:null};
  }
  async function mutacao(request,tipo){
    const autorUid=uidDoPedido(request);campos(request.data,['uid','operacaoId',tipo==='conceder'?'atribuicao':tipo==='designar'?'delegacao':'id']);
    const alvoUid=validarId(request.data.uid,'Alvo');const operacaoId=validarId(request.data.operacaoId,'Operação');
    if(autorUid===alvoUid)falhar('permission-denied','Não altere seus próprios acessos administrativos.');
    const concessao=tipo==='conceder';const designar=tipo==='designar';const revogar=tipo==='revogar';
    const dado=concessao?await normalizarAtribuicao(request.data.atribuicao):designar?await normalizarDelegacao(request.data.delegacao):validarId(request.data.id,'Atribuição');
    const fingerprint=hash({tipo,alvoUid,dado});const chave=hash({autorUid,operacaoId});const reciboRef=db.doc('cmappAcessosOperacoes/'+chave);const eventoRef=db.doc('cmappAcessosEventos/'+chave);
    const p=await politicaPromise;
    return db.runTransaction(async tx=>{
      const autor=await identidade(autorUid,tx);ativo(autor);
      const preautorizado=concessao||revogar?(p.podeNaPlataforma(autor,'acessos.conceder')||p.podeNaPlataforma(autor,'gestores.designar')||(autor.delegacoes||[]).some(p.delegacaoValida)):p.podeNaPlataforma(autor,'gestores.designar');
      if(!preautorizado)falhar('permission-denied','Sem atribuição para gerir acessos.');
      const alvo=await identidade(alvoUid,tx,true);
      const recibo=await tx.get(reciboRef);
      if(recibo.exists&&recibo.data().fingerprint!==fingerprint)falhar('already-exists','Operação já utilizada com outro conteúdo.');
      const campo=concessao||revogar?'atribuicoes':'delegacoes';const lista=alvo[campo]||[];if(!Array.isArray(lista))falhar('failed-precondition','Documento de acesso inconsistente.');
      const atual=concessao||designar?dado:lista.find(a=>a.id===dado)||recibo.data()?.objeto;
      if(!atual)falhar('not-found','Atribuição não encontrada.');
      const permitido=concessao?p.podeConceder(autor,alvo,atual):revogar?p.podeRevogar(autor,alvo,atual):p.podeDesignarDelegacao(autor,{...alvo,ativo:tipo==='remover_delegacao'?true:alvo.ativo},atual);
      if(!permitido)falhar('permission-denied','Ação fora das atribuições ou limites delegados.');
      if(recibo.exists)return recibo.data().resultado;
      const id=concessao||designar?hash(atual).slice(0,40):dado;
      const existente=lista.find(a=>{const {id:anteriorId,...conteudo}=a;return anteriorId===id||hash(conteudo)===hash(atual);});
      if((concessao||designar)&&existente)falhar('already-exists','Atribuição já existente.');
      if((concessao||designar)&&lista.length>=100)falhar('resource-exhausted','Limite de atribuições atingido.');
      const depois=concessao||designar?[...lista,{...atual,id}]:lista.filter(a=>a.id!==id);
      const revisao=(alvo.revisao||0)+1;const resultado={uid:alvoUid,id,revisao};const agora=FieldValue.serverTimestamp();
      tx.update(alvo.acessoRef,{[campo]:depois,revisao,atualizadoEm:agora,atualizadoPor:autorUid});
      tx.update(alvo.contaRef,{autorizacaoRevisao:revisao});
      tx.create(eventoRef,{tipo,alvoUid,operadorUid:autorUid,operadorNome:autor.nome,objeto:atual,antes:concessao||designar?null:atual,depois:concessao||designar?{...atual,id}:null,registradoEm:agora,revisao});
      tx.create(reciboRef,{fingerprint,resultado,objeto:atual,criadoEm:agora});return resultado;
    });
  }
  async function consultarAuditoria(request){
    const autor=await identidade(uidDoPedido(request));ativo(autor);const p=await politicaPromise;const alvoUid=request.data?.uid;if(alvoUid!==undefined)validarId(alvoUid,'Alvo');
    const global=p.podeNaPlataforma(autor,'auditoria.consultar');
    if(!global&&!(autor.delegacoes||[]).some(p.delegacaoValida)&&!p.podeNaPlataforma(autor,'acessos.conceder')&&!p.podeNaPlataforma(autor,'gestores.designar'))falhar('permission-denied','Sem acesso à auditoria.');
    const snap=await db.collection('cmappAcessosEventos').orderBy('registradoEm','desc').limit(100).get();
    const eventos=snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>{
      if(alvoUid&&e.alvoUid!==alvoUid)return false;if(global)return true;
      const alvo={uid:e.alvoUid,versao:2,ativo:true,papelPlataforma:'usuario'};
      return ['conceder','revogar'].includes(e.tipo)?p.podeConceder(autor,alvo,e.objeto):p.podeDesignarDelegacao(autor,alvo,e.objeto);
    });return{eventos,janelaConsultada:100};
  }
  return{consultarMeusAcessos,consultarAcessos,listarUsuarios,consultarAuditoria,conceder:request=>mutacao(request,'conceder'),revogar:request=>mutacao(request,'revogar'),designarDelegacao:request=>mutacao(request,'designar'),removerDelegacao:request=>mutacao(request,'remover_delegacao')};
}
module.exports={criarServicoAcessos};
