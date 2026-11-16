import {readFile,writeFile,mkdir} from 'node:fs/promises';import{resolve,join}from'node:path';import{createRequire}from'node:module';
import {criarCodecFirestore}from'./lib/codec-firestore-v2.mjs';import{prepararHml}from'./lib/preflight-hml-v2.mjs';
const [functionsDir,reviewFile,outputDir]=process.argv.slice(2);
try{
 if(process.argv.length!==5)throw Error('Uso: node scripts/preparar-plano-hml.mjs caminho/functions revisao-hml.json pasta-nova');
 const revisao=JSON.parse(await readFile(reviewFile,'utf8'));
 if(revisao.ambiente!=='hml'||revisao.projectId!=='cm-app-homologacao')throw Error('Somente HML é permitido nesta preparação.');
 // Cria uma pasta exclusiva antes de iniciar: nunca sobrescreve resultados de execução anterior.
 await mkdir(outputDir,{mode:0o700});
 const req=createRequire(resolve(functionsDir,'package.json'));const {initializeApp,applicationDefault,deleteApp}=req('firebase-admin/app');const{getAuth}=req('firebase-admin/auth');const{getFirestore,Timestamp,GeoPoint}=req('firebase-admin/firestore');
 const app=initializeApp({credential:applicationDefault(),projectId:revisao.projectId},'preflight-hml-cmapp');
 try{
  const db=getFirestore(app),{encode}=criarCodecFirestore({Timestamp,GeoPoint,db,projectId:revisao.projectId});
  const resultado=await prepararHml({db,auth:getAuth(app),revisao,encode});
  for(const [nome,conteudo]of Object.entries(resultado))await writeFile(join(outputDir,nome+'.json'),JSON.stringify(conteudo,null,2)+'\n',{flag:'wx',mode:0o600});
  await writeFile(join(outputDir,'revisao.json'),JSON.stringify(revisao,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(resultado.resumo,null,2));console.log('Nenhum deploy, migração, alteração de conta ou de configuração foi executado.');
 }finally{await deleteApp(app);}
}catch(e){console.error('Preparação interrompida: '+e.message);process.exitCode=1;}
