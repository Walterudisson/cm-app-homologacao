import{readFile,writeFile,mkdir,rename}from'node:fs/promises';import{join}from'node:path';import{randomUUID}from'node:crypto';
import{prepararHml}from'./preflight-hml-v2.mjs';import{prepararMigracao,executarPlano,estavel,validarPlano}from'./migracao-acessos-v2.mjs';
const FLAGS=['manutencaoV2','legadoBloqueado','sincronizacaoContasAtiva'];
export async function homologarGestao({db,auth,revisao,pasta,modo='ativar',encode=x=>x,decode=x=>x,esperar,agora=()=>Date.now(),informar=()=>{}}){
 if(!['ativar','reverter','status'].includes(modo)||revisao?.ambiente!=='hml'||revisao.projectId!=='cm-app-homologacao')throw Error('Operação limitada à gestão HML.');
 const inicial=revisao.contas?.[0],p=inicial?.politica;
 if(typeof revisao.superadminUid!=='string'||!revisao.superadminUid||revisao.superadminUid.length>128||revisao.superadminUid.includes('/')||revisao.contas?.length!==1||inicial.uid!==revisao.superadminUid||inicial.revisado!==true||revisao.prepararPatrimonios===true||p?.papelPlataforma!=='superadmin'||['permissoesPlataforma','atribuicoes','delegacoes'].some(k=>!Array.isArray(p[k])||p[k].length))throw Error('Escopo exige somente a conta inicial explicitamente revisada.');
 if(!esperar)throw Error('Temporizador obrigatório para drenagem.');
 await mkdir(pasta,{recursive:true,mode:0o700});const ler=async nome=>{try{return JSON.parse(await readFile(join(pasta,nome),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 let estado=await ler('estado.json');
 if(!estado){if(modo!=='ativar')throw Error('Não há execução nesta pasta.');estado={id:randomUUID(),uid:revisao.superadminUid,fase:'inicial'};await writeFile(join(pasta,'estado.json'),JSON.stringify(estado),{flag:'wx',mode:0o600});}
 if(estado.uid!==revisao.superadminUid)throw Error('Pasta pertence a outro UID.');
 const registrar=async fase=>{estado={...estado,fase};const tmp=join(pasta,'estado-'+randomUUID()+'.tmp');await writeFile(tmp,JSON.stringify(estado,null,2),{mode:0o600,flag:'wx'});await rename(tmp,join(pasta,'estado.json'));informar(fase);};
 const salvar=async(nome,dados)=>{const existente=await ler(nome);if(existente){if(estavel(existente)!==estavel(dados))throw Error('Backup existente diverge: '+nome);return;}await writeFile(join(pasta,nome),JSON.stringify(dados,null,2)+'\n',{flag:'wx',mode:0o600});};
 const cfgRef=db.doc('cmappConfiguracao/acessos');
 let plano=await ler('plano.json');if(plano){validarPlano(plano);if(plano.superadminUid!==estado.uid||plano.mudancas.length!==2||plano.mudancas.some(m=>!['usuarios/'+estado.uid,'cmappAcessos/'+estado.uid].includes(m.path)))throw Error('Plano fora do escopo da conta inicial.');}
 if(modo==='status')return{fase:estado.fase,uid:estado.uid,planoId:plano?.id||null};
 if(modo==='ativar'&&estado.fase==='concluida'){
  const u=(await db.doc('usuarios/'+estado.uid).get()).data(),a=(await db.doc('cmappAcessos/'+estado.uid).get()).data();
  if(u?.autorizacaoVersao!==2||u?.ativo!==true||a?.papelPlataforma!=='superadmin'||!a.ativo)throw Error('Estado atual divergiu da ativação concluída.');
  return{fase:'concluida',repetida:true,uid:estado.uid};
 }
 if(modo==='ativar'&&['revertida','reversao_automatica'].includes(estado.fase))throw Error('Execução revertida. Uma nova tentativa exige pasta nova e novo plano.');
 if(modo==='reverter'&&!plano)throw Error('Plano de reversão ausente.');
 if(modo==='reverter'&&estado.fase==='revertida')return{fase:'revertida',repetida:true};
 let original=await ler('config-original.json');
 if(!original){const s=await cfgRef.get();original={existe:s.exists,dados:s.exists?encode(s.data()):null};await salvar('config-original.json',original);}
 async function adquirir(){await db.runTransaction(async tx=>{
  const s=await tx.get(cfgRef),c=s.data()||{};
  if(c.migracaoGestaoHml===estado.id)return;
  if(c.migracaoGestaoHml||c.manutencaoV2===true||c.legadoBloqueado===true)throw Error('Já existe manutenção de outra operação.');
  const cfgAntes=original.dados?decode(original.dados):{};for(const f of FLAGS)if(Object.hasOwn(c,f)!==Object.hasOwn(cfgAntes,f)||estavel(c[f])!==estavel(cfgAntes[f]))throw Error('Flags mudaram desde o backup; revise antes de continuar.');
  // Não perder alterações feitas entre backup e aquisição inicial.
  if(modo==='ativar'&&estado.fase==='inicial'&&estavel(s.exists?encode(c):null)!==estavel(original.dados))throw Error('Configuração mudou após o backup.');
  tx.set(cfgRef,{...c,manutencaoV2:true,legadoBloqueado:true,sincronizacaoContasAtiva:false,migracaoGestaoHml:estado.id});
 });}
 async function liberar(){await db.runTransaction(async tx=>{
  const s=await tx.get(cfgRef),c=s.data()||{};if(c.migracaoGestaoHml!==estado.id)throw Error('Manutenção não pertence a esta execução.');
  if(c.manutencaoV2!==true||c.legadoBloqueado!==true||c.sincronizacaoContasAtiva!==false)throw Error('Flags de manutenção alteradas por outra operação.');
  const restaurada={...c};delete restaurada.migracaoGestaoHml;const antes=original.dados?decode(original.dados):{};
  for(const f of FLAGS){if(Object.hasOwn(antes,f))restaurada[f]=antes[f];else delete restaurada[f];}
  if(!original.existe&&!Object.keys(restaurada).length)tx.delete(cfgRef);else tx.set(cfgRef,restaurada);
 });}
 let possui=false;
 try{
  await adquirir();possui=true;await registrar('manutencao');
  // Cada invocação drena novamente; não se repete deploy e não se repete migração confirmada.
  for(let n=4;n>0;n--){informar('Aguardando chamadas anteriores: '+(n*30)+' segundos.');await esperar(30000);}
  await registrar('drenada');
  if(!plano){
   const snapshotSalvo=await ler('snapshot.json');const dados=snapshotSalvo?{snapshot:snapshotSalvo}:await prepararHml({db,auth,revisao,encode});dados.snapshot.execucaoPiloto=estado.id;plano=prepararMigracao(dados.snapshot,revisao);
   if(plano.mudancas.length!==2||plano.mudancas.some(m=>!['usuarios/'+estado.uid,'cmappAcessos/'+estado.uid].includes(m.path)))throw Error('Plano fora do escopo da conta inicial.');
   await salvar('snapshot.json',dados.snapshot);await salvar('revisao.json',revisao);await salvar('plano.json',plano);await registrar('backup_concluido');
  }
  if(modo==='ativar'){
   const resultado=await executarPlano({db,plano,modo:'aplicar',encode,decode});await registrar('aplicada');
   for(const m of plano.mudancas){const d=await db.doc(m.path).get();if(estavel(d.exists?encode(d.data()):null)!==estavel(m.depois))throw Error('Verificação final falhou: '+m.path);}
   const identidade=await auth.getUser(estado.uid),conta=plano.mudancas.find(m=>m.path==='usuarios/'+estado.uid).depois;
   if(identidade.disabled||identidade.uid!==estado.uid||identidade.email?.trim().toLowerCase()!==conta.email.trim().toLowerCase())throw Error('Identidade Auth mudou durante a habilitação.');
   await liberar();possui=false;await registrar('concluida');return{...resultado,fase:'concluida',uid:estado.uid,planoId:plano.id};
  }
  const resultado=await executarPlano({db,plano,modo:'reverter',encode,decode});await registrar('dados_revertidos');await liberar();possui=false;await registrar('revertida');return{...resultado,fase:'revertida'};
 }catch(e){
  if(possui){
   try{
    const recibo=plano?(await db.doc('cmappMigracoes/'+plano.id).get()).data():null;
    if(modo==='ativar'&&recibo?.estado==='aplicada'){await executarPlano({db,plano,modo:'reverter',encode,decode});await registrar('reversao_automatica');}
    await liberar();possui=false;
   }catch(reversao){informar('Manutenção mantida: '+reversao.message);throw Error(e.message+' | Não foi possível finalizar a recuperação. Use o modo reverter com a mesma pasta de estado.');}
  }
  throw e;
 }
}
