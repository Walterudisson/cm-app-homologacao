import {criarPaginadorLocal} from '../../ui/paginador.js?v=1.13.33-h.1';
import {adaptarSelectAutocomplete} from '../../ui/autocomplete.js?v=1.13.32-h.1';
import {podeConsultarHistoricoDsips} from './historico-model.js?v=1.13.29-h.1';
import { listarCadastroDsips, salvarCadastroDsips } from './service.js?v=1.13.13-h.3';
import {
  filtrarMateriaisDsips, podeConsultarMateriaisDsips,
  podeGerenciarMateriaisDsips, prepararCadastroMaterialDsips,
  visualMaterialDsips, ICONES_CARDS_DSIPS
} from './consulta-materiais-model.js?v=1.13.13-h.3';

export function criarConsultaMateriaisDsips({ obterUsuario, notificar = () => {} , abrirHistorico=()=>{}}) {
  const porId = id => document.getElementById(id);
  const lista = porId('dsips-material-list');
  const paginador=criarPaginadorLocal({lista,tamanho:24,renderizar,podeNavegar:()=>autorizado()&&!gravando,rotulo:'Páginas de materiais'});
  const estado = porId('dsips-material-status');
  const busca = porId('dsips-material-search');
  const categoria = porId('dsips-material-category');
  const atualizarBotao = porId('dsips-material-refresh');
  const total = porId('dsips-material-total');
  const ativos = porId('dsips-material-active');
  const novoBotao = porId('dsips-material-new');
  const modo = porId('dsips-material-mode');
  const editor = porId('dsips-material-editor');
  const formulario = porId('dsips-material-form');
  const editarTitulo = porId('dsips-material-editor-title');
  const editarStatus = porId('dsips-material-editor-status');
  const cancelarBotao = porId('dsips-material-cancel');
  const salvarBotao = porId('dsips-material-save');
  const campo = nome => formulario.elements.namedItem(nome);
  const comboCategoria=adaptarSelectAutocomplete(campo('categoriaId'),{id:'dsips-material-categoria-combo',rotulo:'Categoria',placeholder:'Pesquisar categoria'});
  let versao = 0;
  let materiais = [];
  let categorias = [];
  let pronto = false;
  let carregando = false;
  let falha = '';
  let gravando = false;
  let materialEditando = null;
  let rascunhoId = '';
  let pendente = null;

  const autorizado = () => podeConsultarMateriaisDsips(obterUsuario());
  const podeGravar = () => podeGerenciarMateriaisDsips(obterUsuario());
  function elemento(tag, classe, conteudo) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (conteudo !== undefined) el.textContent = String(conteudo ?? '');
    return el;
  }
  function iconeDoMaterial(nome) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [atributo, valor] of Object.entries({
      viewBox: '0 0 24 24', width: '23', height: '23', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
    })) svg.setAttribute(atributo, valor);
    for (const d of ICONES_CARDS_DSIPS[nome]) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }
  function vazio(titulo, detalhe) {
    const card = elemento('div', 'dsips-empty app-card');
    card.append(elemento('strong', '', titulo), elemento('p', '', detalhe));
    lista.append(card);
  }
  function fecharEditor() {
    editor.classList.add('hidden');
    formulario.reset();comboCategoria.sincronizar();
    campo('controle').disabled = false;
    campo('unidade').disabled = false;
    materialEditando = null;
    rascunhoId = '';
    pendente = null;
    editarStatus.textContent = '';
  }
  function preencherCategoriasEditor() {
    const atual = campo('categoriaId').value;
    const seletor = campo('categoriaId');
    seletor.replaceChildren(new Option('Selecione uma categoria', ''));
    for (const item of categorias.filter(item => item.ativo !== false)) {
      seletor.add(new Option(item.nome || 'Categoria sem nome', item.id));
    }
    if (categorias.some(item => item.id === atual && item.ativo !== false)) seletor.value = atual;
    comboCategoria.sincronizar();
  }
  function abrirEditor(material = null) {
    if (!podeGravar() || carregando || gravando || !pronto) return;
    fecharEditor();
    materialEditando = material;
    rascunhoId = material?.id || crypto.randomUUID();
    editarTitulo.textContent = material ? 'Editar material' : 'Novo material';
    preencherCategoriasEditor();
    if (material) {
      for (const nome of ['nome', 'categoriaId', 'controle', 'unidade', 'icone', 'cor', 'observacoes']) {
        campo(nome).value = String(material[nome] || '');
      }
      campo('ativo').checked = material.ativo !== false;
    } else {
      campo('controle').value = 'quantidade';
      campo('unidade').value = 'un';
      campo('icone').value = 'caixa';
      campo('cor').value = 'azul';
      campo('ativo').checked = true;
    }
    comboCategoria.sincronizar();
    campo('controle').disabled = Boolean(material?.saldoInicialRegistrado);
    campo('unidade').disabled = Boolean(material?.saldoInicialRegistrado);
    editor.classList.remove('hidden');
    if (categorias.every(item => item.ativo === false)) {
      editarStatus.textContent = 'Não há categorias ativas. Crie uma categoria antes de cadastrar materiais.';
    } else if (material?.saldoInicialRegistrado) {
      editarStatus.textContent = 'Controle e unidade bloqueados porque já existe saldo inicial.';
    }
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    campo('nome').focus({ preventScroll: true });
  }
  function renderizar() {
    paginador.ocultar();lista.replaceChildren();
    lista.setAttribute('aria-busy', String(carregando));
    atualizarBotao.disabled = carregando;
    const edicaoPermitida = podeGravar();
    novoBotao.classList.toggle('hidden', !edicaoPermitida);
    modo.textContent = edicaoPermitida ? '' : 'Somente consulta';
    if (!edicaoPermitida && !editor.classList.contains('hidden')) fecharEditor();
    if (!autorizado()) {
      estado.textContent = 'Acesso não autorizado.';
      total.textContent = '0';
      ativos.textContent = '0';
      return;
    }
    total.textContent = String(materiais.length);
    ativos.textContent = String(materiais.filter(item => item.ativo !== false).length);
    if (carregando) {
      estado.textContent = 'Consultando os materiais do HML…';
      vazio('Carregando materiais', 'Aguarde a consulta ao DSIPS.');
      return;
    }
    if (falha) {
      estado.textContent = falha;
      vazio('Consulta indisponível', 'Não foi possível carregar os materiais. Verifique seu acesso e tente Atualizar.');
      return;
    }
    if (!pronto) {
      estado.textContent = 'Abra Materiais para consultar os registros.';
      return;
    }
    const filtrados = filtrarMateriaisDsips(materiais, busca.value, categoria.value);
    estado.textContent = String(filtrados.length) + ' de ' + String(materiais.length) + ' materiais encontrados.';
    if (!filtrados.length) {
      vazio(materiais.length ? 'Nenhum material corresponde à busca' : 'Nenhum material cadastrado',
        materiais.length ? 'Altere o termo ou a categoria.' : 'O cadastro de materiais do HML está vazio.');
      return;
    }
    const nomesCategorias = new Map(categorias.map(item => [item.id, item.nome]));
    for (const material of paginador.recortar(filtrados,JSON.stringify([busca.value,categoria.value]))) {
      const visual = visualMaterialDsips(material);
      const card = elemento('article', 'dsips-material-card dsips-cor-' + visual.cor);
      const cab = elemento('div', 'dsips-material-head');
      const simbolo = elemento('span', 'dsips-material-symbol');
      simbolo.setAttribute('aria-hidden', 'true');
      simbolo.append(iconeDoMaterial(visual.icone));
      const titulos = elemento('div', 'dsips-material-title');
      titulos.append(elemento('h3', '', material.nome || 'Material sem nome'),
        elemento('p', '', nomesCategorias.get(material.categoriaId) || 'Sem categoria'));
      cab.append(simbolo, titulos);
      const informacoes = elemento('div', 'dsips-material-meta');
      informacoes.append(
        elemento('span', '', material.controle === 'individualizado' ? 'Individualizado' : 'Por quantidade'),
        elemento('span', '', material.unidade || 'Unidade não definida')
      );
      const situacao = elemento('span',
        material.ativo === false ? 'dsips-status-inactive' : 'dsips-status-active',
        material.ativo === false ? 'Inativo' : 'Ativo');
      card.append(cab, informacoes, situacao);
      if(podeConsultarHistoricoDsips(obterUsuario())&&material.id){const b=elemento('button','app-button app-button-secondary','Histórico');b.type='button';b.addEventListener('click',()=>abrirHistorico({visao:'material',id:material.id,nome:material.nome}));card.append(b);}
      if (edicaoPermitida) {
        const editar = elemento('button', 'app-button app-button-secondary dsips-material-edit', 'Editar');
        editar.type = 'button';
        editar.setAttribute('aria-label', 'Editar material: ' + (material.nome || 'Sem nome'));
        editar.addEventListener('click', () => abrirEditor(material));
        card.append(editar);
      }
      lista.append(card);
    }
  }
  function limpar() {
    paginador.reset();
    fecharEditor();
    versao++;
    materiais = [];
    categorias = [];
    pronto = false;
    carregando = false;
    falha = '';
    busca.value = '';
    categoria.replaceChildren(new Option('Todas as categorias', ''));
    campo('categoriaId').replaceChildren(new Option('Selecione uma categoria', ''));comboCategoria.sincronizar();
    renderizar();
  }
  async function carregar() {
    if (!autorizado()) { limpar(); return; }
    paginador.reset();const atual = ++versao;
    carregando = true;
    pronto = false;
    falha = '';
    renderizar();
    try {
      const [itens, grupos] = await Promise.all([
        listarCadastroDsips('materiais'),
        listarCadastroDsips('categorias')
      ]);
      if (atual !== versao || !autorizado()) return;
      materiais = Array.isArray(itens) ? itens : [];
      categorias = Array.isArray(grupos) ? grupos : [];
      const categoriaAnterior = categoria.value;
      categoria.replaceChildren(new Option('Todas as categorias', ''));
      for (const grupo of categorias) {
        if (grupo?.id) categoria.add(new Option(grupo.nome || 'Categoria sem nome', grupo.id));
      }
      if (categorias.some(item => item.id === categoriaAnterior)) categoria.value = categoriaAnterior;
      preencherCategoriasEditor();
      pronto = true;
    } catch (erro) {
      if (atual !== versao || !autorizado()) return;
      console.warn('Falha ao consultar materiais DSIPS no HML.', erro);
      materiais = [];
      categorias = [];
      pronto = false;
      falha = erro?.code === 'permission-denied' || erro?.code === 'functions/permission-denied'
        ? 'Sem permissão para consultar os dados DSIPS. Solicite revisão do acesso.'
        : 'Falha de conexão ou consulta ao DSIPS. Tente atualizar.';
    } finally {
      if (atual === versao) {
        carregando = false;
        renderizar();
      }
    }
  }
  async function salvarMaterial(evento) {
    evento.preventDefault();
    if (gravando || !podeGravar() || editor.classList.contains('hidden') || !pronto) return;
    if (!formulario.reportValidity()) return;
    const uid = obterUsuario()?.uid;
    let pedido;
    try {
      pedido = prepararCadastroMaterialDsips({
        nome: campo('nome').value,
        categoriaId: campo('categoriaId').value,
        controle: campo('controle').value,
        unidade: campo('unidade').value,
        icone: campo('icone').value,
        cor: campo('cor').value,
        observacoes: campo('observacoes').value,
        ativo: campo('ativo').checked
      }, { id: rascunhoId, categorias, anterior: materialEditando });
    } catch (erro) {
      editarStatus.textContent = erro.message;
      return;
    }
    const assinatura = JSON.stringify(pedido);
    if (!pendente || pendente.assinatura !== assinatura) {
      pendente = { assinatura, operacaoId: crypto.randomUUID() };
    }
    const operacaoId = pendente.operacaoId;
    gravando = true;comboCategoria.setDisabled(true);
    salvarBotao.disabled = true;
    cancelarBotao.disabled = true;
    editarStatus.textContent = 'Salvando material no HML…';
    try {
      await salvarCadastroDsips({ ...pedido, operacaoId });
      if (uid !== obterUsuario()?.uid || !podeGravar()) return;
      fecharEditor();
      notificar('Material salvo com sucesso no HML.', 'sucesso');
      await carregar();
    } catch (erro) {
      if (uid !== obterUsuario()?.uid || !podeGravar()) return;
      console.warn('Falha ao salvar material DSIPS.', erro);
      const negado = erro?.code === 'functions/permission-denied';
      editarStatus.textContent = negado
        ? 'Sem permissão para salvar. Seu acesso deve ser revisado.'
        : 'Não foi possível salvar. Confira os dados e tente novamente.';
      notificar(negado ? 'Operação não autorizada no DSIPS.' : 'Falha ao salvar material.', 'erro');
    } finally {
      gravando = false;comboCategoria.setDisabled(false);
      salvarBotao.disabled = false;
      cancelarBotao.disabled = false;
    }
  }
  novoBotao.addEventListener('click', () => abrirEditor());
  cancelarBotao.addEventListener('click', fecharEditor);
  formulario.addEventListener('submit', evento => { void salvarMaterial(evento); });
  busca.addEventListener('input', renderizar);
  categoria.addEventListener('change', renderizar);
  atualizarBotao.addEventListener('click', carregar);
  limpar();
  return { carregar, limpar };
}
