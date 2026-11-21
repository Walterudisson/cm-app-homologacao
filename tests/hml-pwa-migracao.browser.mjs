// Navegador real e origem local isolada; nenhuma credencial ou serviço Firebase.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const novo=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
const antigo=execFileSync('git',['show','b3a1b485ed051a097340f8b018b3159290e0ce5f:service-worker.js'],{encoding:'utf8'});
// Desliga apenas precache CDN: teste de ciclo de vida não depende de rede externa.
const semCDN=s=>s.replace(/const DEPENDENCIAS_EXTERNAS = \[[\s\S]*?\];/,'const DEPENDENCIAS_EXTERNAS = [];');
let atual=false;
const escopo='/cm-app-homologacao/';
const pagina=()=>'<html><body><h1 id="versao">'+(atual?'H.5':'H.1')+'</h1></body></html>';
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');
 if(path===escopo+'service-worker.js'){res.setHeader('Content-Type','text/javascript');res.end(semCDN(atual?novo:antigo));return;}
 if(path===escopo||path===escopo+'index.html'){res.setHeader('Content-Type','text/html');res.end(pagina());return;}
 if(path===escopo+'outra-rota/'){res.setHeader('Content-Type','text/html');res.end('<h1>V2</h1>');return;}
 if(path.endsWith('.js'))res.setHeader('Content-Type','text/javascript');
 if(path.endsWith('.css'))res.setHeader('Content-Type','text/css');
 res.end('');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:['--no-sandbox']});
 const context=await browser.newContext();
 const origem='http://127.0.0.1:'+server.address().port,entrada=origem+escopo;
 const page=await context.newPage();
 await page.goto(entrada);
 // Simula usuário já instalado: prepara e ativa o worker legado, sem rotina JS nova.
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await page.reload();
 assert.equal(await page.locator('#versao').textContent(),'H.1');
 const v2=await context.newPage();await v2.goto(entrada+'outra-rota/');
 await v2.evaluate(()=>{window.marcadorOutraRota='preservado';});
 await page.evaluate(()=>{localStorage.setItem('preferencia-teste','preservada');document.cookie='sessaoTeste=1; path=/cm-app-homologacao/';});
 atual=true;
 // Verificação do navegador iniciada explicitamente para tornar o teste determinístico.
 // Nenhum postMessage, aceite, recuperação do HTML antigo, limpeza ou reload manual.
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();void r.update();});
 await page.waitForFunction(()=>document.querySelector('#versao')?.textContent==='H.5',{},{timeout:30000});
 assert.match(page.url(),/cmapp-recovery=/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('preferencia-teste')),'preservada');
 assert.match(await page.evaluate(()=>document.cookie),/sessaoTeste=1/);
 assert.equal(await v2.evaluate(()=>window.marcadorOutraRota),'preservado');
 const cachesApos=await page.evaluate(()=>caches.keys());
 assert.ok(!cachesApos.includes('cmapp-shell-v1.13.37-h.1-qa-integrada'));
 assert.ok(cachesApos.includes('cmapp-shell-v1.13.38-h.1-gabinete'));
 console.log('Chromium: migração H.1 → H.5 automática, reload somente legado, cookies e preferências preservados.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
