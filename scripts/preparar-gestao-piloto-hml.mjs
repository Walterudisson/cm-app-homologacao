import{readFile,writeFile,mkdir,copyFile}from'node:fs/promises';import{resolve,dirname,relative}from'node:path';
const raiz=resolve(import.meta.dirname,'..'),dest=resolve(raiz,'homologacao/gestao-acessos'),vistos=new Set();
const login=`<form id="pilot-login" class="fields hidden"><label class="full">E-mail institucional<input name="email" type="email" autocomplete="username" required></label><label class="full">Senha<input name="senha" type="password" autocomplete="current-password" required></label><p id="pilot-login-error" class="full" role="alert"></p><button id="pilot-login-submit" class="primary" type="submit">Entrar</button></form>`;
async function copiar(p){const f=resolve(raiz,p);if(!f.startsWith(raiz+'/'))throw Error('Dependência externa.');if(vistos.has(f))return;vistos.add(f);let s=await readFile(f,'utf8');
 if(p==='gestao-v2/app.js'){
  s=s.replace(/^import \{temConsultaPatrimonial\}.*\n/m,'').replace(/^import \{podeExecutar\}.*\n/m,'');
  s=s.replace('onAuthStateChanged,signOut,','onAuthStateChanged,signInWithEmailAndPassword,signOut,');
  s="import {conectarLoginPiloto} from './login-piloto.js';\n"+s;
  s=s.replace("const id=n=>", "const loginPiloto=conectarLoginPiloto({auth,entrar:signInWithEmailAndPassword,document});\nconst id=n=>");
  s=s.replace("if(!user){mensagem('Entre no CMAPP para acessar sua conta.');return;}","if(!user){mensagem('Entre com sua conta do CMAPP.');loginPiloto.mostrar();return;}\n loginPiloto.ocultar();");
  s=s.replace(/  id\('open-patrimonios'\)\.classList\.toggle[^\n]*\n/,'').replace(/  id\('open-dsips'\)\.classList\.toggle[^\n]*\n/,'');
 }
 for(const m of s.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){if(m[1].startsWith('.'))await copiar(relative(raiz,resolve(dirname(f),m[1])));else if(!m[1].startsWith('https://www.gstatic.com/firebasejs/10.8.0/'))throw Error('Importação remota não prevista: '+m[1]);}
 const alvo=resolve(dest,'assets',p);await mkdir(dirname(alvo),{recursive:true});await writeFile(alvo,s);
}
for(const p of ['gestao-v2/app.js','js/ui/tema.js'])await copiar(p);
await mkdir(resolve(dest,'assets/gestao-v2'),{recursive:true});await copyFile(resolve(raiz,'gestao-v2/style.css'),resolve(dest,'assets/gestao-v2/style.css'));
let html=await readFile(resolve(raiz,'gestao-v2/index.html'),'utf8');
html=html.replace('<head>','<head><meta name="cmapp-entrega" content="gestao-hml-piloto-1">').replace('href="./style.css"','href="./assets/gestao-v2/style.css"').replace('src="../js/ui/tema.js"','src="./assets/js/ui/tema.js"').replace('src="./app.js"','src="./assets/gestao-v2/app.js"').replace('<div class="actions"><a href="../" id="back-login">Ir para o CMAPP</a>','<div class="actions"><a href="../../" id="back-login">CMAPP</a>');
html=html.replace('<div class="demo">',login+'<div class="demo">');
// O formulário de entrada fica dentro do gate; os links operacionais permanecem ocultos neste piloto.
html=html.replace(login,'').replace('<div class="actions"><a href="../../" id="back-login">',login+'<div class="actions"><a href="../../" id="back-login">');
html=html.replace('href="../patrimonios-v2/"','href="#" aria-disabled="true"').replace('href="../operacoes-v2/"','href="#" aria-disabled="true"').replace('CMAPP · Gestão de usuários v2','CMAPP · Gestão de usuários v2 · Piloto HML');
await writeFile(resolve(dest,'index.html'),html);await writeFile(resolve(dest,'README.md'),'Piloto de gestão HML com Authentication real. Gerado por scripts/preparar-gestao-piloto-hml.mjs. Sem ativação de Patrimônios/DSIPS, migração de outros usuários ou alteração da entrada legada.\n');
console.log('Piloto HML preparado em homologacao/gestao-acessos/. Nenhum deploy ou migração.');
