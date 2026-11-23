import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {criarIndicadorCarregamento} from '../js/ui/loading.js';

const ler = caminho => readFile(new URL('../'+caminho, import.meta.url),'utf8');
const dormir = ms => new Promise(resolver => setTimeout(resolver,ms));
function criarElementoSimulado() {
  const classes = new Set(['hidden']);
  const atributos = {};
  return {
    hidden:true,
    classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
    setAttribute:(nome,valor)=>{atributos[nome]=valor;},
    getAttribute:nome=>atributos[nome]??null
  };
}

test('UX-05: consulta instantânea não provoca piscada do skeleton',async()=>{
  const esqueleto=criarElementoSimulado(),regiao=criarElementoSimulado();
  const indicador=criarIndicadorCarregamento({elemento:esqueleto,ocupado:regiao,atrasoMs:10});
  indicador.iniciar();
  assert.equal(regiao.getAttribute('aria-busy'),'true');
  indicador.encerrar();
  await dormir(35);
  assert.equal(esqueleto.hidden,true);
  assert.equal(esqueleto.classList.contains('hidden'),true);
  assert.equal(regiao.getAttribute('aria-busy'),'false');
});

test('UX-05: consulta lenta mostra skeleton e o remove no fim',async()=>{
  const esqueleto=criarElementoSimulado(),regiao=criarElementoSimulado();
  const indicador=criarIndicadorCarregamento({elemento:esqueleto,ocupado:regiao,atrasoMs:5});
  indicador.iniciar();
  await dormir(50);
  assert.equal(esqueleto.hidden,false);
  assert.equal(esqueleto.classList.contains('hidden'),false);
  indicador.encerrar();
  assert.equal(esqueleto.hidden,true);
  assert.equal(regiao.getAttribute('aria-busy'),'false');
});

test('UX-05: cancelamento de sessão e restrição de visibilidade impedem skeleton atrasado',async()=>{
  const esqueleto=criarElementoSimulado();
  let permitido=true;
  const indicador=criarIndicadorCarregamento({elemento:esqueleto,atrasoMs:15,podeExibir:()=>permitido});
  indicador.iniciar();
  permitido=false;
  await dormir(45);
  assert.equal(esqueleto.hidden,true);
  permitido=true;
  indicador.iniciar();
  indicador.encerrar();
  await dormir(45);
  assert.equal(esqueleto.hidden,true);
});

test('UX-05: tela Cautelas usa carregamento atrasado sem resultados inventados',async()=>{
  const [html,registro,app,css,sw]=await Promise.all([
    ler('index.html'),ler('js/modules/dsips/registro-cautelas-ui.js'),
    ler('app.js'),ler('app.css'),ler('service-worker.js')
  ]);
  assert.match(html, /id="dsips-cautelas-loading"[^>]*hidden[^>]*aria-hidden="true"/);
  assert.match(registro,/criarIndicadorCarregamento\(\{/);
  assert.match(registro,/atrasoMs:160/);
  assert.match(registro,/podeExibir:\(\)=>carregando&&autorizado\(\)&&ativo\(\)/);
  assert.match(registro,/carregando=true;falha='';indicador\.iniciar\(\);renderizar\(\)/);
  assert.match(registro,/carregando=false;indicador\.encerrar\(\);renderizar\(\)/);
  assert.match(registro,/function sairTela\(\)\{indicador\.encerrar\(\)/);
  assert.doesNotMatch(registro,/vazio\(lista,'Carregando cautelas'/);
  assert.match(registro,/total\.textContent='…';abertas\.textContent='…'/);
  assert.match(app,/registro-cautelas-ui\.js\?v=1\.13\.51-h\.1/);
  assert.match(css,/prefers-reduced-motion:reduce\)\{\.cm-loading-skeleton\{animation:none/);
  assert.match(sw,/\.\/js\/ui\/loading\.js/);
});

test('UX-05: PWA e HML com versão consistente',async()=>{
  const [html,sw,packageJson]=await Promise.all([ler('index.html'),ler('service-worker.js'),ler('package.json')]);
  assert.match(html,/v1\.13\.51-H\.1/);
  assert.match(html,/app\.css\?v=1\.13\.51-h\.1/);
  assert.match(sw,/v1\.13\.51-h\.1-ux05-skeleton/);
  assert.equal(JSON.parse(packageJson).version,'1.13.51-h.1');
});
