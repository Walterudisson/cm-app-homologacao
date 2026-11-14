import test from 'node:test';
import assert from 'node:assert/strict';
import { criarInterfaceModulos } from '../js/ui/modules.js';

class NodeFake {
  constructor() {
    this.children = []; this.listeners = {}; this.dataset = {}; this.classes = new Set();
    this.classList = { add: nome => this.classes.add(nome), toggle: (nome, ativa) => ativa ? this.classes.add(nome) : this.classes.delete(nome) };
  }
  replaceChildren(...itens) { this.children = itens; }
  append(...itens) { this.children.push(...itens); }
  appendChild(item) { this.children.push(item); }
  add(item) { this.children.push(item); }
  addEventListener(nome, fn) { this.listeners[nome] = fn; }
}

function ambiente(usuario) {
  const ids = Object.fromEntries(['sidebar-module-name','footer-module-name','module-cards','module-empty','module-access-panel',
    'module-access-user','module-access-save','module-access-form'].map(id => [id, new NodeFake()]));
  const botoes = ['modulos','dashboard','scanner','lista','usuarios','dsips-inicio'].map(id => {
    const node = new NodeFake(); node.dataset.navPage = id; return node;
  });
  const grupos = ['patrimonios', 'dsips'].map(id => { const node = new NodeFake(); node.dataset.moduleContext = id; return node; });
  const campos = ['patrimonios','dsips'].map(id => { const node = new NodeFake(); node.value = id; return node; });
  const original = globalThis.document;
  globalThis.document = {
    getElementById: id => ids[id], createElement: () => new NodeFake(),
    querySelectorAll: seletor => seletor === '[data-nav-page]' ? botoes
      : seletor === '[data-module-context]' ? grupos
      : seletor === '[data-module-grant]' ? campos
      : seletor === '[data-module-grant]:checked' ? campos.filter(item => item.checked)
      : [...botoes, ...grupos]
  };
  const destinos = [];
  const ui = criarInterfaceModulos({ obterUsuario: () => usuario, navegar: id => destinos.push(id),
    carregarUsuarios: async () => [], salvarAcessos: async () => {}, confirmar: async () => true, notificar: () => {} });
  return { ui, ids, botoes, grupos, destinos, restaurar: () => { globalThis.document = original; } };
}

test('trocar módulo altera nome e contexto, mantendo administração comum', () => {
  const f = ambiente({ perfil: 'admin' });
  try {
    f.ui.sincronizar('dsips-inicio');
    assert.equal(f.ids['sidebar-module-name'].textContent, 'DSIPS');
    assert.ok(f.botoes.find(item => item.dataset.navPage === 'dashboard').classes.has('module-hidden'));
    assert.ok(!f.botoes.find(item => item.dataset.navPage === 'usuarios').classes.has('module-hidden'));
    f.ui.sincronizar('perfil');
    assert.equal(f.ids['sidebar-module-name'].textContent, 'DSIPS');
    f.ui.sincronizar('dashboard');
    assert.equal(f.ids['sidebar-module-name'].textContent, 'Patrimônios');
    assert.ok(f.botoes.find(item => item.dataset.navPage === 'dsips-inicio').classes.has('module-hidden'));
  } finally { f.restaurar(); }
});

test('seleção apresenta apenas módulos permitidos e o card abre o destino correto', async () => {
  const f = ambiente({ perfil: 'gestor', modulos: ['dsips'] });
  try {
    f.ui.sincronizar('modulos'); await f.ui.carregar();
    const cards = f.ids['module-cards'].children;
    assert.equal(cards.length, 1);
    assert.equal(cards[0].children[0].textContent, 'DSIPS');
    assert.match(cards[0].children[2].textContent, /Em preparação/);
    cards[0].listeners.click();
    assert.deepEqual(f.destinos, ['dsips-inicio']);
    assert.ok(f.ids['module-access-panel'].classes.has('hidden'));
  } finally { f.restaurar(); }
});

test('sem atribuição exibe orientação e não apresenta cards operacionais', async () => {
  const f = ambiente({ perfil: 'conferente', modulos: [] });
  try {
    await f.ui.carregar();
    assert.equal(f.ids['module-cards'].children.length, 0);
    assert.ok(!f.ids['module-empty'].classes.has('hidden'));
    f.ui.limpar();
    assert.ok(f.botoes.every(item => item.classes.has('module-hidden')));
    assert.equal(f.ids['module-access-save'].disabled, true);
  } finally { f.restaurar(); }
});
