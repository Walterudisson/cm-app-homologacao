import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { identificadoresDoTexto, filtrarPorNome, resumoDsips, podeGerenciarDsips } from '../js/modules/dsips/model.js';
import { obterPagina, podeAbrirPagina } from '../js/platform/modules.js';

test('DSIPS separa quantidade e identificações individuais, preservando entradas para validação no servidor', () => {
  assert.deepEqual(identificadoresDoTexto('  A1\r\n\n B2 \nA1'), ['A1', 'B2', 'A1']);
  assert.deepEqual(identificadoresDoTexto(''), []);
});
test('resumo conta materiais ativos, materiais com estoque e saldos ainda não registrados', () => {
  assert.deepEqual(resumoDsips({ materiais: [
    { ativo: true, saldoInicialRegistrado: true }, { ativo: true }, { ativo: false }
  ], estoque: [{ total: 50 }, { total: 0 }], responsaveis: [{ ativo: true }, { ativo: false }] }),
  { materiais: 2, comSaldo: 1, semSaldo: 1, responsaveis: 1, cautelas: 0 });
});
test('busca por nome, matrícula e setor ignora acentos sem alterar os registros', () => {
  const pessoas = [{ nome: 'João Teste', matricula: '123', setor: 'Divisão A' }, { nome: 'Maria', matricula: '456' }];
  assert.equal(filtrarPorNome(pessoas, 'joao')[0], pessoas[0]);
  assert.equal(filtrarPorNome(pessoas, '456')[0], pessoas[1]);
  assert.equal(filtrarPorNome(pessoas, 'divisao').length, 1);
});
test('Administrador e Gestor DSIPS gerenciam; Conferente consulta sem gravar ou abrir auditoria', () => {
  assert.equal(podeGerenciarDsips({ perfil: 'admin' }), true);
  assert.equal(podeGerenciarDsips({ perfil: 'gestor', modulos: ['dsips'] }), true);
  assert.equal(podeGerenciarDsips({ perfil: 'gestor' }), false);
  assert.equal(podeGerenciarDsips({ perfil: 'conferente', modulos: ['dsips'] }), false);
  assert.equal(podeAbrirPagina({ perfil: 'conferente', modulos: ['dsips'] }, 'dsips-historico'), false);
});
test('cada tela DSIPS possui seção, menu e arquivos no PWA', async () => {
  const [html, worker] = await Promise.all(['index.html', 'service-worker.js'].map(nome => readFile(new URL('../'+nome, import.meta.url), 'utf8')));
  for (const id of ['dsips-inicio','dsips-materiais','dsips-cadastros','dsips-estoque','dsips-historico']) {
    assert.ok(obterPagina(id)); assert.ok(html.includes(`id="sec-${id}"`)); assert.ok(html.includes(`data-nav-page="${id}"`));
  }
  for (const arquivo of ['model.js', 'controller.js', 'service.js']) assert.ok(worker.includes(`./js/modules/dsips/${arquivo}`));
});
