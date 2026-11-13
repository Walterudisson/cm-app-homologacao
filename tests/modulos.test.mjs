import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import {
  MODULOS, listarModulosAtivos, listarIdsPaginas, obterPagina,
  moduloDaPagina, podeAbrirPagina
} from '../js/platform/modules.js';
import { criarCarregadorPaginas } from '../js/platform/pages.js';
import { criarCarregadorPatrimonios } from '../js/modules/patrimonios/pages.js';

const admin = { perfil: 'admin' };
const gestor = { perfil: 'gestor' };
const conferente = { perfil: 'conferente' };

test('Patrimônios é o único módulo ativo; DSIPS planejado não tem rota', () => {
  assert.deepEqual(listarModulosAtivos().map(modulo => modulo.id), ['patrimonios']);
  assert.equal(MODULOS.dsips.estado, 'planejado');
  assert.equal(obterPagina('dsips'), null);
  assert.equal(podeAbrirPagina(admin, 'dsips'), false);
});

test('as cinco telas patrimoniais pertencem ao módulo e mantêm os IDs existentes', () => {
  const ids = ['dashboard', 'scanner', 'lista', 'inventarios', 'transferencias'];
  for (const id of ids) {
    assert.equal(moduloDaPagina(id).id, 'patrimonios');
    assert.equal(obterPagina(id).trilha[1], 'Patrimônios');
  }
  assert.equal(obterPagina('dashboard').exibeEscopo, true);
  assert.equal(obterPagina('lista').exibeEscopo, true);
  assert.equal(obterPagina('inventarios').exibeEscopo, undefined);
});

test('conta, usuários, divisões e funções pertencem à plataforma', () => {
  for (const id of ['perfil', 'usuarios', 'divisoes', 'funcoes']) {
    assert.ok(obterPagina(id));
    assert.equal(moduloDaPagina(id), null);
  }
});

test('a navegação rejeita IDs desconhecidos e nomes herdados de Object', () => {
  for (const id of ['inexistente', 'constructor', 'toString', '__proto__', '', undefined]) {
    assert.equal(obterPagina(id), null);
    assert.equal(podeAbrirPagina(admin, id), false);
  }
});

test('usuários ausentes, inativos e perfis desconhecidos não abrem páginas', () => {
  for (const usuario of [null, { perfil: 'admin', ativo: false }, { perfil: 'inexistente' }]) {
    for (const id of listarIdsPaginas()) assert.equal(podeAbrirPagina(usuario, id), false);
  }
});

test('os perfis mantêm acesso operacional e respeitam as restrições de gestão', () => {
  for (const id of ['dashboard', 'scanner', 'lista', 'inventarios', 'perfil']) {
    for (const usuario of [admin, gestor, conferente]) assert.equal(podeAbrirPagina(usuario, id), true);
  }
  for (const id of ['transferencias', 'usuarios', 'divisoes']) {
    assert.equal(podeAbrirPagina(admin, id), true);
    assert.equal(podeAbrirPagina(gestor, id), true);
    assert.equal(podeAbrirPagina(conferente, id), false);
  }
  assert.equal(podeAbrirPagina(admin, 'funcoes'), true);
  assert.equal(podeAbrirPagina(gestor, 'funcoes'), false);
});

test('o catálogo é imutável e cada tela possui uma seção única no HTML', async () => {
  assert.throws(() => { MODULOS.dsips.estado = 'ativo'; }, TypeError);
  assert.throws(() => { obterPagina('dashboard').trilha.push('alteração'); }, TypeError);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const ids = listarIdsPaginas();
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.equal(html.split(`id="sec-${id}"`).length - 1, 1);
});

function fixturePatrimonios(usuario = admin) {
  const chamadas = [];
  let ouvindo = false;
  const servicos = {
    obterUsuario: () => usuario,
    temOuvinteTransferencias: () => ouvindo,
    iniciarOuvinteTransferencias: () => { ouvindo = true; chamadas.push('ouvinte'); }
  };
  for (const nome of [
    'carregarDashboard', 'carregarCatalogoDivisoes', 'carregarRelacaoPatrimonial',
    'carregarProgressoInventarios', 'carregarHistoricoInventarios',
    'carregarHistoricoGeral', 'atualizarEstadoDivisaoInventario'
  ]) servicos[nome] = async () => { chamadas.push(nome); };
  return { chamadas, servicos, carregar: criarCarregadorPatrimonios(servicos) };
}

test('Painel, Leitura e Relação acionam apenas os respectivos serviços', async () => {
  const fixture = fixturePatrimonios();
  for (const pagina of ['dashboard', 'scanner', 'lista']) assert.equal(await fixture.carregar(pagina), true);
  assert.deepEqual(fixture.chamadas, ['carregarDashboard', 'carregarCatalogoDivisoes', 'carregarRelacaoPatrimonial']);
  assert.equal(await fixture.carregar('usuarios'), false);
});

test('reabrir a fila não duplica o ouvinte de transferências', async () => {
  const fixture = fixturePatrimonios();
  await fixture.carregar('transferencias');
  await fixture.carregar('transferencias');
  assert.deepEqual(fixture.chamadas, ['ouvinte']);
});

test('inventários carrega catálogo antes dos resumos e só então atualiza o ciclo', async () => {
  const fixture = fixturePatrimonios();
  await fixture.carregar('inventarios');
  assert.deepEqual(fixture.chamadas, [
    'carregarCatalogoDivisoes', 'carregarProgressoInventarios',
    'carregarHistoricoInventarios', 'carregarHistoricoGeral', 'atualizarEstadoDivisaoInventario'
  ]);
});

test('Conferente consulta inventários sem executar a atualização administrativa', async () => {
  const fixture = fixturePatrimonios(conferente);
  await fixture.carregar('inventarios');
  assert.ok(!fixture.chamadas.includes('atualizarEstadoDivisaoInventario'));
});

test('uma falha na consulta do inventário é propagada e não atualiza o ciclo', async () => {
  const fixture = fixturePatrimonios();
  fixture.servicos.carregarHistoricoGeral = async () => { throw new Error('sem conexão'); };
  await assert.rejects(fixture.carregar('inventarios'), /sem conexão/);
  assert.ok(!fixture.chamadas.includes('atualizarEstadoDivisaoInventario'));
});

test('a plataforma despacha páginas comuns e modulares sem misturar os carregadores', async () => {
  const chamadas = [];
  const carregar = criarCarregadorPaginas({
    obterUsuario: () => admin,
    modulos: { patrimonios: async id => { chamadas.push(`patrimonios:${id}`); return true; } },
    comuns: { perfil: async () => chamadas.push('conta:perfil') }
  });
  assert.equal(await carregar('dashboard'), true);
  assert.equal(await carregar('perfil'), true);
  assert.equal(await carregar('dsips'), false);
  assert.equal(await carregar('constructor'), false);
  assert.deepEqual(chamadas, ['patrimonios:dashboard', 'conta:perfil']);
});

test('a guarda é reavaliada por navegação e não consulta telas bloqueadas após logout', async () => {
  let usuario = admin;
  const chamadas = [];
  const carregar = criarCarregadorPaginas({
    obterUsuario: () => usuario,
    modulos: { patrimonios: async id => { chamadas.push(id); return true; } },
    comuns: { usuarios: async () => chamadas.push('usuarios') }
  });
  await carregar('usuarios');
  usuario = conferente;
  assert.equal(await carregar('usuarios'), false);
  usuario = null;
  assert.equal(await carregar('dashboard'), false);
  assert.deepEqual(chamadas, ['usuarios']);
});

test('todos os novos módulos fazem parte do shell PWA e seus imports locais existem', async () => {
  const raiz = new URL('../', import.meta.url);
  const worker = await readFile(new URL('service-worker.js', raiz), 'utf8');
  const novos = ['js/platform/modules.js', 'js/platform/pages.js',
    'js/modules/patrimonios/module.js', 'js/modules/patrimonios/pages.js'];
  for (const caminho of novos) {
    assert.ok(worker.includes(`'./${caminho}'`));
    const arquivo = new URL(caminho, raiz);
    const codigo = await readFile(arquivo, 'utf8');
    for (const [, importacao] of codigo.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      await access(new URL(importacao, arquivo));
    }
  }
});
