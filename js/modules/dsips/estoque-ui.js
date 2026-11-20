import {criarPaginadorLocal} from '../../ui/paginador.js?v=1.13.33-h.1';
import {adaptarSelectAutocomplete} from '../../ui/autocomplete.js?v=1.13.32-h.1';
import {podeConsultarHistoricoDsips} from './historico-model.js?v=1.13.29-h.1';
import {
  listarCadastroDsips, listarUnidadesDsips, registrarSaldoInicialDsips
} from './service.js?v=1.13.15-h.1';
import {
  podeConsultarEstoqueDsips, podeRegistrarSaldoDsips, materiaisPendentesSaldoDsips,
  resumoEstoqueDsips, identificadoresDoTextoDsips, prepararSaldoInicialDsips
} from './estoque-model.js?v=1.13.15-h.1';

import { criarAjustesDsips } from './ajustes-ui.js?v=1.13.19-h.1';

export function criarEstoqueDsips({ obterUsuario, confirmar, notificar = () => {} , abrirHistorico=()=>{}}) {
  const porId = id => document.getElementById(id);
  const secao = porId('sec-dsips-estoque');
  const lista = porId('dsips-estoque-list');
  const unidadesLista = porId('dsips-estoque-unidades');
  const paginador=criarPaginadorLocal({lista,tamanho:20,renderizar,podeNavegar:()=>autorizado()&&!gravando&&!confirmando&&!ajustes.ocupado(),rotulo:'Páginas de estoque'});
  const unidadesBusca=porId('dsips-estoque-unidades-search');
  const paginadorUnidades=criarPaginadorLocal({lista:unidadesLista,tamanho:30,renderizar:renderizarUnidades,podeNavegar:()=>autorizado()&&ativo(),rotulo:'Páginas de identificações'});
  let unidadesConsulta=[],unidadesMaterialId='';
  const status = porId('dsips-estoque-status');
  const unidadesStatus = porId('dsips-estoque-unidades-status');
  const resumoInicializados = porId('dsips-estoque-inicializados');
  const resumoPendentes = porId('dsips-estoque-pendentes');
  const resumoDisponiveis = porId('dsips-estoque-identificacoes');
  const atualizarBotao = porId('dsips-estoque-refresh');
  const novoBotao = porId('dsips-estoque-new');
  const modo = porId('dsips-estoque-mode');
  const formulario = porId('dsips-estoque-form');
  const editor = porId('dsips-estoque-editor');
  const editorStatus = porId('dsips-estoque-editor-status');
  const salvarBotao = porId('dsips-estoque-save');
  const cancelarBotao = porId('dsips-estoque-cancel');
  const identificadoresBox = porId('dsips-estoque-identificadores-box');
  const materialCampo = formulario.elements.namedItem('materialId');
  const localCampo = formulario.elements.namedItem('localId');
  const comboMaterial=adaptarSelectAutocomplete(materialCampo,{id:'dsips-estoque-material-combo',rotulo:'Material',placeholder:'Pesquisar material sem saldo inicial'});
  const comboLocal=adaptarSelectAutocomplete(localCampo,{id:'dsips-estoque-local-combo',rotulo:'Local de estoque',placeholder:'Pesquisar local'});
  const quantidadeCampo = formulario.elements.namedItem('quantidade');
  const identificadoresCampo = formulario.elements.namedItem('identificadores');
  const motivoCampo = formulario.elements.namedItem('motivo');
  const filtro = porId('dsips-estoque-search');
  let materiais = [], locais = [], estoque = [];
  let pronto = false, carregando = false, falha = '';
  let revisao = 0, sessao = 0, unidadesRevisao = 0;
  let gravando = false, confirmando = false, pendente = null;

  const autorizado = () => podeConsultarEstoqueDsips(obterUsuario());
  const podeGravar = () => podeRegistrarSaldoDsips(obterUsuario());
  const pendentes = () => materiaisPendentesSaldoDsips(materiais, estoque);
  const ativo = () => !secao.classList.contains('hidden');
  const materialPorId = id => materiais.find(item => item.id === id);
  const localPorId = id => locais.find(item => item.id === id);
  const ajustes = criarAjustesDsips({obterUsuario, podeGravar, ativo, confirmar, notificar, carregar, secao, fecharSaldoInicial: fecharEditor, podeAbrir:()=>pronto&&!carregando&&!gravando&&!confirmando});
  function elemento(tag, classe, conteudo) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (conteudo !== undefined) el.textContent = String(conteudo ?? '');
    return el;
  }
  function vazio(container, titulo, descricao) {
    const item = elemento('div', 'dsips-empty app-card');
    item.append(elemento('strong','',titulo), elemento('p','',descricao));
    container.append(item);
  }
  function fecharEditor() {
    editor.classList.add('hidden');
    formulario.reset();comboMaterial.sincronizar();comboLocal.sincronizar();
    identificadoresBox.classList.add('hidden');
    quantidadeCampo.readOnly = false;
    quantidadeCampo.value = '';
    editorStatus.textContent = '';
    pendente = null;
  }
  function sincronizarCampos() {
    const selecionado = materialPorId(materialCampo.value);
    const individualizado = selecionado?.controle === 'individualizado';
    identificadoresBox.classList.toggle('hidden', !individualizado);
    quantidadeCampo.readOnly = Boolean(individualizado);
    quantidadeCampo.placeholder = individualizado ? 'Calculada pelas identificações' : 'Quantidade física';
    if (individualizado) {
      quantidadeCampo.value = String(identificadoresDoTextoDsips(identificadoresCampo.value).length);
    } else if (quantidadeCampo.readOnly === false && !quantidadeCampo.value) {
      quantidadeCampo.value = '';
    }
  }
  function atualizarSeletores() {
    const anteriorMaterial = materialCampo.value, anteriorLocal = localCampo.value;
    materialCampo.replaceChildren(new Option('Selecione um material ainda sem saldo', ''));
    for (const item of pendentes()) materialCampo.add(new Option(item.nome || 'Material sem nome', item.id));
    if (pendentes().some(item => item.id === anteriorMaterial)) materialCampo.value = anteriorMaterial;
    localCampo.replaceChildren(new Option('Selecione um local ativo', ''));
    for (const item of locais.filter(item => item.ativo !== false)) localCampo.add(new Option(item.nome || 'Local sem nome', item.id));
    if (locais.some(item => item.id === anteriorLocal && item.ativo !== false)) localCampo.value = anteriorLocal;
    comboMaterial.sincronizar();comboLocal.sincronizar();
    sincronizarCampos();
  }
  function abrirEditor() {
    if (ajustes.ocupado() || !pronto || !podeGravar() || gravando || carregando || !pendentes().length) return;
    ajustes.fechar();
    fecharEditor();
    atualizarSeletores();
    editor.classList.remove('hidden');
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    comboMaterial.focar();
  }
  function atualizarBotoes() {
    const bloqueado = carregando || gravando || confirmando;
    comboMaterial.setDisabled(bloqueado||!podeGravar());comboLocal.setDisabled(bloqueado||!podeGravar());
    atualizarBotao.disabled = bloqueado;
    novoBotao.disabled = bloqueado || !pronto || !pendentes().length || !locais.some(item => item.ativo !== false);
    salvarBotao.disabled = gravando || confirmando;
    cancelarBotao.disabled = gravando || confirmando;
  }
  function renderizar() {
    if(ajustes.ocupado())return;
    paginador.ocultar();ajustes.fechar();
    lista.replaceChildren();
    const podeEscrever = podeGravar();
    modo.textContent = podeEscrever ? '' : 'Somente consulta';
    novoBotao.classList.toggle('hidden', !podeEscrever);
    if (!podeEscrever && !editor.classList.contains('hidden')) fecharEditor();
    atualizarBotoes();
    if (!autorizado()) {
      status.textContent = 'Acesso não autorizado.';
      resumoInicializados.textContent = '0';
      resumoPendentes.textContent = '0';
      resumoDisponiveis.textContent = '0';
      return;
    }
    const indicadores = resumoEstoqueDsips(materiais, estoque);
    resumoInicializados.textContent = String(indicadores.inicializados);
    resumoPendentes.textContent = String(indicadores.pendentes);
    resumoDisponiveis.textContent = String(indicadores.identificacoesDisponiveis);
    if (carregando) {
      status.textContent = 'Consultando as posições de estoque no HML…';
      vazio(lista,'Carregando estoque','Aguarde a consulta ao DSIPS.');
      return;
    }
    if (falha) {
      status.textContent = falha;
      vazio(lista,'Consulta indisponível','Confira seu acesso e utilize Atualizar.');
      return;
    }
    if (!pronto) {
      status.textContent = 'Abra Estoque para consultar as posições.';
      return;
    }
    const termo = String(filtro.value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
    const filtrados = estoque.filter(item => {
      const material = materialPorId(item.materialId);
      const local = localPorId(item.localId);
      const nome = [material?.nome, local?.nome].join(' ').normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
      return nome.includes(termo);
    });
    status.textContent = String(filtrados.length) + ' de ' + String(estoque.length) + ' posições de estoque.';
    if (!filtrados.length) {
      vazio(lista,estoque.length ? 'Nenhuma posição encontrada' : 'Estoque ainda não inicializado',
        estoque.length ? 'Altere a pesquisa para encontrar outros materiais.' :
          'Registre o saldo inicial de um material de teste para começar.');
      return;
    }
    for (const posicao of paginador.recortar(filtrados,filtro.value)) {
      const material = materialPorId(posicao.materialId);
      const local = localPorId(posicao.localId);
      const card = elemento('article','dsips-estoque-card');
      const cabecalho = elemento('div','dsips-estoque-card-heading');
      cabecalho.append(elemento('h3','',material?.nome || 'Material indisponível'),
        elemento('p','',local?.nome || 'Local não encontrado'));
      const atributos = elemento('div','dsips-estoque-card-values');
      for (const [rotulo,valor] of [
        ['Total',posicao.total], ['Disponível',posicao.disponivel], ['Em cautela',posicao.emCautela]
      ]) {
        const bloco = elemento('div','dsips-estoque-value');
        bloco.append(elemento('span','',rotulo),elemento('strong','',String(valor ?? 0)));
        atributos.append(bloco);
      }
      const rodape = elemento('div','dsips-estoque-card-footer');
      rodape.append(elemento('span','dsips-estoque-unit',material?.unidade || 'un'));
      if (material?.controle === 'individualizado') {
        const consultar = elemento('button','app-button app-button-secondary','Ver identificações');
        consultar.type = 'button';
        consultar.addEventListener('click',()=>{ void mostrarUnidades(posicao.materialId); });
        rodape.append(consultar);
      }
      ajustes.anexar(rodape,material,local,posicao);
      if(podeConsultarHistoricoDsips(obterUsuario())&&posicao.materialId){const b=elemento('button','app-button app-button-secondary','Movimentações');b.type='button';b.addEventListener('click',()=>abrirHistorico({visao:'material',id:posicao.materialId,nome:material?.nome}));rodape.append(b);}
      card.append(cabecalho,atributos,rodape);
      lista.append(card);
    }
  }
  function limpar() {
    paginador.reset();limparUnidades();ajustes.limpar();
    revisao++; sessao++; unidadesRevisao++;
    materiais = []; locais = []; estoque = [];
    pronto = false; carregando = false; falha = '';
    gravando = false; confirmando = false;
    filtro.value = '';
    unidadesLista.replaceChildren();
    unidadesStatus.textContent = '';
    fecharEditor();
    atualizarSeletores();
    renderizar();
  }
  async function carregar() {
    if (!autorizado()) { limpar(); return; }
    if (gravando || confirmando || ajustes.ocupado()) return;
    paginador.reset();limparUnidades();const token = ++revisao, uid = obterUsuario()?.uid;
    unidadesRevisao++;
    unidadesLista.replaceChildren();
    unidadesStatus.textContent = '';
    carregando = true; falha = '';
    renderizar();
    try {
      const [itens, enderecos, posicoes] = await Promise.all([
        listarCadastroDsips('materiais'),
        listarCadastroDsips('locais'),
        listarCadastroDsips('estoque')
      ]);
      if (token !== revisao || uid !== obterUsuario()?.uid || !autorizado()) return;
      materiais = Array.isArray(itens) ? itens : [];
      locais = Array.isArray(enderecos) ? enderecos : [];
      estoque = Array.isArray(posicoes) ? posicoes : [];
      pronto = true;
      if (!editor.classList.contains('hidden')) atualizarSeletores();
    } catch (erro) {
      if (token !== revisao || uid !== obterUsuario()?.uid || !autorizado()) return;
      console.warn('Falha na consulta de estoque DSIPS.',erro);
      pronto = false;
      falha = ['permission-denied','functions/permission-denied'].includes(erro?.code)
        ? 'Seu perfil não possui permissão de consulta ao estoque DSIPS.'
        : 'Falha ao consultar o estoque. Verifique a conexão e tente Atualizar.';
    } finally {
      if (token === revisao) { carregando = false; renderizar(); }
    }
  }
  async function mostrarUnidades(materialId) {
    if (!autorizado()) return;
    limparUnidades();const token = ++unidadesRevisao, uid = obterUsuario()?.uid;
    unidadesLista.replaceChildren();
    const item = materialPorId(materialId);
    unidadesStatus.textContent = 'Consultando identificações de ' + (item?.nome || 'material') + '…';
    try {
      const unidades = await listarUnidadesDsips(materialId);
      if (token !== unidadesRevisao || uid !== obterUsuario()?.uid || !ativo() || !autorizado()) return;
      unidadesConsulta=unidades;unidadesMaterialId=materialId;unidadesBusca.disabled=false;renderizarUnidades();
      unidadesLista.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (erro) {
      if (token !== unidadesRevisao || uid !== obterUsuario()?.uid || !ativo()) return;
      console.warn('Erro ao consultar identificações DSIPS.',erro);
      unidadesStatus.textContent = 'Falha ao consultar identificações. Tente novamente.';
    }
  }
  function limparUnidades(){unidadesConsulta=[];unidadesMaterialId='';unidadesBusca.value='';unidadesBusca.disabled=true;paginadorUnidades.reset();unidadesLista.replaceChildren();}
  function renderizarUnidades(){
    paginadorUnidades.ocultar();unidadesLista.replaceChildren();if(!autorizado()||!ativo()||!unidadesMaterialId)return;
    const materialId=unidadesMaterialId,normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
    const termo=normalizar(unidadesBusca.value),filtradas=unidadesConsulta.filter(u=>normalizar([u.identificacao,u.id,localPorId(u.localId)?.nome].join(' ')).includes(termo));
    unidadesStatus.textContent=filtradas.length+' de '+unidadesConsulta.length+' identificação(ões) encontrada(s).';
    if(!filtradas.length)vazio(unidadesLista,'Nenhuma identificação encontrada','Altere a pesquisa ou confira o saldo inicial deste material.');
    for(const unidade of paginadorUnidades.recortar(filtradas,termo)) {
        const linha = elemento('article','dsips-estoque-unidade');
        const nome = elemento('strong','',unidade.identificacao || 'Sem identificação');
        const estado = elemento('span','',
          unidade.situacao === 'disponivel' ? 'Disponível' :
          unidade.situacao === 'em_cautela' ? 'Em cautela' : unidade.situacao === 'baixada' ? 'Baixada' : (unidade.situacao || 'Sem situação'));
        const local = elemento('small','',localPorId(unidade.localId)?.nome || 'Local não informado');
        linha.append(nome,estado,local);
        if(podeConsultarHistoricoDsips(obterUsuario())&&unidade.id&&unidade.identificacao){const b=elemento('button','app-button app-button-secondary','Histórico da unidade');b.type='button';b.addEventListener('click',()=>abrirHistorico({visao:'unidade',id:unidade.id,identificacao:unidade.identificacao,materialId,nome:unidade.identificacao}));linha.append(b);}
        unidadesLista.append(linha);
      }
  }
  async function salvar(evento) {
    evento.preventDefault();
    if (!podeGravar() || !pronto || gravando || confirmando || editor.classList.contains('hidden')) return;
    if (!formulario.reportValidity()) return;
    let pedido;
    try {
      pedido = prepararSaldoInicialDsips({
        materialId: materialCampo.value, localId: localCampo.value,
        quantidade: quantidadeCampo.value, identificadores: identificadoresCampo.value,
        motivo: motivoCampo.value
      }, { materiais, locais, estoque });
    } catch (erro) {
      editorStatus.textContent = erro.message;
      return;
    }
    const uid = obterUsuario()?.uid, epoca = sessao;
    confirmando = true;
    atualizarBotoes();
    let confirmou = false;
    try {
      const material = materialPorId(pedido.materialId), local = localPorId(pedido.localId);
      confirmou = await confirmar({
        titulo: 'Confirmar saldo inicial?',
        mensagem: 'Material: ' + (material?.nome || '') + ' · Local: ' + (local?.nome || '') +
          ' · Quantidade: ' + pedido.quantidade + '. Este lançamento é único e não poderá ser editado.',
        confirmarTexto: 'Registrar saldo inicial'
      });
    } finally {
      if (epoca === sessao) { confirmando = false; atualizarBotoes(); }
    }
    if (!confirmou || epoca !== sessao || uid !== obterUsuario()?.uid ||
        !podeGravar() || !ativo() || editor.classList.contains('hidden')) return;
    const assinatura = JSON.stringify(pedido);
    if (!pendente || pendente.assinatura !== assinatura) {
      pendente = { assinatura, operacaoId: crypto.randomUUID() };
    }
    const operacaoId = pendente.operacaoId;
    gravando = true;
    atualizarBotoes();
    editorStatus.textContent = 'Registrando saldo inicial com auditoria…';
    try {
      await registrarSaldoInicialDsips({ ...pedido, operacaoId });
      if (epoca !== sessao || uid !== obterUsuario()?.uid || !podeGravar()) return;
      fecharEditor();
      notificar('Saldo inicial registrado no HML.', 'sucesso');
      gravando = false;
      await carregar();
    } catch (erro) {
      if (epoca !== sessao || uid !== obterUsuario()?.uid || !podeGravar()) return;
      console.warn('Falha ao registrar saldo inicial DSIPS.', erro);
      editorStatus.textContent = ['permission-denied','functions/permission-denied'].includes(erro?.code)
        ? 'Você não possui permissão para este lançamento.'
        : 'Não foi possível confirmar o saldo. Confira a posição antes de tentar novamente.';
      notificar('Não foi possível registrar o saldo inicial.', 'erro');
    } finally {
      if (epoca === sessao) { gravando = false; atualizarBotoes(); }
    }
  }
  novoBotao.addEventListener('click',abrirEditor);
  cancelarBotao.addEventListener('click',fecharEditor);
  atualizarBotao.addEventListener('click',()=>{ void carregar(); });
  formulario.addEventListener('submit',evento=>{ void salvar(evento); });
  materialCampo.addEventListener('change',()=>{ identificadoresCampo.value = ''; quantidadeCampo.value = ''; sincronizarCampos(); });
  identificadoresCampo.addEventListener('input',sincronizarCampos);
  filtro.addEventListener('input',renderizar);
  unidadesBusca.addEventListener('input',renderizarUnidades);
  limpar();
  return { carregar, limpar };
}
