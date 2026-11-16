import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {prepararMigracao,executarPlano,validarPlano,PROJETOS} from './lib/migracao-acessos-v2.mjs';
const args=process.argv.slice(2),cmd=args.shift();
const ler=async path=>JSON.parse(await readFile(path,'utf8'));
const salvar=(path,obj)=>writeFile(path,JSON.stringify(obj,null,2)+'\n',{flag:'wx',mode:0o600});
try{
 if(cmd==='planejar'){
  if(args.length!==3)throw Error('Uso: planejar snapshot.json revisao.json plano-novo.json');
  const plano=prepararMigracao(await ler(args[0]),await ler(args[1]));await salvar(args[2],plano);console.log('Simulação salva. '+plano.mudancas.length+' documentos propostos. Nenhuma conexão ou escrita no Firebase.');
 }else if(['snapshot','aplicar','reverter'].includes(cmd)){
  // Não se usam projeto padrão, .firebaserc ou SDK da aplicação como fonte do ambiente.
  const [ambiente,projectId,pacoteFunctions,arquivo,backup,confirmacao]=args;
  if(PROJETOS[ambiente]!==projectId)throw Error('Ambiente/projeto não permitido.');
  if(cmd==='snapshot'?args.length!==4:args.length!==6||confirmacao!==projectId)throw Error('Uso: snapshot hml|prd projectId caminho/functions saida-nova.json OU aplicar|reverter hml|prd projectId caminho/functions plano.json backup-novo.json projectId');
  const plano=cmd==='snapshot'?null:validarPlano(await ler(arquivo));
  if(plano&&(plano.projectId!==projectId||plano.ambiente!==ambiente))throw Error('Plano de outro ambiente.');
  const req=createRequire(resolve(pacoteFunctions,'package.json'));
  const {initializeApp,applicationDefault,deleteApp}=req('firebase-admin/app'),{getFirestore,Timestamp,GeoPoint}=req('firebase-admin/firestore');
  function encode(v){
   if(v instanceof Timestamp)return{$cmappTipo:'timestamp',seconds:v.seconds,nanos:v.nanoseconds};
   if(v instanceof GeoPoint)return{$cmappTipo:'geopoint',latitude:v.latitude,longitude:v.longitude};
   if(Buffer.isBuffer(v)||v instanceof Uint8Array)return{$cmappTipo:'bytes',base64:Buffer.from(v).toString('base64')};
   if(v===null||typeof v!=='object'){if(typeof v==='number'&&!Number.isFinite(v))throw Error('Número não finito no snapshot.');return v;}
   if(v instanceof Date)return{$cmappTipo:'date',iso:v.toISOString()};
   if(v.path&&v.firestore){if(v.firestore.projectId!==projectId)throw Error('Referência a outro projeto no snapshot.');return{$cmappTipo:'reference',path:v.path};}
   if(Array.isArray(v))return v.map(encode);
   if(Object.hasOwn(v,'$cmappTipo'))throw Error('Campo reservado no documento; revisão de codec necessária.');
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));
  }
  const app=initializeApp({credential:applicationDefault(),projectId},'migracao-cmapp');const db=getFirestore(app);
  function decode(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(decode);if(v.$cmappTipo==='timestamp')return new Timestamp(v.seconds,v.nanos);if(v.$cmappTipo==='geopoint')return new GeoPoint(v.latitude,v.longitude);if(v.$cmappTipo==='bytes')return Buffer.from(v.base64,'base64');if(v.$cmappTipo==='date')return new Date(v.iso);if(v.$cmappTipo==='reference')return db.doc(v.path);return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)]));}
  try{
   if(cmd==='snapshot'){
    const colecoes=['usuarios','cmappAcessos','divisoes','patrimonios','inventarios'];
    const documentos=await db.runTransaction(async tx=>{
     const config=await tx.get(db.doc('cmappConfiguracao/acessos'));if(config.data()?.manutencaoV2!==true||config.data()?.legadoBloqueado!==true||config.data()?.sincronizacaoContasAtiva===true)throw Error('Ative manutenção e bloqueio legado; desligue sincronização antes do snapshot.');
     const docs={};for(const colecao of colecoes){const s=await tx.get(db.collection(colecao).limit(5001));if(s.size>5000)throw Error('Coleção excede limite de snapshot: '+colecao);for(const d of s.docs)docs[d.ref.path]=encode(d.data());}return docs;
    });
    await salvar(arquivo,{formato:1,ambiente,projectId,colecoesCompletas:colecoes,documentos});console.log('Snapshot local salvo. Não houve escrita no Firebase.');
   }else{
    // Backup de todos os antes/depois é persistido e fechado antes da primeira transação de escrita.
    await salvar(backup,{formato:1,modo:cmd,ambiente,projectId,plano});
    console.log(JSON.stringify(await executarPlano({db,plano,modo:cmd,encode,decode})));
   }
  }finally{await deleteApp(app);}
 }else throw Error('Comandos: planejar, snapshot, aplicar, reverter. O padrão não executa migração. Consulte docs/MIGRACAO-ACESSOS-V2.md.');
}catch(e){console.error('Interrompido: '+e.message);process.exitCode=1;}
