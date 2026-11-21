// GEST-04: projeção de contas e divisões já autorizadas, sem gravação.
// Conta (UID Auth) != Pessoa institucional (pessoaId). Não inferir identidade por nome/e-mail.
export const CONTRATO_IDENTIDADE=Object.freeze({
  pessoa:'pessoaId',conta:'uid',divisao:'divisaoId',
  dsips:'responsavelUid (ou responsavelId quando responsavelOrigem=usuarios)',
  gabinete:'uid somente quando origem=usuarios',
  rh:'pessoaId futuro; dados funcionais pertencem ao RH'
});
const valor=v=>typeof v==='string'?v.trim():'';
const chave=v=>valor(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
const unico=xs=>[...new Set(xs)];
const vazio=()=>Object.freeze([]);
export function projetarMapaInstitucional({usuarios=[],divisoes=[]}={}){
  const contas=(Array.isArray(usuarios)?usuarios:[]).filter(u=>valor(u?.uid)).map(u=>Object.freeze({
    uid:valor(u.uid),nome:valor(u.nome)||'Nome não informado',email:valor(u.email),
    perfil:valor(u.perfil),ativo:u.ativo!==false,pessoaId:valor(u.pessoaId),
    divisoesLegadas:Object.freeze(unico((Array.isArray(u.divisoesAtribuidas)?u.divisoesAtribuidas:
      Array.isArray(u.divisaoAtribuidas)?u.divisaoAtribuidas:[]).map(valor).filter(Boolean)))
  }));
  // A lista de usuários deve conter uma conta por UID. Duplicidade é incidente, não fusão.
  const contagemUid=new Map();
  for(const c of contas)contagemUid.set(c.uid,(contagemUid.get(c.uid)||0)+1);
  const porUid=new Map(contas.filter(c=>contagemUid.get(c.uid)===1).map(c=>[c.uid,c]));
  const registros=(Array.isArray(divisoes)?divisoes:[]).filter(d=>valor(d?.id)).map(d=>Object.freeze({
    id:valor(d.id),nome:valor(d.nome)||'Divisão sem nome',ativo:d.ativo!==false,
    principalUid:valor(d.responsavelPrincipalUid),
    principalNome:valor(d.responsavelPrincipalNome),
    substitutoUid:valor(d.responsavelSubstitutoUid),
    substitutoNome:valor(d.responsavelSubstitutoNome)
  }));
  const conexoes=[];
  for(const d of registros){
    for(const tipo of ['principal','substituto']){
      const uid=tipo==='principal'?d.principalUid:d.substitutoUid;
      const nomeHistorico=tipo==='principal'?d.principalNome:d.substitutoNome;
      const conta=porUid.get(uid);
      let status='confirmado';
      if(!uid)status=nomeHistorico?'somente-nome':'nao-definido';
      else if(contagemUid.get(uid)>1)status='uid-duplicado';
      else if(!conta)status='nao-localizado';
      else if(!conta.ativo)status='conta-inativa';
      else if(nomeHistorico&&chave(nomeHistorico)!==chave(conta.nome))status='nome-desatualizado';
      if(uid&&d.principalUid&&d.principalUid===d.substitutoUid)status='mesma-conta';
      conexoes.push(Object.freeze({
        chave:d.id+':'+tipo,divisaoId:d.id,divisaoNome:d.nome,divisaoAtiva:d.ativo,
        tipo,uid,nomeHistorico,nomeAtual:conta?.nome||'',status,
        // Somente a chave explícita permite considerar a referência associada.
        porUid:Boolean(uid&&conta)
      }));
    }
  }
  const vinculosPorUid=new Map();
  for(const v of conexoes)if(v.porUid){
    const lista=vinculosPorUid.get(v.uid)||[];lista.push(v);vinculosPorUid.set(v.uid,lista);
  }
  const pessoas=contas.map(c=>Object.freeze({
    ...c,origem:'usuarios',
    tipoIdentidade:c.pessoaId?'pessoa-id-informado':'somente-conta',
    vinculos:Object.freeze([...(vinculosPorUid.get(c.uid)||[])]),
    rotuloIdentidade:c.pessoaId?'pessoaId informado, não validado':'UID da conta; pessoaId pendente'
  }));
  const conexoesRevisar=conexoes.filter(v=>v.status!=='confirmado'&&
    !(v.tipo==='substituto'&&v.status==='nao-definido'));
  const nomes=new Map(),emails=new Map();
  for(const c of contas){
    if(chave(c.nome)&&chave(c.nome)!=='nome nao informado'){
      const k=chave(c.nome);nomes.set(k,[...(nomes.get(k)||[]),c.uid]);
    }
    if(chave(c.email)){const k=chave(c.email);emails.set(k,[...(emails.get(k)||[]),c.uid]);}
  }
  const pistas=[];
  for(const [tipo,mapa] of [['nome',nomes],['email',emails]]){
    for(const [chaveComparacao,ids] of mapa){
      if(unico(ids).length>1)pistas.push(Object.freeze({
        tipo,referencia:chaveComparacao,quantidade:unico(ids).length,
        descricao:'Possível coincidência de '+(tipo==='nome'?'nome':'e-mail')+
          '. Não há vinculação ou mesclagem automática.'
      }));
    }
  }
  for(const [uid,quantidade] of contagemUid){
    if(quantidade>1)pistas.push(Object.freeze({
      tipo:'uid',referencia:uid,quantidade,
      descricao:'Mesmo UID repetido no conjunto consultado; conciliação manual necessária.'
    }));
  }
  const pendencias=Object.freeze([
    ...conexoesRevisar.map(v=>Object.freeze({
      id:v.chave,tipo:'vinculo',titulo:v.divisaoNome,
      detalhe:(v.tipo==='principal'?'Responsável principal':'Substituto')+' · '+({
        'somente-nome':'nome histórico sem UID',
        'nao-definido':'ainda não definido',
        'nao-localizado':'UID não localizado nas contas consultadas',
        'conta-inativa':'conta vinculada está inativa',
        'nome-desatualizado':'nome histórico diferente do nome atual',
        'mesma-conta':'mesmo UID definido como principal e substituto',
        'uid-duplicado':'UID repetido no conjunto consultado'
      }[v.status]||v.status),divisaoId:v.divisaoId
    })),
    ...pistas.map((p,i)=>Object.freeze({
      id:'pista:'+i,tipo:'possivel-duplicidade',titulo:'Possível duplicidade · '+p.tipo,
      detalhe:p.descricao+' Referência a conferir: '+p.referencia+'.',divisaoId:''
    }))
  ]);
  return Object.freeze({
    pessoas:Object.freeze(pessoas),divisoes:Object.freeze(registros),vinculos:Object.freeze(conexoes),
    pendencias,pistas:Object.freeze(pistas),
    estatisticas:Object.freeze({
      contas:pessoas.length,divisoes:registros.length,
      vinculosConfirmados:conexoes.filter(x=>x.status==='confirmado').length,
      referenciasParaRevisar:pendencias.length,
      contasSemPessoaId:pessoas.filter(p=>!p.pessoaId).length,
      contasComPessoaId:pessoas.filter(p=>Boolean(p.pessoaId)).length
    })
  });
}
export function filtrarMapaInstitucional(mapa,{visao='pessoas',termo='',situacao='todas'}={}){
  if(!mapa)return vazio();
  const busca=chave(termo);
  if(visao==='divisoes'){
    return Object.freeze(mapa.divisoes.filter(d=>{
      const vinculos=mapa.vinculos.filter(v=>v.divisaoId===d.id);
      if(situacao==='pendentes'&&!vinculos.some(v=>v.status!=='confirmado'&&!(v.tipo==='substituto'&&v.status==='nao-definido')))return false;
      if(situacao==='confirmados'&&vinculos.some(v=>v.status!=='confirmado'&&!(v.tipo==='substituto'&&v.status==='nao-definido')))return false;
      return !busca||chave([d.nome,...vinculos.map(v=>v.nomeAtual||v.nomeHistorico)].join(' ')).includes(busca);
    }));
  }
  if(visao==='pendencias')return Object.freeze(mapa.pendencias.filter(p=>
    !busca||chave(p.titulo+' '+p.detalhe).includes(busca)));
  return Object.freeze(mapa.pessoas.filter(p=>{
    if(situacao==='pendentes'&&p.pessoaId)return false;
    if(situacao==='confirmados'&&!p.pessoaId)return false;
    return !busca||chave([p.nome,p.email,...p.divisoesLegadas,
      ...p.vinculos.map(v=>v.divisaoNome)].join(' ')).includes(busca);
  }));
}
// DSIPS só vincula conta pelo UID declarado. Um responsável legado não é unido por nome.
export function avaliarReferenciaResponsavelDsips(cautela,usuarios=[]){
  const uid=valor(cautela?.responsavelUid)||
    (cautela?.responsavelOrigem==='usuarios'?valor(cautela.responsavelId):'');
  if(!uid)return Object.freeze({uid:'',status:'referencia-legada',vinculado:false});
  const u=(Array.isArray(usuarios)?usuarios:[]).find(u=>u?.uid===uid);
  return Object.freeze({uid,status:u?'uid-identificado':'uid-nao-localizado',vinculado:Boolean(u)});
}
// O Gabinete somente pode compartilhar identidade de conta se a origem e o UID forem explícitos.
export function avaliarReferenciaGabinete(contato,usuarios=[]){
  const uid=contato?.origem==='usuarios'?valor(contato.uid):'';
  if(!uid)return Object.freeze({uid:'',status:'sem-referencia-autorizada',vinculado:false});
  const u=(Array.isArray(usuarios)?usuarios:[]).find(u=>u?.uid===uid);
  return Object.freeze({uid,status:u?'uid-identificado':'uid-nao-localizado',vinculado:Boolean(u)});
}
