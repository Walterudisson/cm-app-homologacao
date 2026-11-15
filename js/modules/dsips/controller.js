import { podeGerenciarDsips, identificadoresDoTexto, resumoDsips, filtrarPorNome } from './model.js';
import { modulosDoUsuario } from '../../platform/modules.js';
import { descricaoItens } from './cautelas-model.js';

export function criarInterfaceDsips({ obterUsuario, servicos, confirmar, notificar }) {
  const porId = id => document.getElementById(id);
  const formMaterial = porId('dsips-material-form');
  const formCatalogo = porId('dsips-catalog-form');
  const formSaldo = porId('dsips-saldo-form');
  let dados = {}; let pagina = ''; let revisao = 0; let gravando = false;
  const pendentes = new Map();
  const campos = form => form.elements;
  const tipoCatalogo = () => porId('dsips-catalog-type').value;
  const chaveCatalogo = () => ({ categoria: 'categorias', local: 'locais', responsavel: 'responsaveis' })[tipoCatalogo()];
  const nome = (tipo, id) => dados[tipo]?.find(item => item.id === id)?.nome || 'Cadastro não disponível';
  const autorizado = () => modulosDoUsuario(obterUsuario()).some(item => item.id === 'dsips');
  const podeEscrever = () => podeGerenciarDsips(obterUsuario());

  function status(mensagem) {
    document.querySelectorAll('.dsips-status').forEach(elemento => { elemento.textContent = mensagem; });
  }
  function selecao(campo, itens, mensagem) {
    const selecionado = campo.value;
    campo.replaceChildren(new Option(mensagem, ''));
    for (const item of itens) campo.add(new Option(item.nome, item.id));
    if (itens.some(item => item.id === selecionado)) campo.value = selecionado;
  }
  function linha(container, titulo, descricao, acao, rotulo = 'Editar') {
    const artigo = document.createElement('article'); artigo.className = 'dsips-row';
    const texto = document.createElement('div');
    const forte = document.createElement('strong'); forte.textContent = titulo;
    const detalhe = document.createElement('p'); detalhe.textContent = descricao;
    texto.append(forte, detalhe); artigo.appendChild(texto);
    if (acao) {
      const botao = document.createElement('button'); botao.type = 'button';
      botao.className = 'app-button app-button-secondary'; botao.textContent = rotulo;
      botao.addEventListener('click', acao); artigo.appendChild(botao);
    }
    container.appendChild(artigo);
  }
  function listaVazia(container) {
    if (!container.children.length) linha(container, 'Nenhum registro encontrado', 'Cadastre os dados ou ajuste a pesquisa.');
  }
  function novoMaterial() {
    formMaterial.reset(); campos(formMaterial).id.value = '';
    campos(formMaterial).controle.disabled = false; campos(formMaterial).unidade.disabled = false;
    porId('dsips-material-title').textContent = 'Novo material';
  }
  function editarMaterial(item) {
    for (const chave of ['id', 'nome', 'categoriaId', 'controle', 'unidade', 'observacoes']) campos(formMaterial)[chave].value = item[chave] || '';
    campos(formMaterial).ativo.checked = item.ativo !== false;
    campos(formMaterial).controle.disabled = Boolean(item.saldoInicialRegistrado);
    campos(formMaterial).unidade.disabled = Boolean(item.saldoInicialRegistrado);
    porId('dsips-material-title').textContent = 'Editar material';
    campos(formMaterial).nome.focus();
  }
  function renderizarMateriais() {
    selecao(campos(formMaterial).categoriaId, (dados.categorias || []).filter(item => item.ativo !== false), 'Selecione uma categoria');
    const container = porId('dsips-material-list'); container.replaceChildren();
    for (const item of filtrarPorNome(dados.materiais || [], porId('dsips-material-search').value)) {
      linha(container, item.nome,
        `${nome('categorias', item.categoriaId)} · ${item.controle === 'individualizado' ? 'Individualizado' : 'Por quantidade'} · ${item.unidade} · ${item.ativo === false ? 'Inativo' : 'Ativo'} · ${item.saldoInicialRegistrado ? 'Saldo inicial registrado' : 'Sem saldo inicial'}`,
        podeEscrever() ? () => editarMaterial(item) : null);
    }
    listaVazia(container);
  }
  function novoCatalogo() {
    formCatalogo.reset(); campos(formCatalogo).id.value = '';
    const responsavel = tipoCatalogo() === 'responsavel';
    porId('dsips-responsavel-fields').classList.toggle('hidden', !responsavel);
    campos(formCatalogo).matricula.required = responsavel;
    campos(formCatalogo).matricula.readOnly = false;
    porId('dsips-catalog-title').textContent = 'Novo cadastro';
  }
  function renderizarCatalogo() {
    const container = porId('dsips-catalog-list'); container.replaceChildren();
    for (const item of filtrarPorNome(dados[chaveCatalogo()] || [], porId('dsips-catalog-search').value)) {
      const descricao = [item.matricula, item.setor, item.ativo === false ? 'Inativo' : 'Ativo'].filter(Boolean).join(' · ');
      linha(container, item.nome, descricao, podeEscrever() ? () => {
        novoCatalogo(); campos(formCatalogo).id.value = item.id;
        campos(formCatalogo).nome.value = item.nome;
        campos(formCatalogo).ativo.checked = item.ativo !== false;
        campos(formCatalogo).matricula.value = item.matricula || '';
        campos(formCatalogo).matricula.readOnly = true;
        campos(formCatalogo).setor.value = item.setor || '';
        porId('dsips-catalog-title').textContent = 'Editar cadastro';
        campos(formCatalogo).nome.focus();
      } : null);
    }
    listaVazia(container);
  }
  function atualizarIdentificadores() {
    const item = dados.materiais?.find(item => item.id === campos(formSaldo).materialId.value);
    const individualizado = item?.controle === 'individualizado';
    porId('dsips-identificadores-field').classList.toggle('hidden', !individualizado);
    campos(formSaldo).quantidade.readOnly = individualizado;
    if (individualizado) campos(formSaldo).quantidade.value = identificadoresDoTexto(campos(formSaldo).identificadores.value).length;
  }
  async function mostrarUnidades(id) {
    const usuarioUid = obterUsuario()?.uid; const atual = revisao;
    try {
      const unidades = await servicos.listarUnidades(id);
      if (usuarioUid !== obterUsuario()?.uid || atual !== revisao || pagina !== 'dsips-estoque') return;
      const container = porId('dsips-unit-list'); container.replaceChildren();
      for (const unidade of unidades) linha(container, unidade.identificacao, `${nome('materiais', id)} · ${{ disponivel: 'Disponível', em_cautela: 'Em cautela' }[unidade.situacao] || unidade.situacao} · ${nome('locais', unidade.localId)}`);
      listaVazia(container); container.scrollIntoView({ block: 'nearest' });
    } catch (erro) { notificar(erro.message || 'Não foi possível consultar as unidades.', 'erro'); }
  }
  function renderizarEstoque() {
    selecao(campos(formSaldo).materialId, (dados.materiais || []).filter(item => item.ativo !== false && !item.saldoInicialRegistrado), 'Selecione um material sem saldo inicial');
    selecao(campos(formSaldo).localId, (dados.locais || []).filter(item => item.ativo !== false), 'Selecione um local');
    atualizarIdentificadores();
    const container = porId('dsips-stock-list'); container.replaceChildren();
    for (const registro of dados.estoque || []) {
      const item = dados.materiais?.find(item => item.id === registro.materialId);
      linha(container, nome('materiais', registro.materialId),
        `${nome('locais', registro.localId)} · Total: ${registro.total} ${item?.unidade || ''} · Disponível: ${registro.disponivel} · Em cautela: ${registro.emCautela}${item?.ativo === false ? ' · Material inativo' : ''}`,
        item?.controle === 'individualizado' ? () => mostrarUnidades(registro.materialId) : null, 'Ver unidades');
    }
    listaVazia(container);
  }
  function renderizarInicio() {
    const container = porId('dsips-kpis'); container.replaceChildren();
    const resumo = resumoDsips(dados);
    for (const [chave, titulo] of Object.entries({ materiais: 'Materiais ativos', comSaldo: 'Materiais com estoque', semSaldo: 'Aguardando saldo inicial', responsaveis: 'Responsáveis ativos', cautelas: 'Cautelas em aberto' })) {
      const card = document.createElement('div'); card.className = 'module-access-panel';
      const forte = document.createElement('strong'); forte.textContent = String(resumo[chave]);
      const texto = document.createElement('span'); texto.textContent = titulo; card.append(forte, texto); container.appendChild(card);
    }
  }
  function renderizarHistorico(eventos) {
    const container = porId('dsips-event-list'); container.replaceChildren();
    for (const evento of eventos) {
      const data = evento.registradoEm?.toDate?.();
      const inicial = evento.tipo === 'saldo_inicial_registrado';
      if (['cautela_registrada', 'devolucao_registrada'].includes(evento.tipo)) {
        linha(container, `${evento.tipo === 'cautela_registrada' ? 'Cautela' : 'Devolução'} · ${evento.dados.responsavelNome}`,
          [descricaoItens(evento.dados.itens), evento.operadorNome, data ? data.toLocaleString('pt-BR') : '', evento.dados.observacoes].filter(Boolean).join(' · '));
        continue;
      }
      const titulo = inicial ? `${evento.dados.materialNome || 'Material'} · Saldo inicial: ${evento.dados.quantidade} ${evento.dados.unidade || ''}` : `Cadastro · ${evento.dados.nome || ''}`;
      const descricao = [evento.operadorNome, data ? data.toLocaleString('pt-BR') : '', inicial ? evento.dados.localNome : '', inicial ? evento.dados.motivo : evento.dados.tipo].filter(Boolean).join(' · ');
      linha(container, titulo, descricao);
    }
    listaVazia(container);
  }
  async function carregar(destino) {
    pagina = destino;
    if (!autorizado()) return false;
    const token = ++revisao; const uid = obterUsuario()?.uid;
    document.querySelectorAll('[data-dsips-write]').forEach(elemento => elemento.classList.toggle('hidden', !podeEscrever()));
    status('Carregando…');
    try {
      if (destino === 'dsips-historico') {
        const eventos = await servicos.listarEventos();
        if (token !== revisao || uid !== obterUsuario()?.uid) return false;
        renderizarHistorico(eventos);
      } else {
        const tipos = destino === 'dsips-materiais' ? ['materiais', 'categorias']
          : destino === 'dsips-cadastros' ? ['categorias', 'locais', 'responsaveis']
          : destino === 'dsips-estoque' ? ['materiais', 'locais', 'estoque'] : ['materiais', 'estoque', 'responsaveis', 'cautelas'];
        const resultado = await Promise.all(tipos.map(async tipo => [tipo, await servicos.listar(tipo)]));
        if (token !== revisao || uid !== obterUsuario()?.uid) return false;
        dados = { ...dados, ...Object.fromEntries(resultado) };
        if (destino === 'dsips-inicio') renderizarInicio();
        if (destino === 'dsips-materiais') renderizarMateriais();
        if (destino === 'dsips-cadastros') {
          novoCatalogo(); renderizarCatalogo();
          const divisoes = await servicos.listarDivisoes();
          if (token !== revisao || uid !== obterUsuario()?.uid) return false;
          porId('dsips-divisoes').replaceChildren(...divisoes.nomes.map(nome => new Option(nome, nome)));
        }
        if (destino === 'dsips-estoque') { porId('dsips-unit-list').replaceChildren(); renderizarEstoque(); }
      }
      status(''); return true;
    } catch (erro) {
      if (token === revisao && uid === obterUsuario()?.uid) {
        status('Não foi possível carregar os dados. Use Atualizar para tentar novamente.');
        notificar(erro.message || 'Falha ao consultar DSIPS.', 'erro');
      }
      return false;
    }
  }
  async function gravar(form, payload, salvar, mensagem, precisaConfirmar = false) {
    if (gravando || !podeEscrever()) return;
    gravando = true;
    const uid = obterUsuario()?.uid;
    const paginaEnvio = pagina;
    const serializado = JSON.stringify(payload);
    const chaveOperacao = form.id;
    const anterior = pendentes.get(chaveOperacao);
    const operacaoId = anterior?.serializado === serializado ? anterior.id : crypto.randomUUID();
    pendentes.set(chaveOperacao, { serializado, id: operacaoId });
    const botao = form.querySelector('button[type="submit"]'); botao.disabled = true;
    try {
      if (precisaConfirmar && !await confirmar({ titulo: 'Confirmar saldo inicial?', mensagem: 'O saldo inicial será registrado com sua identificação e não poderá ser editado. Confirme o material, o local e a quantidade.', confirmarTexto: 'Registrar saldo' })) return;
      if (uid !== obterUsuario()?.uid || !podeEscrever()) return;
      await salvar({ ...payload, operacaoId });
      pendentes.delete(chaveOperacao);
      if (uid !== obterUsuario()?.uid) return;
      if (form === formMaterial) novoMaterial();
      else if (form === formCatalogo) novoCatalogo();
      else formSaldo.reset();
      notificar(mensagem, 'sucesso');
      if (pagina === paginaEnvio) await carregar(paginaEnvio);
    } catch (erro) {
      if (uid === obterUsuario()?.uid) notificar(erro.message || 'Não foi possível salvar. Tente novamente.', 'erro');
    } finally { gravando = false; botao.disabled = false; }
  }
  formMaterial.addEventListener('submit', evento => {
    evento.preventDefault(); const f = campos(formMaterial); if (!f.id.value) f.id.value = crypto.randomUUID();
    void gravar(formMaterial, { tipo: 'material', id: f.id.value, dados: {
      nome: f.nome.value, categoriaId: f.categoriaId.value, controle: f.controle.value, unidade: f.unidade.value,
      observacoes: f.observacoes.value, ativo: f.ativo.checked
    } }, servicos.salvar, 'Material salvo.');
  });
  formCatalogo.addEventListener('submit', evento => {
    evento.preventDefault(); const f = campos(formCatalogo); if (!f.id.value) f.id.value = crypto.randomUUID();
    void gravar(formCatalogo, { tipo: tipoCatalogo(), id: f.id.value, dados: {
      nome: f.nome.value, ativo: f.ativo.checked, ...(tipoCatalogo() === 'responsavel' ? { matricula: f.matricula.value, setor: f.setor.value } : {})
    } }, servicos.salvar, 'Cadastro salvo.');
  });
  formSaldo.addEventListener('submit', evento => {
    evento.preventDefault(); const f = campos(formSaldo);
    const item = dados.materiais?.find(item => item.id === f.materialId.value);
    void gravar(formSaldo, { materialId: f.materialId.value, localId: f.localId.value,
      quantidade: Number(f.quantidade.value), motivo: f.motivo.value,
      identificadores: item?.controle === 'individualizado' ? identificadoresDoTexto(f.identificadores.value) : []
    }, servicos.saldoInicial, 'Saldo inicial registrado.', true);
  });
  porId('dsips-material-new').addEventListener('click', novoMaterial);
  porId('dsips-catalog-new').addEventListener('click', novoCatalogo);
  porId('dsips-catalog-type').addEventListener('change', () => { novoCatalogo(); renderizarCatalogo(); });
  porId('dsips-material-search').addEventListener('input', renderizarMateriais);
  porId('dsips-catalog-search').addEventListener('input', renderizarCatalogo);
  campos(formSaldo).materialId.addEventListener('change', atualizarIdentificadores);
  campos(formSaldo).identificadores.addEventListener('input', atualizarIdentificadores);
  document.querySelectorAll('[data-dsips-refresh]').forEach(botao => botao.addEventListener('click', () => carregar(pagina)));
  return { carregar, sairDaPagina() { ++revisao; pagina = ''; }, limpar() {
    ++revisao; pagina = ''; dados = {}; pendentes.clear(); status('');
    novoMaterial(); novoCatalogo(); formSaldo.reset();
    for (const id of ['dsips-material-list', 'dsips-catalog-list', 'dsips-stock-list', 'dsips-unit-list', 'dsips-event-list', 'dsips-kpis']) porId(id).replaceChildren();
  } };
}
