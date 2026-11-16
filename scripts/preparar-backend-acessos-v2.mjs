import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';import {resolve,join} from 'node:path';import {fileURLToPath} from 'node:url';
const raiz=fileURLToPath(new URL('../',import.meta.url));const args=process.argv.slice(2);
if(args.length!==1||args[0].startsWith('--')){process.stderr.write('Uso: node scripts/preparar-backend-acessos-v2.mjs caminho/functions\nPrepara arquivos locais. Não faz deploy nem migra usuários.\n');process.exitCode=1;}
else try{
 const destino=resolve(args[0]);const pkg=JSON.parse(await readFile(join(destino,'package.json'),'utf8'));const index=await readFile(join(destino,'index.js'),'utf8');
 if(pkg.main!=='index.js'||!pkg.dependencies?.['firebase-admin']||!pkg.dependencies?.['firebase-functions'])throw Error('Destino deve ser um pacote Functions CMAPP com index.js.');
 for(const name of ['onCall','db','auth','FieldValue','HttpsError','REGIAO'])if(!new RegExp('\\b'+name+'\\b').test(index))throw Error('Dependência não encontrada no index.js: '+name);
 const pasta=join(destino,'acessos-v2');await mkdir(join(pasta,'politica'),{recursive:true});
 for(const f of ['servico.cjs','registrar.cjs','contas.cjs','legado.cjs'])await copyFile(join(raiz,'backend/acessos-v2',f),join(pasta,f));
 for(const f of ['catalogo','politica']){const source=await readFile(join(raiz,'js/platform/access',f+'.js'),'utf8');await writeFile(join(pasta,'politica',f+'.mjs'),source.replaceAll("'./catalogo.js'","'./catalogo.mjs'"));}
 const marker='// CMAPP-ACESSOS-V2: registro de endpoints';
 const registro="Object.assign(exports, require('./acessos-v2/registrar.cjs')({onCall, db, auth, FieldValue, HttpsError, regiao: REGIAO}));";
 let atualizado=index.replace("Object.assign(exports, require('./acessos-v2/registrar.cjs')({onCall, db, FieldValue, HttpsError, regiao: REGIAO}));",registro);
 if(!atualizado.includes(marker))atualizado+='\n'+marker+'\n'+registro+'\n';
 const legadoMarker='// CMAPP-ACESSOS-V2-LEGADO: proteção de transição';
 if(!atualizado.includes(legadoMarker))atualizado+='\n'+legadoMarker+"\nObject.assign(exports, require('./acessos-v2/legado.cjs')({onCall, db, HttpsError, regiao: REGIAO, exportsAtuais: exports}));\n";
 await writeFile(join(destino,'index.js'),atualizado);
 process.stdout.write('Backend local preparado: '+pasta+'\nNenhum deploy executado. Nenhum usuário migrado.\n');
}catch(e){process.stderr.write('Preparação interrompida: '+e.message+'\n');process.exitCode=1;}
