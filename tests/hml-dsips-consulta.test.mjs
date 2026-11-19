import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { podeConsultarMateriaisDsips, filtrarMateriaisDsips } from '../js/modules/dsips/consulta-materiais-model.js';

test('perfil e módulo decidem visibilidade sem concessão implícita para gestores', () => {
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'admin', ativo: true }), true);
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'gestor', ativo: true, modulos: ['dsips'] }), true);
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'conferente', ativo: true, modulos: ['dsips'] }), true);
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'gestor', ativo: true }), false);
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'gestor', ativo: true, modulos: ['patrimonios'] }), false);
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'usuario', ativo: true, modulos: ['dsips'] }), false);
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'admin', ativo: false }), false);
  assert.equal(podeConsultarMateriaisDsips({ perfil: 'admin', ativo: true, autorizacaoVersao: 2 }), false);
  assert.equal(podeConsultarMateriaisDsips(null), false);
});
test('busca ignora acentos e categoria, sem alterar os materiais originais', () => {
  const itens = [
    { id: 'a', nome: 'Rádio portátil', categoriaId: 'radio' },
    { id: 'b', nome: 'Lanterna', categoriaId: 'luz' },
    { id: 'c', nome: 'Rádio estação', categoriaId: 'radio' }
  ];
  assert.deepEqual(filtrarMateriaisDsips(itens, 'RADIO', 'radio').map(i => i.id), ['c', 'a']);
  assert.deepEqual(filtrarMateriaisDsips(itens, '', 'luz').map(i => i.id), ['b']);
  assert.equal(filtrarMateriaisDsips(itens, 'inexistente').length, 0);
  assert.equal(itens[0].id, 'a');
});
test('HML tem tela e menu dentro do login e layout existentes', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const navigation = await readFile(new URL('../js/ui/navigation.js', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  const fb = await readFile(new URL('../js/config/firebase.js', import.meta.url), 'utf8');
  assert.match(html, /id="view-login"/);
  assert.match(html, /id="sec-dsips-materiais"/);
  assert.match(html, /data-nav-page="dsips-materiais"/);
  assert.match(html, /Verificando acesso…/);
  assert.doesNotMatch(html, /id="pilot-login"/);
  assert.match(app, /consultaMateriaisDsips\.carregar\(\)/);
  assert.match(app, /!podeConsultarMateriaisDsips\(usuarioLogado\)/);
  assert.match(navigation, /'dsips-materiais':/);
  assert.match(worker, /v1\.13\.28-h\.1-ux-timeline/);
  assert.match(fb, /projectId: "cm-app-homologacao"/);
  assert.doesNotMatch(fb, /projectId: "patrimonioscm"/);
});
