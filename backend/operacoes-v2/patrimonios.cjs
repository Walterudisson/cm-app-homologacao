'use strict';
// Política e estado do bem são lidos na mesma transação; nenhuma autoridade vem do formulário.
const localEfetivo = item => item.localizacaoAtual || item.divisaoOrigem || item.divisao || '';
const chaveDivisao = divisao => divisao.replace(/%/g,'%25').replace(/\//g,'%2F');
const ACOES = Object.freeze({conferir:'conferir',sugerir:'sugerir',resolver_transferencia:'aprovar',resolver_sugestao:'aprovar'});
function criarPatrimoniosV2({db,FieldValue,HttpsError,contexto:c}) {
  const falhar=(code,msg)=>{throw new HttpsError(code,msg);};
  function texto(valor,nome,max=180,obrigatorio=true){if(typeof valor!=='string'||valor!==valor.trim()||valor.length>max||obrigatorio&&!valor)falhar('invalid-argument',nome+' inválido.');return valor;}
  const permitir=(p,autor,acao,divisaoId)=>p.podeExecutar(autor,{moduloId:'da',funcionalidadeId:'patrimonios',acao},{divisaoId});
  function temAcao(p,autor,acao){return permitir(p,autor,acao,undefined)||(autor.atribuicoes||[]).some(a=>p.atribuicaoValida(a)&&a.moduloId==='da'&&a.funcionalidadeId==='patrimonios'&&permitir(p,autor,acao,a.escopo.ids?.[0]));}
  function exigir(p,autor,acao,contextos){if(!contextos.length||contextos.some(d=>!d||!permitir(p,autor,acao,d)))falhar('permission-denied','Ação fora da abrangência patrimonial atribuída.');}
  async function abertas(tx,divisoes){for(const d of new Set(divisoes)){if(!d)falhar('failed-precondition','Bem sem localização efetiva; revisão cadastral necessária.');const s=await tx.get(db.doc('inventarios/'+chaveDivisao(d)));if(s.exists&&s.data().estado!=='aberto')falhar('failed-precondition','A divisão está bloqueada pelo ciclo de inventário.');}}
  async function destinoAtivo(tx,nome){const s=await tx.get(db.collection('divisoes').where('nome','==',nome).limit(2));if(s.size!==1||s.docs[0].data().ativo===false)falhar('failed-precondition','Destino inexistente, inativo ou duplicado no catálogo de divisões.');}
  async function listar(request){
    const uid=c.uidDoPedido(request);c.campos(request.data,['divisao','limite','cursor','somentePendentes','situacao','busca','exportar']);
    const divisao=request.data.divisao===undefined?undefined:texto(request.data.divisao,'Divisão');const limite=request.data.limite??30;
    if(!Number.isInteger(limite)||limite<1||limite>50)falhar('invalid-argument','Limite entre 1 e 50.');
    const cursor=request.data.cursor;if(cursor!==undefined)c.validarId(cursor,'Cursor');if(request.data.somentePendentes!==undefined&&typeof request.data.somentePendentes!=='boolean')falhar('invalid-argument','Filtro inválido.');
    const situacao=request.data.situacao??'todos',busca=request.data.busca??'';if(!['todos','localizados','nao_localizados','aguardando'].includes(situacao)||typeof busca!=='string'||busca.length>120||request.data.exportar!==undefined&&typeof request.data.exportar!=='boolean')falhar('invalid-argument','Filtros inválidos.');const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const termo=normalizar(busca.trim());const acao=request.data.exportar===true?'exportar':'consultar';
    return db.runTransaction(async tx=>{
      const autor=await c.identidade(uid,tx);c.ativo(autor);const p=await c.politicaPromise;
      if(!permitir(p,autor,acao,divisao))falhar('permission-denied','Selecione uma divisão dentro da abrangência de consulta.');
      const preparo=await tx.get(db.doc('cmappConfiguracao/acessos'));
      if(preparo.data()?.patrimoniosIndiceVersao!==2||preparo.data()?.patrimoniosOperacaoVersao!==2)falhar('failed-precondition','Listagem v2 depende da preparação integral da base e da transição dos operadores.');
      let q=db.collection('patrimonios');if(divisao)q=q.where('localizacaoEfetivaV2','==',divisao);q=q.orderBy('__name__').limit(limite+1);if(cursor)q=q.startAfter(cursor);
      const s=await tx.get(q),docs=s.docs.slice(0,limite);
      for(const doc of docs){const d=doc.data();if(!localEfetivo(d)||d.localizacaoEfetivaV2!==localEfetivo(d))falhar('failed-precondition','Índice de localização v2 inconsistente; conclua a preparação da base.');exigir(p,autor,acao,[localEfetivo(d)]);}
      const registros=docs.filter(doc=>{const d=doc.data(),transferencia=d.statusTransferencia==='pendente';return(!request.data.somentePendentes||transferencia||d.sugestaoDestinoStatus==='pendente')&&(situacao==='todos'||situacao==='aguardando'&&transferencia||situacao==='localizados'&&d.localizado===true&&!transferencia||situacao==='nao_localizados'&&d.localizado!==true&&!transferencia)&&(!termo||normalizar([doc.id,d.descricao,d.marca,d.modelo,d.localizacaoAtual,d.divisaoOrigem,d.divisao].join(' ')).includes(termo));}).map(d=>({...d.data(),id:d.id,revisaoOperacionalV2:d.data().revisaoOperacionalV2??0}));
      return{registros,proximoCursor:s.size>limite?docs.at(-1).id:null,ordenacao:'id',filtroAplicado:request.data.somentePendentes===true?'pendencias':'todos'};
    });
  }
  async function catalogo(request){
    const uid=c.uidDoPedido(request);c.campos(request.data,[]);
    return db.runTransaction(async tx=>{const autor=await c.identidade(uid,tx);c.ativo(autor);const p=await c.politicaPromise;if(!temAcao(p,autor,'consultar'))falhar('permission-denied','Sem consulta patrimonial.');const snap=await tx.get(db.collection('divisoes').limit(1001));if(snap.size>1000)falhar('resource-exhausted','Catálogo excedeu o limite.');const nomes=new Set();const divisoes=snap.docs.map(doc=>{const d=doc.data(),nome=d.nome;if(typeof nome!=='string'||!nome.trim()||nomes.has(nome))falhar('failed-precondition','Catálogo possui nomes inválidos ou duplicados.');nomes.add(nome);return{id:doc.id,nome,ativo:d.ativo!==false,...Object.fromEntries(['consultar','conferir','sugerir','aprovar','inventarios','exportar'].map(a=>[a,permitir(p,autor,a,nome)]))};});return{divisoes:divisoes.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')),consultaGlobal:permitir(p,autor,'consultar'),inventarioGlobal:permitir(p,autor,'inventarios')};});
  }
  async function executar(request,tipo){
    const uid=c.uidDoPedido(request);const resolucao=tipo.startsWith('resolver_');
    c.campos(request.data,['id','operacaoId','revisaoEsperada',...(resolucao?['decisao']:['destino','observacao',...(tipo==='conferir'?['metodoLocalizacao']:[])])]);
    const id=c.validarId(request.data.id,'Patrimônio'),operacaoId=c.validarId(request.data.operacaoId,'Operação'),revisaoEsperada=request.data.revisaoEsperada;
    if(!Number.isSafeInteger(revisaoEsperada)||revisaoEsperada<0)falhar('invalid-argument','Revisão esperada inválida. Atualize o bem.');
    const destino=resolucao?undefined:texto(request.data.destino,'Destino');const observacao=resolucao?'':texto(request.data.observacao??'','Observação',500,false);
    const decisao=request.data.decisao;if(resolucao&&!['aprovar','rejeitar'].includes(decisao))falhar('invalid-argument','Decisão inválida.');
    const metodo=request.data.metodoLocalizacao;if(tipo==='conferir'&&!['codigo_barras','ocr','digitacao'].includes(metodo))falhar('invalid-argument','Método de leitura inválido.');
    const dados={id,revisaoEsperada,...(resolucao?{decisao}:{destino,observacao,...(tipo==='conferir'?{metodoLocalizacao:metodo}:{})})};
    const chave=c.hash({uid,operacaoId});const reciboRef=db.doc('patrimoniosOperacoes/'+chave),eventoRef=db.doc('patrimoniosEventos/'+chave),ref=db.doc('patrimonios/'+id);const fingerprint=c.hash({tipo,dados});
    const dataHora=new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
    return db.runTransaction(async tx=>{
      const autor=await c.identidade(uid,tx);c.ativo(autor);const p=await c.politicaPromise,acao=ACOES[tipo];
      if(!temAcao(p,autor,acao))falhar('permission-denied','Sem atribuição operacional para esta ação.');
      const preparo=await tx.get(db.doc('cmappConfiguracao/acessos'));if(preparo.data()?.patrimoniosIndiceVersao!==2||preparo.data()?.patrimoniosOperacaoVersao!==2)falhar('failed-precondition','A operação exige a preparação integral e o corte dos escritores legados.');
      const recibo=await tx.get(reciboRef);
      if(recibo.exists){const r=recibo.data();if(r.fingerprint!==fingerprint)falhar('already-exists','Operação já utilizada com outro conteúdo.');exigir(p,autor,acao,r.contextos);return r.resultado;}
      const snap=await tx.get(ref);if(!snap.exists)falhar('not-found','Patrimônio não encontrado.');const item=snap.data(),origem=localEfetivo(item);
      exigir(p,autor,acao,[origem]);
      const revisao=item.revisaoOperacionalV2??0;if(!Number.isSafeInteger(revisao)||revisao<0)falhar('failed-precondition','Revisão operacional inconsistente.');if(revisao!==revisaoEsperada)falhar('aborted','O patrimônio foi alterado. Atualize a tela antes de confirmar.');
      if(item.historico!==undefined&&!Array.isArray(item.historico))falhar('failed-precondition','Histórico inconsistente; revisão administrativa necessária.');
      const transferencia=item.statusTransferencia==='pendente',sugestao=item.sugestaoDestinoStatus==='pendente';
      if(transferencia&&sugestao)falhar('failed-precondition','Há solicitações simultâneas inconsistentes; revisão necessária.');
      if(!resolucao&&(transferencia||sugestao))falhar('failed-precondition','Resolva a solicitação pendente antes de registrar outra operação.');
      let alteracao,contextos=[origem],nomeAcao,eventoHistorico;
      const responsavel=autor.nome+' ('+autor.email+')';
      if(tipo==='conferir'){
        exigir(p,autor,'conferir',[destino]);contextos=[...new Set([origem,destino])];await abertas(tx,contextos);await destinoAtivo(tx,destino);
        const mudou=destino!==origem;nomeAcao=mudou?'transferencia_solicitada':'conferencia';
        alteracao={localizado:true,divisaoOrigem:item.divisaoOrigem||item.divisao||origem,observacaoAtual:observacao,dataLocalizacao:dataHora,conferidoPor:autor.email,statusTransferencia:mudou?'pendente':'concluido',divisaoDestinoSugerida:mudou?destino:'',...(mudou?{}:{localizacaoAtual:destino})};
        eventoHistorico={local:destino,data:dataHora,responsavel,metodoLocalizacao:metodo,obs:observacao,acao:nomeAcao};
      }else if(tipo==='sugerir'){
        if(item.localizado===true||destino===origem)falhar('failed-precondition','Sugestão exige bem não localizado e destino diferente.');await abertas(tx,[origem,destino]);await destinoAtivo(tx,destino);
        nomeAcao='destino_sugerido';alteracao={sugestaoDestinoStatus:'pendente',sugestaoDestinoDivisao:destino,sugestaoDestinoPor:{uid,nome:autor.nome,email:autor.email},sugestaoDestinoEm:dataHora,sugestaoDestinoObservacao:observacao,observacaoAtual:'Destino sugerido por: '+autor.nome+(observacao?' — '+observacao:'')};
        eventoHistorico={local:origem,destinoSugerido:destino,data:dataHora,responsavel,obs:observacao||'Destino sugerido por: '+autor.nome,acao:nomeAcao};
      }else{
        if(tipo==='resolver_transferencia'?!transferencia:!sugestao)falhar('failed-precondition','A solicitação não está mais pendente.');
        const destinoPendente=tipo==='resolver_transferencia'?item.divisaoDestinoSugerida:item.sugestaoDestinoDivisao;
        if(typeof destinoPendente!=='string'||!destinoPendente)falhar('failed-precondition','Solicitação sem destino válido.');
        exigir(p,autor,'aprovar',[destinoPendente]);contextos=[...new Set([origem,destinoPendente])];await abertas(tx,contextos);if(decisao==='aprovar')await destinoAtivo(tx,destinoPendente);
        const aprovou=decisao==='aprovar',local=aprovou?destinoPendente:origem;
        if(tipo==='resolver_transferencia'){nomeAcao=aprovou?'transferencia_aprovada':'transferencia_rejeitada';alteracao={localizacaoAtual:local,divisaoDestinoSugerida:'',statusTransferencia:aprovou?'aprovado':'rejeitado'};}
        else{nomeAcao=aprovou?'sugestao_destino_aprovada':'sugestao_destino_rejeitada';alteracao={localizado:false,...(aprovou?{localizacaoAtual:local}:{}),sugestaoDestinoStatus:aprovou?'aprovada':'rejeitada',observacaoAtual:aprovou?'Destino sugerido aprovado por '+autor.nome+'; aguardando conferência física.':'Sugestão de destino rejeitada por '+autor.nome+'.'};}
        eventoHistorico={local,destinoSugerido:destinoPendente,data:dataHora,responsavel,obs:tipo==='resolver_sugestao'&&aprovou?'Sugestão aprovada. O item permanece pendente de conferência física em '+local+'.':aprovou?'Transferência aprovada.':'Solicitação rejeitada; localização anterior mantida.',acao:nomeAcao};
      }
      const agora=FieldValue.serverTimestamp(),novaRevisao=revisao+1;alteracao={...alteracao,historico:[...(item.historico||[]),eventoHistorico],localizacaoEfetivaV2:localEfetivo({...item,...alteracao}),revisaoOperacionalV2:novaRevisao};
      const resultado={id,revisaoOperacionalV2:novaRevisao,acao:nomeAcao};
      tx.update(ref,alteracao);tx.create(eventoRef,{tipo:nomeAcao,patrimonioId:id,operadorUid:uid,operadorNome:autor.nome,autorizacaoVersao:2,autorizacaoRevisao:autor.revisao??0,contextos,antes:{localizacao:origem,revisao},depois:{localizacao:alteracao.localizacaoEfetivaV2,revisao:novaRevisao},registradoEm:agora});
      tx.create(reciboRef,{fingerprint,resultado,contextos,criadoEm:agora});return resultado;
    });
  }
  return{catalogo,contexto:{permitir,temAcao,exigir,localEfetivo,chaveDivisao},listar,conferir:r=>executar(r,'conferir'),sugerir:r=>executar(r,'sugerir'),resolverTransferencia:r=>executar(r,'resolver_transferencia'),resolverSugestao:r=>executar(r,'resolver_sugestao')};
}
module.exports={criarPatrimoniosV2,localEfetivo,chaveDivisao};
