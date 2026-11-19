import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ICONES_CARDS_DSIPS, CORES_CARDS_DSIPS, visualMaterialDsips } from '../js/modules/dsips/consulta-materiais-model.js';
const ler = p => readFile(new URL('../'+p, import.meta.url),'utf8');

test('seis ícones distintos e quatro cores configuráveis têm mapa seguro', () => {
  assert.deepEqual(Object.keys(ICONES_CARDS_DSIPS),['caixa','escudo','radio','chave','maleta','colete']);
  assert.deepEqual(CORES_CARDS_DSIPS,['azul','verde','roxo','ambar']);
  const desenhos = Object.values(ICONES_CARDS_DSIPS).map(paths => paths.join(' | '));
  assert.equal(new Set(desenhos).size,6);
  assert.ok(Object.values(ICONES_CARDS_DSIPS).every(paths => paths.length > 0 && paths.every(d => typeof d==='string' && d.length > 5)));
});
test('valores salvos são aplicados; materiais antigos ou dados inesperados recebem padrão', () => {
  for(const cor of CORES_CARDS_DSIPS) for(const icone of Object.keys(ICONES_CARDS_DSIPS)) {
    assert.deepEqual(visualMaterialDsips({icone,cor}),{icone,cor});
  }
  assert.deepEqual(visualMaterialDsips({}),{icone:'caixa',cor:'azul'});
  assert.deepEqual(visualMaterialDsips({icone:'<svg onload=alert(1)>',cor:'vermelho; color:red'}),{icone:'caixa',cor:'azul'});
  assert.deepEqual(visualMaterialDsips(null),{icone:'caixa',cor:'azul'});
});
test('cards realmente usam ícone e cor do material no controlador',async()=>{
  const [ui,css,app,html,sw] = await Promise.all([
    ler('js/modules/dsips/consulta-materiais-ui.js'),ler('app.css'),
    ler('app.js'),ler('index.html'),ler('service-worker.js')
  ]);
  assert.match(ui,/const visual = visualMaterialDsips\(material\)/);
  assert.match(ui,/dsips-material-card dsips-cor-' \+ visual\.cor/);
  assert.match(ui,/simbolo\.append\(iconeDoMaterial\(visual\.icone\)\)/);
  assert.match(ui,/document\.createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'path'\)/);
  assert.doesNotMatch(ui,/dsips-material-symbol', '▣'/);
  for(const cor of CORES_CARDS_DSIPS) assert.ok(css.includes('.dsips-material-card.dsips-cor-'+cor));
  assert.match(app,/consulta-materiais-ui\.js\?v=1\.13\.23-h\.1/);
  assert.match(html,/app\.css\?v=1\.13\.28-h\.1/);
  assert.match(sw,/v1\.13\.28-h\.1-ux-timeline/);
});
