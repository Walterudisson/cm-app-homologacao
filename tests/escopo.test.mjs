import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { divisoesDisponiveis, escopoInicial } from '../js/core/escopo.js';

const catalogo = ['DA', 'DOS', 'DTT'];

test('Conferente com várias divisões escolhe antes de consultar e só restaura escolhas permitidas', () => {
  const usuario = { perfil: 'conferente', divisoesAtribuidas: ['DOS', 'DA', 'DA'] };
  assert.deepEqual(divisoesDisponiveis(usuario, catalogo), ['DA', 'DOS']);
  assert.equal(escopoInicial(usuario, catalogo), '');
  assert.equal(escopoInicial(usuario, catalogo, 'DTT'), '');
  assert.equal(escopoInicial(usuario, catalogo, 'DOS'), 'DOS');
  assert.equal(escopoInicial(usuario, catalogo, 'todas'), 'todas');
});

test('uma divisão é selecionada automaticamente; Gestor mantém visão geral e pode focar qualquer divisão', () => {
  const conferente = { perfil: 'conferente', divisoesAtribuidas: ['DA'] };
  const gestor = { perfil: 'gestor', divisoesAtribuidas: [] };
  assert.equal(escopoInicial(conferente, catalogo), 'DA');
  assert.equal(escopoInicial(conferente, catalogo, 'todas'), 'DA');
  assert.deepEqual(divisoesDisponiveis(gestor, catalogo), catalogo);
  assert.equal(escopoInicial(gestor, catalogo), 'todas');
  assert.equal(escopoInicial(gestor, catalogo, 'DTT'), 'DTT');
  assert.equal(escopoInicial(gestor, catalogo, 'inexistente'), 'todas');
});

test('a Relação usa o mesmo foco do Painel e bloqueia consulta sem escolha', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /const escopoDaConsulta = escopoVisualizacao;[\s\S]*?if \(!escopoDaConsulta\)/);
  assert.match(app, /const divisaoFiltro = escopoVisualizacao/);
  assert.match(app, /getCountFromServer\(query\(patrimoniosRef, filtroDivisao\)\)/);
  assert.match(app, /if \(revisaoDaConsulta !== revisaoEscopo\) return/);
  assert.doesNotMatch(app, /getElementById\('filtro-divisao'\)/);
});

test('a atualização do PWA inclui o módulo de escopo no shell v1.13.7-H.1', async () => {
  const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(worker, /const VERSAO = 'v1\.13\.7-homologacao-r2'/);
  assert.match(worker, /'\.\/js\/core\/escopo\.js'/);
});
