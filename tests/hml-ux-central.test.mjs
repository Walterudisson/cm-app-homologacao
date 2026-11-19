import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {destinosCentral,podeAbrirCentral} from '../js/ui/central-trabalho.js';
test('Central apresenta apenas módulos autorizados, sem módulos futuros',()=>{
  const ids=u=>destinosCentral(u).map(m=>m.id);
  assert.deepEqual(ids({perfil:'admin',ativo:true}),['patrimonios','dsips']);
  assert.deepEqual(ids({perfil:'gestor',ativo:true,modulos:['dsips']}),['dsips']);
  assert.deepEqual(ids({perfil:'conferente',ativo:true}),['patrimonios']);
  assert.deepEqual(ids({perfil:'gestor',ativo:true,modulos:['rh']}),[]);
  for(const u of [null,{perfil:'usuario',modulos:['dsips']},{perfil:'admin',ativo:false},{perfil:'admin',autorizacaoVersao:2}])assert.equal(podeAbrirCentral(u),false);
});
test('Central preserva rotas operacionais e não inventa métricas',()=>{
  assert.deepEqual(destinosCentral({perfil:'admin'}).map(m=>m.destino),['dashboard','dsips-cautelas']);
});
test('Central integra shell, navegação, versão e PWA',async()=>{
  const [html,app,css,sw,nav]=await Promise.all(['index.html','app.js','app.css','service-worker.js','js/ui/navigation.js'].map(p=>readFile(new URL('../'+p,import.meta.url),'utf8')));
  assert.match(html,/id="sec-modulos"/);assert.match(html,/id="tab-btn-modulos"/);
  assert.match(app,/renderizarCentral/);assert.match(app,/abaAtiva === 'modulos' && !podeAbrirCentral/);
  assert.match(css,/\.cm-ux-module-grid/);assert.match(css,/prefers-reduced-motion/);
  assert.match(sw,/central-trabalho\.js/);assert.match(nav,/modulos: \{ titulo: 'Central de Trabalho'/);
});
