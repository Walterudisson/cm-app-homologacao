import {createHash} from 'node:crypto';
import {atribuicaoValida,delegacaoValida} from '../../js/platform/access/politica.js';
import {PLATAFORMA} from '../../js/platform/access/catalogo.js';
const copiar=x=>JSON.parse(JSON.stringify(x));
export const estavel=x=>JSON.stringify(x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(v=>JSON.parse(estavel(v))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(estavel(x[k]))])));
export const digest=x=>createHash('sha256').update(estavel(x)).digest('hex');
export const PROJETOS={hml:'cm-app-homologacao',prd:'patrimonioscm'};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128&&x.trim()===x&&!x.includes('/');
const exigir=(v,msg)=>{if(!v)throw Error(msg);};
export function prepararMigracao(snapshot,revisao){
 exigir(snapshot?.formato===1&&PROJETOS[snapshot.ambiente]===snapshot.projectId,'Ambiente/projeto incompatível.');
 exigir(revisao?.ambiente===snapshot.ambiente&&revisao.projectId===snapshot.projectId,'Revisão de outro ambiente.');
 exigir(id(revisao.superadminUid)&&typeof revisao.revisadoPor==='string'&&revisao.revisadoPor.trim().length>=3,'Identifique o Superadmin inicial e o responsável pela revisão.');
 exigir(Array.isArray(revisao.contas)&&revisao.contas.length>0,'Selecione contas explicitamente revisadas.');
 const docs=snapshot.documentos;exigir(docs&&typeof docs==='object'&&!Array.isArray(docs),'Snapshot inválido.');
 const mudancas=[],vistos=new Set();
 const adicionar=(path,depois)=>mudancas.push({path,antes:copiar(docs[path]??null),depois:copiar(depois)});
 for(const item of revisao.contas){
  exigir(id(item.uid)&&!vistos.has(item.uid)&&item.revisado===true,'Conta duplicada, inválida ou sem revisão explícita.');vistos.add(item.uid);
  const u=docs['usuarios/'+item.uid];exigir(u&&!Object.hasOwn(u,'autorizacaoVersao')&&!docs['cmappAcessos/'+item.uid],'Conta inexistente ou já versionada.');
  exigir(typeof u.ativo==='boolean'&&typeof u.nome==='string'&&u.nome.trim()&&typeof u.email==='string'&&/^\S+@\S+\.\S+$/.test(u.email),'Revise nome, e-mail e situação explícita da conta.');
  const p=item.politica;exigir(p&&Object.keys(p).every(k=>['papelPlataforma','permissoesPlataforma','atribuicoes','delegacoes'].includes(k)),'Política inválida.');
  exigir(['usuario','administrador','superadmin'].includes(p.papelPlataforma),'Papel inválido.');
  exigir((p.papelPlataforma==='superadmin')===(item.uid===revisao.superadminUid),'Somente o UID inicial explícito pode receber Superadmin.');
  exigir(Array.isArray(p.permissoesPlataforma)&&p.permissoesPlataforma.every(k=>Object.hasOwn(PLATAFORMA,k))&&new Set(p.permissoesPlataforma).size===p.permissoesPlataforma.length,'Capacidades inválidas.');
  exigir(p.papelPlataforma!=='usuario'||p.permissoesPlataforma.length===0,'Conta básica não pode conter capacidades administrativas.');
  exigir(Array.isArray(p.atribuicoes)&&p.atribuicoes.length<=100&&p.atribuicoes.every(atribuicaoValida),'Atribuições inválidas.');
  exigir(Array.isArray(p.delegacoes)&&p.delegacoes.length<=100&&p.delegacoes.every(delegacaoValida),'Delegações inválidas.');
  const atribuicoes=p.atribuicoes.map((a,i)=>({...a,id:'migracao-'+i})),delegacoes=p.delegacoes.map((a,i)=>({...a,id:'migracao-'+i}));
  adicionar('usuarios/'+item.uid,{...u,autorizacaoVersao:2,autorizacaoRevisao:0});
  adicionar('cmappAcessos/'+item.uid,{uid:item.uid,versao:2,ativo:u.ativo,papelPlataforma:p.papelPlataforma,permissoesPlataforma:p.permissoesPlataforma,atribuicoes,delegacoes,revisao:0});
 }
 exigir(vistos.has(revisao.superadminUid)&&docs['usuarios/'+revisao.superadminUid].ativo===true,'Superadmin inicial deve estar ativo e incluído no lote.');
 if(revisao.prepararPatrimonios===true){
  exigir(snapshot.colecoesCompletas?.includes('patrimonios')&&snapshot.colecoesCompletas.includes('divisoes'),'Preparação patrimonial exige snapshot completo das coleções.');
  const nomes=new Set();for(const [path,d]of Object.entries(docs).filter(([k])=>k.startsWith('divisoes/'))){exigir(typeof d.nome==='string'&&d.nome.trim()===d.nome&&d.nome.length>0&&!nomes.has(d.nome),'Divisões inválidas ou duplicadas: '+path);nomes.add(d.nome);}
  for(const [path,d]of Object.entries(docs).filter(([k])=>k.startsWith('patrimonios/'))){
   const local=d.localizacaoAtual||d.divisaoOrigem||d.divisao;
   exigir(typeof local==='string'&&nomes.has(local),'Localização sem correspondência no catálogo: '+path);
   exigir(typeof d.localizado==='boolean','Situação localizado deve ser booleana: '+path);
   exigir(!Object.hasOwn(d,'revisaoOperacionalV2')||Number.isSafeInteger(d.revisaoOperacionalV2)&&d.revisaoOperacionalV2>=0,'Revisão patrimonial inválida.');
   adicionar(path,{...d,localizacaoEfetivaV2:local});
  }
 }
 exigir(mudancas.length<=150&&Buffer.byteLength(JSON.stringify(mudancas))<6*1024*1024,'Lote excede 150 documentos ou 6 MiB. Divida a preparação antes de executar.');
 const bases=Object.fromEntries((snapshot.colecoesCompletas||[]).map(col=>[col,digest(Object.fromEntries(Object.entries(docs).filter(([path])=>path.startsWith(col+'/'))))]));
 const plano={bases,formato:1,ambiente:snapshot.ambiente,projectId:snapshot.projectId,revisadoPor:revisao.revisadoPor,superadminUid:revisao.superadminUid,snapshotHash:digest(snapshot),mudancas};
 return{...plano,id:digest(plano)};
}
export function validarPlano(p){const{id:hash,...base}=p||{};exigir(hash===digest(base)&&base.formato===1&&PROJETOS[base.ambiente]===base.projectId,'Plano inválido ou alterado.');exigir(Array.isArray(base.mudancas)&&base.mudancas.length>0&&base.mudancas.length<=150,'Lote inválido.');for(const m of base.mudancas)exigir(/^(usuarios|cmappAcessos|patrimonios)\/[^/]+$/.test(m.path),'Caminho não permitido.');exigir(new Set(base.mudancas.map(m=>m.path)).size===base.mudancas.length,'Caminho duplicado.');return p;}
// Adapter transacional: lê todos os recursos antes de escrever e nunca restaura sobre mudança posterior.
export async function executarPlano({db,plano,modo,encode=x=>x,decode=x=>x}){
 validarPlano(plano);exigir(['aplicar','reverter'].includes(modo),'Modo inválido.');
 return db.runTransaction(async tx=>{
  const config=await tx.get(db.doc('cmappConfiguracao/acessos'));
  exigir(config.data()?.manutencaoV2===true&&config.data()?.legadoBloqueado===true&&config.data()?.sincronizacaoContasAtiva!==true,'Exige manutenção v2, bloqueio legado e trabalho de sincronização desligado.');
  const recibo=db.doc('cmappMigracoes/'+plano.id),r=await tx.get(recibo);
  if(modo==='aplicar'&&r.data()?.estado==='aplicada'||modo==='reverter'&&r.data()?.estado==='revertida')return{repetida:true,estado:r.data().estado};
  exigir(modo==='aplicar'?!r.exists:r.data()?.estado==='aplicada','Sequência da migração inválida.');
  if(modo==='aplicar')for(const [col,hash]of Object.entries(plano.bases||{})){exigir(['usuarios','cmappAcessos','divisoes','patrimonios','inventarios'].includes(col),'Coleção não permitida.');const snap=await tx.get(db.collection(col).limit(5001));exigir(snap.size<=5000&&digest(Object.fromEntries(snap.docs.map(d=>[d.ref.path,encode(d.data())])))===hash,'Coleção mudou após snapshot: '+col);}
  const atuais=[];for(const m of plano.mudancas)atuais.push(await tx.get(db.doc(m.path)));
  for(let i=0;i<plano.mudancas.length;i++){const m=plano.mudancas[i],atual=atuais[i].exists?encode(atuais[i].data()):null;exigir(estavel(atual)===estavel(modo==='aplicar'?m.antes:m.depois),'Divergência no documento '+m.path+'; nenhuma alteração aplicada.');}
  for(const m of plano.mudancas){const valor=modo==='aplicar'?m.depois:m.antes;if(valor===null)tx.delete(db.doc(m.path));else tx.set(db.doc(m.path),decode(valor));}
  const estado=modo==='aplicar'?'aplicada':'revertida';tx.set(recibo,{atualizadoEm:new Date(),estado,planoId:plano.id,projectId:plano.projectId,revisadoPor:plano.revisadoPor,documentos:plano.mudancas.length});
  tx.set(db.doc('cmappAcessosEventos/migracao-'+plano.id+'-'+estado),{registradoEm:new Date(),tipo:'migracao_'+estado,planoId:plano.id,operadorNome:plano.revisadoPor,documentos:plano.mudancas.length});return{estado,documentos:plano.mudancas.length};
 });
}
