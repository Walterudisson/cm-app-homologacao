import{readFile}from'node:fs/promises';import{resolve}from'node:path';import{createRequire}from'node:module';import{setTimeout}from'node:timers/promises';
import{homologarGestao}from'./lib/homologacao-gestao-hml.mjs';import{criarCodecFirestore}from'./lib/codec-firestore-v2.mjs';
const [modo,functionsDir,reviewFile,stateDir]=process.argv.slice(2);
try{
 if(process.versions.node.split('.')[0]!=='22')throw Error('Use Node 22 antes da habilitação.');
 if(process.argv.length!==6||!['ativar','reverter','status'].includes(modo))throw Error('Uso: node scripts/homologar-gestao-hml.mjs ativar|reverter|status caminho/functions revisao.json pasta-estado');
 const revisao=JSON.parse(await readFile(reviewFile,'utf8'));if(revisao.ambiente!=='hml'||revisao.projectId!=='cm-app-homologacao')throw Error('Somente HML é permitido.');
 const req=createRequire(resolve(functionsDir,'package.json'));const{initializeApp,applicationDefault,deleteApp}=req('firebase-admin/app');const{getFirestore,Timestamp,GeoPoint}=req('firebase-admin/firestore');const{getAuth}=req('firebase-admin/auth');
 const app=initializeApp({credential:applicationDefault(),projectId:revisao.projectId},'homologacao-gestao-hml');
 try{
  if(modo==='ativar'){
   const pagina=await fetch('https://walterudisson.github.io/cm-app-homologacao/homologacao/gestao-acessos/?entrega=gestao-hml-piloto-1',{cache:'no-store'});
   if(!pagina.ok||!(await pagina.text()).includes('content="gestao-hml-piloto-1"'))throw Error('A tela real ainda não está publicada. Nenhuma migração foi iniciada.');
   const token=await app.options.credential.getAccessToken();
   const get=async recurso=>{const r=await fetch(recurso,{headers:{Authorization:'Bearer '+token.access_token}});if(!r.ok)throw Error('Verificação do backend: HTTP '+r.status);return r.json();};
   const nomes=['cmappMeusAcessos','cmappConsultarAcessos','cmappListarUsuariosAcesso','cmappListarDivisoesAcesso','cmappConsultarAuditoriaAcesso','cmappConcederAcesso','cmappRevogarAcesso','cmappDesignarDelegacao','cmappRemoverDelegacao','cmappConsultarSincronizacaoConta','cmappReconciliarConta','cmappCriarConta','cmappAtualizarConta','cmappAlterarEstadoConta','cmappPrepararRecuperacao'];
   await Promise.all(nomes.map(async nome=>{const f=await get('https://cloudfunctions.googleapis.com/v2/projects/cm-app-homologacao/locations/southamerica-east1/functions/'+nome);if(f.state!=='ACTIVE')throw Error('Função indisponível: '+nome);}));
   const release=await get('https://firebaserules.googleapis.com/v1/projects/cm-app-homologacao/releases/cloud.firestore');if(!release.rulesetName?.startsWith('projects/cm-app-homologacao/rulesets/'))throw Error('Referência de Rules inesperada.');
   const regras=await get('https://firebaserules.googleapis.com/v1/'+release.rulesetName);const source=regras.source?.files?.map(f=>f.content).join('\n')||'';
   if(!source.includes('function emManutencaoV2()')||!source.includes('function marcadoV2()'))throw Error('Rules de transição não foram confirmadas. Nenhuma migração iniciada.');
  }
  const db=getFirestore(app),codec=criarCodecFirestore({Timestamp,GeoPoint,db,projectId:revisao.projectId});
  const resultado=await homologarGestao({db,auth:getAuth(app),revisao,pasta:resolve(stateDir),modo,...codec,esperar:setTimeout,informar:console.log});console.log(JSON.stringify(resultado,null,2));
  if(resultado.fase==='concluida')console.log('Abra https://walterudisson.github.io/cm-app-homologacao/homologacao/gestao-acessos/ e entre com sua conta do CMAPP.');
 }finally{await deleteApp(app);}
}catch(e){console.error('Operação interrompida: '+e.message);process.exitCode=1;}
