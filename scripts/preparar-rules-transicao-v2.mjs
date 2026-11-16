import{readFile,writeFile}from'node:fs/promises';
const file=process.argv[2];if(!file||process.argv.length!==3){process.stderr.write('Uso: node scripts/preparar-rules-transicao-v2.mjs caminho/firestore.rules\nAltera somente arquivo local; não publica.\n');process.exitCode=1;}else try{
 let s=await readFile(file,'utf8');
 if(!s.includes('function marcadoV2()'))s=s.replace('    function usuarioDoApp() {',"    // Transição: versão marcada nunca usa privilégios legados.\n    function marcadoV2() { return usuarioAtual().data.keys().hasAny(['autorizacaoVersao']); }\n\n    function usuarioDoApp() {");
 s=s.replace("return usuarioAtivo()\n        && perfilAtual() in", "return usuarioAtivo() && !marcadoV2()\n        && perfilAtual() in");
 for(const perfil of ['admin','gestor','conferente'])s=s.replace("return usuarioAtivo() && perfilAtual() == '"+perfil+"';", "return usuarioAtivo() && !marcadoV2() && perfilAtual() == '"+perfil+"';");
 if(!s.includes('function marcadoV2()')||!s.includes('return usuarioAtivo() && !marcadoV2()'))throw Error('Rules incompatíveis.');
 await writeFile(file,s);process.stdout.write('Rules locais preparadas: contas versionadas ficam sem acesso legado operacional; Meu perfil permanece próprio. Não houve deploy.\n');
}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
