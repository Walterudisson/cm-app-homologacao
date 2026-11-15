import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { internalFile } from './internal-source.mjs';
import { criarInterfaceDsips } from '../js/modules/dsips/controller.js';
const require = createRequire(internalFile('functions/package.json'));
const { JSDOM } = require('jsdom');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const aguardar = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };

function ambiente(perfil = 'admin') {
  const dom = new JSDOM(html, { url: 'https://teste.invalid/' });
  const anterior = { document: globalThis.document, Option: globalThis.Option };
  globalThis.document = dom.window.document; globalThis.Option = dom.window.Option;
  const estado = {
    categorias: [{ id: 'cat', nome: 'Categoria', ativo: true }], locais: [{ id: 'local', nome: 'Depósito', ativo: true }], responsaveis: [],
    materiais: [{ id: 'm1', nome: 'Material identificado', categoriaId: 'cat', controle: 'individualizado', unidade: 'un', ativo: true, saldoInicialRegistrado: false }], estoque: []
  };
  const chamadas = [], avisos = [];
  const usuario = { uid: 'teste', perfil, modulos: ['dsips'] };
  const servicos = {
    listar: async tipo => structuredClone(estado[tipo]), listarEventos: async () => [], listarUnidades: async () => [],
    listarDivisoes: async () => ({ nomes: ['Divisão compartilhada'] }),
    salvar: async dados => {
      chamadas.push(dados); const tipo = { categoria: 'categorias', local: 'locais', responsavel: 'responsaveis', material: 'materiais' }[dados.tipo];
      estado[tipo].push({ id: dados.id, ...dados.dados }); return { id: dados.id };
    },
    saldoInicial: async dados => {
      chamadas.push(dados); estado.materiais[0].saldoInicialRegistrado = true;
      estado.estoque.push({ materialId: 'm1', localId: 'local', total: dados.quantidade, disponivel: dados.quantidade, emCautela: 0 });
    }
  };
  const ui = criarInterfaceDsips({ obterUsuario: () => usuario, servicos, confirmar: async () => true, notificar: (...args) => avisos.push(args) });
  const porId = id => dom.window.document.getElementById(id);
  const enviar = form => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  return { ui, usuario, servicos, estado, chamadas, avisos, porId, enviar, dom,
    fechar() { Object.assign(globalThis, anterior); dom.window.close(); } };
}

test('material usa categoria existente e renderiza nomes como texto, sem HTML executável', async () => {
  const f = ambiente();
  try {
    await f.ui.carregar('dsips-materiais');
    const form = f.porId('dsips-material-form');
    form.elements.nome.value = '<img src=x onerror=alert(1)>';
    form.elements.categoriaId.value = 'cat';
    f.enviar(form); await aguardar();
    assert.equal(f.chamadas.length, 1); assert.ok(f.chamadas[0].operacaoId);
    assert.equal(f.porId('dsips-material-list').querySelectorAll('img').length, 0);
    assert.match(f.porId('dsips-material-list').textContent, /<img src=x/);
  } finally { f.fechar(); }
});
test('cadastros DSIPS mantêm apenas categorias e locais, reaproveitando usuários nas cautelas', async () => {
  const f = ambiente(); try {
    await f.ui.carregar('dsips-cadastros');
    assert.deepEqual([...f.porId('dsips-catalog-type').options].map(item=>item.value),['categoria','local']);
    const form=f.porId('dsips-catalog-form');form.elements.nome.value='Nova categoria';f.enviar(form);await aguardar();
    assert.equal(f.chamadas[0].tipo,'categoria');assert.equal(f.chamadas[0].dados.nome,'Nova categoria');
  } finally { f.fechar(); }
});
test('saldo individualizado conta linhas, confirma e atualiza a posição de estoque', async () => {
  const f = ambiente();
  try {
    await f.ui.carregar('dsips-estoque'); const form = f.porId('dsips-saldo-form');
    form.elements.materialId.value = 'm1'; form.elements.materialId.dispatchEvent(new f.dom.window.Event('change'));
    form.elements.localId.value = 'local'; form.elements.identificadores.value = 'SER-1\nSER-2';
    form.elements.identificadores.dispatchEvent(new f.dom.window.Event('input'));
    assert.equal(form.elements.quantidade.value, '2'); assert.equal(form.elements.quantidade.readOnly, true);
    form.elements.motivo.value = 'Contagem de teste'; f.enviar(form); await aguardar();
    assert.deepEqual(f.chamadas[0].identificadores, ['SER-1', 'SER-2']);
    assert.match(f.porId('dsips-stock-list').textContent, /Total: 2/);
    assert.equal(form.elements.materialId.options.length, 1);
  } finally { f.fechar(); }
});
test('Conferente consulta sem formulários de gravação e evento forjado não chama função', async () => {
  const f = ambiente('conferente');
  try {
    await f.ui.carregar('dsips-materiais'); const form = f.porId('dsips-material-form');
    assert.ok(form.classList.contains('hidden'));
    f.enviar(form); await aguardar(); assert.equal(f.chamadas.length, 0);
  } finally { f.fechar(); }
});
test('repetição após falha de rede usa a mesma operação e não duplica cliques simultâneos', async () => {
  const f = ambiente();
  try {
    await f.ui.carregar('dsips-materiais'); const form = f.porId('dsips-material-form');
    form.elements.nome.value = 'Teste'; form.elements.categoriaId.value = 'cat';
    f.servicos.salvar = async dados => { f.chamadas.push(dados); throw new Error('Sem conexão'); };
    f.enviar(form); f.enviar(form); await aguardar();
    assert.equal(f.chamadas.length, 1); f.enviar(form); await aguardar();
    assert.equal(f.chamadas[0].operacaoId, f.chamadas[1].operacaoId);
  } finally { f.fechar(); }
});
test('resposta de outra sessão é descartada após logout e limpeza', async () => {
  const f = ambiente();
  try {
    const resolvedores = []; f.servicos.listar = () => new Promise(resolve => { resolvedores.push(resolve); });
    const carregamento = f.ui.carregar('dsips-materiais');
    f.ui.limpar(); f.usuario.uid = 'outro'; resolvedores.forEach(resolve => resolve([]));
    await carregamento;
    assert.equal(f.porId('dsips-material-list').children.length, 0);
  } finally { f.fechar(); }
});
