import {prepararMigracao,PROJETOS} from './migracao-acessos-v2.mjs';
export async function prepararHml({db,auth,revisao,encode=x=>x}){
 if(revisao?.ambiente!=='hml'||revisao.projectId!==PROJETOS.hml||revisao.contas?.length!==1||revisao.contas[0].uid!==revisao.superadminUid)throw Error('Preparação inicial exige uma única conta explícita do ambiente HML.');
 const uid=revisao.superadminUid;if(typeof uid!=='string'||!uid||uid.length>128||uid.includes('/'))throw Error('UID inválido.');
 const identidade=await auth.getUser(uid);
 if(identidade.uid!==uid||identidade.disabled||!identidade.email)throw Error('Identidade Auth ausente, bloqueada ou sem e-mail.');
 const colecoes=['usuarios','cmappAcessos','divisoes','patrimonios','inventarios'];
 // Leitura consistente para análise ainda com o sistema disponível. Aplicação posterior exige manutenção e comparação de toda a base.
 const documentos=await db.runTransaction(async tx=>{
  const docs={};for(const colecao of colecoes){const s=await tx.get(db.collection(colecao).limit(5001));if(s.size>5000)throw Error('Coleção excede limite de análise: '+colecao);for(const d of s.docs)docs[d.ref.path]=encode(d.data());}return docs;
 },{readOnly:true});
 const conta=documentos['usuarios/'+uid];
 if(!conta||conta.ativo!==true||typeof conta.email!=='string'||conta.email.trim().toLowerCase()!==identidade.email.trim().toLowerCase())throw Error('Revise a conta ativa e a correspondência do e-mail entre CMAPP e Authentication.');
 const snapshot={formato:1,ambiente:'hml',projectId:PROJETOS.hml,colecoesCompletas:colecoes,documentos};
 const plano=prepararMigracao(snapshot,revisao);
 const resumo={ambiente:'hml',projectId:PROJETOS.hml,superadminUid:uid,contaAuthValidada:true,modo:'somente_leitura',planoId:plano.id,documentosPropostos:plano.mudancas.length,contagens:Object.fromEntries(colecoes.map(c=>[c,Object.keys(documentos).filter(p=>p.startsWith(c+'/')).length])),escopo:'Somente o Superadmin inicial. Demais contas e operação patrimonial não são migradas por este plano.'};
 return{snapshot,plano,resumo};
}
