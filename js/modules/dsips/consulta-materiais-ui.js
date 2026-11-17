import { listarCadastroDsips } from './service.js';
import { filtrarMateriaisDsips, podeConsultarMateriaisDsips } from './consulta-materiais-model.js';

export function criarConsultaMateriaisDsips({ obterUsuario }) {
  const lista = document.getElementById('dsips-material-list');
  const estado = document.getElementById('dsips-material-status');
  const busca = document.getElementById('dsips-material-search');
  const categoria = document.getElementById('dsips-material-category');
  const atualizarBotao = document.getElementById('dsips-material-refresh');
  const total = document.getElementById('dsips-material-total');
  const ativos = document.getElementById('dsips-material-active');
  let versao = 0;
  let materiais = [];
  let categorias = [];
  let pronto = false;
  let carregando = false;
  let falha = '';

  const autorizado = () => podeConsultarMateriaisDsips(obterUsuario());
  const texto = (elemento, conteudo) => {
    elemento.textContent = String(conteudo ?? '');
    return elemento;
  };
  function elemento(tag, classe, conteudo) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (conteudo !== undefined) texto(el, conteudo);
    return el;
  }
  function vazio(titulo, detalhe) {
    const card = elemento('div', 'dsips-empty app-card');
    card.append(elemento('strong', '', titulo), elemento('p', '', detalhe));
    lista.append(card);
  }
  function renderizar() {
    lista.replaceChildren();
    lista.setAttribute('aria-busy', String(carregando));
    atualizarBotao.disabled = carregando;
    if (!autorizado()) {
      estado.textContent = 'Acesso não autorizado.';
      total.textContent = '0'; ativos.textContent = '0';
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
    for (const material of filtrados) {
      const card = elemento('article', 'dsips-material-card');
      const cab = elemento('div', 'dsips-material-head');
      const simbolo = elemento('span', 'dsips-material-symbol', '▣');
      simbolo.setAttribute('aria-hidden', 'true');
      const titulos = elemento('div', 'dsips-material-title');
      titulos.append(elemento('h3', '', material.nome || 'Material sem nome'),
        elemento('p', '', nomesCategorias.get(material.categoriaId) || 'Sem categoria'));
      cab.append(simbolo, titulos);
      const informacoes = elemento('div', 'dsips-material-meta');
      const controle = material.controle === 'individualizado' ? 'Individualizado' : 'Por quantidade';
      informacoes.append(
        elemento('span', '', controle),
        elemento('span', '', material.unidade || 'Unidade não definida')
      );
      const situacao = elemento('span',
        material.ativo === false ? 'dsips-status-inactive' : 'dsips-status-active',
        material.ativo === false ? 'Inativo' : 'Ativo'
      );
      card.append(cab, informacoes, situacao);
      lista.append(card);
    }
  }
  function limpar() {
    versao++;
    materiais = []; categorias = []; pronto = false; carregando = false; falha = '';
    busca.value = '';
    categoria.replaceChildren(new Option('Todas as categorias', ''));
    renderizar();
  }
  async function carregar() {
    if (!autorizado()) { limpar(); return; }
    const atual = ++versao;
    carregando = true; pronto = false; falha = '';
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
      pronto = true;
    } catch (erro) {
      if (atual !== versao || !autorizado()) return;
      console.warn('Falha ao consultar materiais DSIPS no HML.', erro);
      materiais = []; categorias = []; pronto = false;
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
  busca.addEventListener('input', renderizar);
  categoria.addEventListener('change', renderizar);
  atualizarBotao.addEventListener('click', carregar);
  limpar();
  return { carregar, limpar };
}
