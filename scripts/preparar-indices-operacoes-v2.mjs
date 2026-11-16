import {readFile,writeFile} from 'node:fs/promises';
const destino=process.argv[2];
if(!destino||process.argv.length!==3){process.stderr.write('Uso: node scripts/preparar-indices-operacoes-v2.mjs caminho/firestore.indexes.json\nMescla somente um arquivo local, sem deploy.\n');process.exitCode=1;}
else try {
  const necessarios=JSON.parse(await readFile(new URL('../backend/operacoes-v2/firestore.indexes.json',import.meta.url),'utf8'));
  let atual;try{atual=JSON.parse(await readFile(destino,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;atual={indexes:[],fieldOverrides:[]};}
  if(!Array.isArray(atual.indexes)||!Array.isArray(atual.fieldOverrides))throw Error('Arquivo de índices incompatível.');
  for(const indice of necessarios.indexes){if(!atual.indexes.some(i=>i.collectionGroup===indice.collectionGroup&&i.queryScope===indice.queryScope&&JSON.stringify(i.fields)===JSON.stringify(indice.fields)))atual.indexes.push(indice);}
  await writeFile(destino,JSON.stringify(atual,null,2)+'\n');process.stdout.write('Índices locais mesclados; nenhum deploy executado.\n');
}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
