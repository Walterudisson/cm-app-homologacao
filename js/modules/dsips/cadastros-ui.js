import { listarCadastroDsips, salvarCadastroDsips } from './service.js?v=1.13.14-h.1';
import {
  TIPOS_CADASTRO_DSIPS,
  filtrarCadastrosDsips,
  podeConsultarCadastrosDsips,
  podeGerenciarCadastrosDsips,
  prepararCadastroDsips
} from './cadastros-model.js?v=1.13.14-h.1';

export function criarCadastrosDsips({ obterUsuario, notificar = () => {} }) {
  const porId = id => document.getElementById(id);
  const lista = porId('dsips-cadastros-list');
  const status = porId('dsips-cadastros-status');
  const busca = porId('dsips-cadastros-search');
  const atualizarBotao = porId('dsips-cadastros-refresh');
  const novoBotao = porId('dsips-cadastros-new');
  const modo = porId('dsips-cadastros-mode');
  const total = porId('dsips-cadastros-total');
  const ativos = porId('dsips-cadastros-active');
  const rotuloLista = porId('dsips-cadastros-list-label');
  const editor = porId('dsips-cadastros-editor');
  const formulario = porId('dsips-cadastros-form');
  const tituloEditor = porId('dsips-cadastros-editor-title');
  const statusEditor = porId('dsips-cadastros-editor-status');
  const cancelarBotao = porId('dsips-cadastros-cancel');
  const salvarBotao = porId('dsips-cadastros-save');
  const tabs = [...document.querySelectorAll('[data-dsips-cadastro-tipo]')];
  const nomeCampo = formulario.elements.namedItem('nome');
  const ativoCampo = formulario.elements.namedItem('ativo');

  let tipo = 'categoria';
  let dados = { categoria: [], local: [] };
  let pronto = false;
  let carregando = false;
  let falha = '';
  let revisao = 0;
  let sessao = 0;
  let gravando = false;
  let idRascunho = '';
  let pendente = null;

  const autorizado = () => podeConsultarCadastrosDsips(obterUsuario());
  const podeGravar = () => podeGerenciarCadastrosDsips(obterUsuario());
  const registrosAtuais = () => dados[tipo] || [];
  const informacaoTipo = () => TIPOS_CADASTRO_DSIPS[tipo];

  function elemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = String(texto ?? '');
    return el;
  }
  function estadoVazio(titulo, descricao) {
    const card = elemento('div', 'app-card dsips-empty');
    card.append(elemento('strong', '', titulo), elemento('p', '', descricao));
    lista.append(card);
  }
  function fecharEditor() {
    formulario.reset();
    editor.classList.add('hidden');
    tituloEditor.textContent = '';
    statusEditor.textContent = '';
    idRascunho = '';
    pendente = null;
  }
  function abrirEditor(item = null) {
    if (!podeGravar() || !pronto || carregando || gravando) return;
    fecharEditor();
    idRascunho = item?.id || crypto.randomUUID();
    nomeCampo.value = item?.nome || '';
    ativoCampo.checked = item?.ativo !== false;
    tituloEditor.textContent = (item ? 'Editar ' : tipo === 'categoria' ? 'Nova ' : 'Novo ') + informacaoTipo().singular;
    editor.classList.remove('hidden');
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nomeCampo.focus({ preventScroll: true });
  }
  function mudarTipo(novoTipo) {
    if (!Object.hasOwn(TIPOS_CADASTRO_DSIPS, novoTipo) || novoTipo === tipo || gravando) return;
    fecharEditor();
    tipo = novoTipo;
    busca.value = '';
    renderizar();
  }
  function renderizar() {
    const info = informacaoTipo();
    const podeEscrever = podeGravar();
    tabs.forEach(tab => {
      const selecionada = tab.dataset.dsipsCadastroTipo === tipo;
      tab.classList.toggle('is-selected', selecionada);
      tab.setAttribute('aria-pressed', String(selecionada));
      tab.disabled = gravando;
    });
    rotuloLista.textContent = info.titulo;
    novoBotao.textContent = '+ Novo cadastro';
    novoBotao.classList.toggle('hidden', !podeEscrever);
    novoBotao.disabled = carregando || gravando || !pronto;
    modo.textContent = podeEscrever ? 'Consulta e cadastro' : 'Somente consulta';
    atualizarBotao.disabled = carregando || gravando;
    lista.replaceChildren();
    lista.setAttribute('aria-busy', String(carregando));

    if (!podeEscrever && !editor.classList.contains('hidden')) fecharEditor();
    if (!autorizado()) {
      status.textContent = 'Acesso não autorizado.';
      total.textContent = '0';
      ativos.textContent = '0';
      return;
    }
    const registros = registrosAtuais();
    total.textContent = String(registros.length);
    ativos.textContent = String(registros.filter(item => item.ativo !== false).length);
    if (carregando) {
      status.textContent = 'Consultando os cadastros do HML…';
      estadoVazio('Carregando ' + info.titulo.toLowerCase(), 'Aguarde a consulta ao DSIPS.');
      return;
    }
    if (falha) {
      status.textContent = falha;
      estadoVazio('Consulta indisponível', 'Confira seu acesso e tente Atualizar novamente.');
      return;
    }
    if (!pronto) {
      status.textContent = 'Abra Cadastros para consultar os registros.';
      return;
    }
    const filtrados = filtrarCadastrosDsips(registros, busca.value);
    status.textContent = String(filtrados.length) + ' de ' + String(registros.length) + ' registros encontrados.';
    if (!filtrados.length) {
      estadoVazio(registros.length ? 'Nenhum resultado para esta busca' : 'Nenhum cadastro encontrado',
        registros.length ? 'Experimente outro termo de pesquisa.' : 'Ainda não há registros nesta categoria de cadastros.');
      return;
    }
    for (const item of filtrados) {
      const card = elemento('article', 'dsips-cadastros-card');
      const identidade = elemento('div', 'dsips-cadastros-identity');
      const simbolo = elemento('span', 'dsips-cadastros-symbol', tipo === 'categoria' ? '▦' : '⌂');
      simbolo.setAttribute('aria-hidden', 'true');
      const texto = elemento('div', 'dsips-cadastros-card-copy');
      texto.append(elemento('h3', '', item.nome || 'Cadastro sem nome'),
        elemento('p', '', tipo === 'categoria' ? 'Categoria de material' : 'Local de armazenamento'));
      identidade.append(simbolo, texto);
      const rodape = elemento('div', 'dsips-cadastros-card-footer');
      const situacao = elemento('span', item.ativo === false ? 'dsips-status-inactive' : 'dsips-status-active',
        item.ativo === false ? 'Inativo' : 'Ativo');
      rodape.append(situacao);
      if (podeEscrever) {
        const editar = elemento('button', 'app-button app-button-secondary', 'Editar');
        editar.type = 'button';
        editar.setAttribute('aria-label', 'Editar ' + (item.nome || 'cadastro'));
        editar.addEventListener('click', () => abrirEditor(item));
        rodape.append(editar);
      }
      card.append(identidade, rodape);
      lista.append(card);
    }
  }
  function limpar() {
    revisao++;
    sessao++;
    gravando = false;
    carregando = false;
    pronto = false;
    falha = '';
    dados = { categoria: [], local: [] };
    tipo = 'categoria';
    busca.value = '';
    fecharEditor();
    salvarBotao.disabled = false;
    cancelarBotao.disabled = false;
    renderizar();
  }
  async function carregar() {
    if (!autorizado()) { limpar(); return; }
    const atual = ++revisao;
    const uid = obterUsuario()?.uid;
    carregando = true;
    falha = '';
    renderizar();
    try {
      const [categorias, locais] = await Promise.all([
        listarCadastroDsips('categorias'),
        listarCadastroDsips('locais')
      ]);
      if (atual !== revisao || uid !== obterUsuario()?.uid || !autorizado()) return;
      dados = {
        categoria: Array.isArray(categorias) ? categorias : [],
        local: Array.isArray(locais) ? locais : []
      };
      pronto = true;
    } catch (erro) {
      if (atual !== revisao || uid !== obterUsuario()?.uid || !autorizado()) return;
      console.warn('Falha ao consultar cadastros DSIPS.', erro);
      pronto = false;
      const semAcesso = ['permission-denied', 'functions/permission-denied'].includes(erro?.code);
      falha = semAcesso
        ? 'Sem permissão para consultar os cadastros DSIPS.'
        : 'Falha ao consultar categorias e locais. Use Atualizar para tentar novamente.';
    } finally {
      if (atual === revisao) {
        carregando = false;
        renderizar();
      }
    }
  }
  async function salvar(evento) {
    evento.preventDefault();
    if (!podeGravar() || !pronto || gravando || editor.classList.contains('hidden')) return;
    if (!formulario.reportValidity()) return;
    let payload;
    try {
      payload = prepararCadastroDsips(
        { nome: nomeCampo.value, ativo: ativoCampo.checked },
        { tipo, id: idRascunho, existentes: registrosAtuais() }
      );
    } catch (erro) {
      statusEditor.textContent = erro.message;
      return;
    }
    const assinatura = JSON.stringify(payload);
    if (!pendente || pendente.assinatura !== assinatura) {
      pendente = { assinatura, operacaoId: crypto.randomUUID() };
    }
    const operacaoId = pendente.operacaoId;
    const uid = obterUsuario()?.uid;
    const epoca = sessao;
    gravando = true;
    salvarBotao.disabled = true;
    cancelarBotao.disabled = true;
    tabs.forEach(tab => { tab.disabled = true; });
    atualizarBotao.disabled = true;
    statusEditor.textContent = 'Salvando cadastro no HML…';
    try {
      await salvarCadastroDsips({ ...payload, operacaoId });
      if (epoca !== sessao || uid !== obterUsuario()?.uid || !podeGravar()) return;
      fecharEditor();
      notificar('Cadastro salvo com sucesso no HML.', 'sucesso');
      await carregar();
    } catch (erro) {
      if (epoca !== sessao || uid !== obterUsuario()?.uid || !podeGravar()) return;
      console.warn('Falha ao salvar cadastro DSIPS.', erro);
      const semAcesso = ['permission-denied', 'functions/permission-denied'].includes(erro?.code);
      statusEditor.textContent = semAcesso
        ? 'Sem permissão para salvar. Solicite revisão de acesso.'
        : 'Não foi possível salvar. Confira os dados e tente novamente.';
      notificar(semAcesso ? 'Operação não autorizada no DSIPS.' : 'Falha ao salvar cadastro.', 'erro');
    } finally {
      if (epoca === sessao) {
        gravando = false;
        salvarBotao.disabled = false;
        cancelarBotao.disabled = false;
        renderizar();
      }
    }
  }
  tabs.forEach(tab => tab.addEventListener('click', () => mudarTipo(tab.dataset.dsipsCadastroTipo)));
  novoBotao.addEventListener('click', () => abrirEditor());
  cancelarBotao.addEventListener('click', fecharEditor);
  formulario.addEventListener('submit', evento => { void salvar(evento); });
  busca.addEventListener('input', renderizar);
  atualizarBotao.addEventListener('click', carregar);
  limpar();
  return { carregar, limpar };
}
