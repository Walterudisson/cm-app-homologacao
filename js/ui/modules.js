import { MODULOS, modulosDoUsuario, moduloDaPagina, podeAbrirPagina } from '../platform/modules.js';

export function criarInterfaceModulos({ obterUsuario, navegar, carregarUsuarios, salvarAcessos, confirmar, notificar }) {
  let moduloAtual = null;
  let paginaAtual = null;
  let usuarios = [];
  let carregando = false;

  function sincronizar(pagina) {
    paginaAtual = pagina;
    const modulo = moduloDaPagina(pagina);
    if (modulo) moduloAtual = modulo.id;
    if (pagina === 'modulos') moduloAtual = null;
    document.getElementById('sidebar-module-name').textContent = MODULOS[moduloAtual]?.nome || 'Plataforma';
    document.getElementById('footer-module-name').textContent = moduloAtual ? `CM APP · ${MODULOS[moduloAtual].nome}` : 'CM APP';
    document.querySelectorAll('[data-nav-page]').forEach(botao => {
      const id = botao.dataset.navPage;
      const dono = moduloDaPagina(id);
      const oculto = !podeAbrirPagina(obterUsuario(), id) || (dono && dono.id !== moduloAtual);
      botao.classList.toggle('module-hidden', Boolean(oculto));
    });
    document.querySelectorAll('[data-module-context]').forEach(elemento => {
      elemento.classList.toggle('module-hidden', elemento.dataset.moduleContext !== moduloAtual
        || !modulosDoUsuario(obterUsuario()).some(item => item.id === moduloAtual));
    });
  }

  function renderizar() {
    const usuario = obterUsuario();
    const modulos = modulosDoUsuario(usuario);
    const container = document.getElementById('module-cards');
    container.replaceChildren();
    document.getElementById('module-empty').classList.toggle('hidden', modulos.length > 0);
    for (const modulo of modulos) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'module-card';
      const nome = document.createElement('strong'); nome.textContent = modulo.nome;
      const descricao = document.createElement('span');
      descricao.textContent = modulo.id === 'patrimonios' ? 'Inventários, conferências e movimentações' : 'Materiais e cautelas';
      const estado = document.createElement('small'); estado.textContent = modulo.emPreparacao ? 'Em preparação · Abrir módulo →' : 'Abrir módulo →';
      botao.append(nome, descricao, estado);
      botao.addEventListener('click', () => navegar(modulo.paginaInicial));
      container.appendChild(botao);
    }
    document.getElementById('module-access-panel').classList.toggle('hidden', usuario?.perfil !== 'admin');
  }

  async function carregar() {
    renderizar();
    if (obterUsuario()?.perfil !== 'admin' || carregando) return;
    carregando = true;
    const uid = obterUsuario()?.uid;
    try {
      const lista = await carregarUsuarios();
      // Uma resposta de outra sessão não pode popular o formulário administrativo.
      if (paginaAtual !== 'modulos' || obterUsuario()?.perfil !== 'admin' || obterUsuario()?.uid !== uid) return;
      usuarios = lista.filter(item => item.perfil !== 'admin' && item.ativo !== false);
      const seletor = document.getElementById('module-access-user');
      seletor.replaceChildren(new Option('Selecione um usuário', ''));
      for (const item of usuarios) seletor.add(new Option(`${item.nome} · ${item.email || item.uid}`, item.uid));
      preencherAcessos();
    } finally { carregando = false; }
  }

  function preencherAcessos() {
    const usuario = usuarios.find(item => item.uid === document.getElementById('module-access-user').value);
    const permitidos = modulosDoUsuario(usuario).map(item => item.id);
    document.querySelectorAll('[data-module-grant]').forEach(campo => {
      campo.checked = permitidos.includes(campo.value);
      campo.disabled = !usuario;
    });
    document.getElementById('module-access-save').disabled = !usuario;
  }

  document.getElementById('module-access-user').addEventListener('change', preencherAcessos);
  document.getElementById('module-access-form').addEventListener('submit', async evento => {
    evento.preventDefault();
    if (obterUsuario()?.perfil !== 'admin') return;
    const alvo = usuarios.find(item => item.uid === document.getElementById('module-access-user').value);
    if (!alvo) return;
    const modulos = [...document.querySelectorAll('[data-module-grant]:checked')].map(campo => campo.value);
    const aceitou = await confirmar({ titulo: 'Alterar acesso aos módulos?', mensagem: `${alvo.nome}: ${modulos.map(id => MODULOS[id].nome).join(', ') || 'sem módulos operacionais'}.`, confirmarTexto: 'Salvar acessos' });
    if (!aceitou) return;
    const botao = document.getElementById('module-access-save'); botao.disabled = true;
    try {
      await salvarAcessos({ uid: alvo.uid, modulos });
      alvo.modulos = modulos;
      notificar('Acesso aos módulos atualizado.', 'sucesso');
    } catch (erro) {
      notificar(erro?.message || 'Não foi possível atualizar os acessos.', 'erro');
    } finally { preencherAcessos(); }
  });

  return { carregar, sincronizar, limpar() {
    moduloAtual = null; paginaAtual = null; usuarios = [];
    document.getElementById('module-cards').replaceChildren();
    document.getElementById('module-access-user').replaceChildren();
    preencherAcessos();
    document.querySelectorAll('[data-nav-page], [data-module-context]').forEach(item => item.classList.add('module-hidden'));
  } };
}
