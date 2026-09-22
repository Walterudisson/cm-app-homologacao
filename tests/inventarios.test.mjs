import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, html, service] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../js/services/inventarios.service.js', import.meta.url), 'utf8')
]);

test('o encerramento guarda a fotografia antes de liberar o estado encerrado', () => {
  assert.ok(service.indexOf('const conferencia = await getDocsFromServer')
    < service.indexOf("transacao.update(ref, { estado: 'encerrado'"));
  assert.match(service, /conferencia\.size !== itens\.length/);
  assert.match(service, /const fechamentoId = await iniciarEncerramento/);
});

test('reabertura registra motivo, e reinício exige consolidação geral', () => {
  assert.match(html, /id="motivo-reabertura-divisao"/);
  assert.match(service, /transacao\.set\(doc\(ref, 'eventos', eventoId\), evento\)/);
  assert.match(service, /if \(!geral\.exists\(\)\) throw new Error\('Encerre o inventário geral/);
  assert.match(app, /encerrarInventarioGeral\(divisoes, usuarioLogado\)/);
});
