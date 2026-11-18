import {
  listarCadastroDsips, listarUnidadesDsips, registrarCautelaDsips
} from './service.js?v=1.13.16-h.1';
import {
  podeConsultarCautelasDsips, podeRegistrarCautelasDsips,
  saldoDisponivelDsips, unidadesDisponiveisDsips,
  validarCautelaDsips, filtrarCautelasDsips, STATUS_CAUTELA_DSIPS
} from './registro-cautelas-model.js?v=1.13.16-h.1';

export function criarRegistroCautelasDsips({ obterUsuario, confirmar, notificar = () => {} }) {
  const porId = id => document.getElementById(id);
  const secao = porId('sec-dsips-cautelas');
  const form = porId('dsips-cautelas-form');
  const editor = porId('dsips-cautelas-editor');
  const editorStatus = porId('dsips-cautelas-editor-status');
  const status = porId('dsips-cautelas-status');
  const lista = porId('dsips-cautelas-list');
  const modo = porId('dsips-cautelas-mode');
  const abrirBotao = porId('dsips-cautelas-new');
  const atualizarBotao = porId('dsips-cautelas-refresh');
  const cancelarBotao = porId('dsips-cautelas-cancel');
  const enviarBotao = porId('dsips-cautelas-submit');
  const usuarioBusca = porId('dsips-cautelas-user-search');
  const usuarioSelect = form.elements.namedItem('responsavelId');
  const materiaisSelect = porId('dsips-cautelas-material');
  const quantidade = porId('dsips-cautelas-quantity');
  const identificacoesBox = porId('dsips-cautelas-units-box');
  const identificacoes = porId('dsips-cautelas-units');
  const identificacoesStatus = porId('dsips-cautelas-units-status');
  const adicionarBotao = porId('dsips-cautelas-add');
  const cestaLista = porId('dsips-cautelas-cart');
  const cestaStatus = porId('dsips-cautelas-cart-status');
  const busca = porId('dsips-cautelas-search');
  const filtro = porId('dsips-cautelas-filter');
  const observacoes = form.elements.namedItem('observacoes');
  const total = porId('dsips-cautelas-total');
  const abertas = porId('dsips-cautelas-abertas');

  let cautelas = [], responsaveis = [], materiais = [], estoque = [];
  let unidadesPorMaterial = {}, cesta = [];
  let pronto = false, carregando = false, gravando = false, confirmando = false, falha = '';
  let revisao = 0, sessao = 0, revisaoUnidades = 0, pendente = null;
  const autorizado = () => podeConsultarCautelasDsips(obterUsuario());
  const podeGravar = () => podeRegistrarCautelasDsips(obterUsuario());
  const ativo = () => !secao.classList.contains('hidden');
  const materialPorId = id => materiais.find(item => item.id === id);
  const nomeMaterial = id => materialPorId(id)?.nome || 'Material indisponível';

  function elemento(tag, classe, texto) {
    const node = document.createElement(tag);
    if (classe) node.className = classe;
    if (texto !== undefined) node.textContent = String(texto ?? '');
    return node;
  }
  function vazio(container, titulo, detalhe) {
    const card = elemento('div','app-card dsips-empty');
    card.append(elemento('strong','',titulo),elemento('p','',detalhe));
    container.append(card);
  }
  function normalizar(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  }
  function atualizarBotoes() {
    const bloqueado = carregando || gravando || confirmando;
    abrirBotao.disabled = bloqueado || !pronto || !responsaveis.some(p => p.ativo !== false) ||
      !materiais.some(item => item.ativo !== false && saldoDisponivelDsips(item.id, estoque) > 0);
    atualizarBotao.disabled = bloqueado;
    adicionarBotao.disabled = bloqueado || !pronto || !materiaisSelect.value;
    cancelarBotao.disabled = bloqueado;
    enviarBotao.disabled = bloqueado || !cesta.length;
  }
  function atualizarUsuarios() {
    const atual = usuarioSelect.value;
    const termo = normalizar(usuarioBusca.value);
    usuarioSelect.replaceChildren(new Option('Selecione um usuário ativo do CMAPP',''));
    for (const pessoa of responsaveis) {
      if (pessoa.ativo === false) continue;
      if (termo && !normalizar(pessoa.nome + ' ' + (pessoa.matricula || '')).includes(termo) && pessoa.id !== atual) continue;
      usuarioSelect.add(new Option(pessoa.nome + (pessoa.matricula ? ' · ' + pessoa.matricula : ''),pessoa.id));
    }
    if (responsaveis.some(p=>p.id===atual && p.ativo!==false)) usuarioSelect.value = atual;
  }
  function atualizarMateriais() {
    const selecionado = materiaisSelect.value;
    materiaisSelect.replaceChildren(new Option('Selecione um material disponível',''));
    for (const material of materiais) {
      if (material.ativo === false || cesta.some(item=>item.materialId===material.id)) continue;
      const saldo = saldoDisponivelDsips(material.id,estoque);
      if (saldo <= 0) continue;
      materiaisSelect.add(new Option(material.nome+' · '+saldo+' '+(material.unidade || 'un'),material.id));
    }
    if ([...materiaisSelect.options].some(o=>o.value===selecionado)) materiaisSelect.value=selecionado;
    atualizarBotoes();
  }
  function limparSelecaoMaterial() {
    ++revisaoUnidades;
    quantidade.value = '';
    quantidade.readOnly = false;
    quantidade.min = '1';
    identificacoesBox.classList.add('hidden');
    identificacoes.replaceChildren();
    identificacoesStatus.textContent = '';
  }
  async function selecionarMaterial() {
    limparSelecaoMaterial();
    const material = materialPorId(materiaisSelect.value);
    if (!material) { atualizarBotoes(); return; }
    const disponivel = saldoDisponivelDsips(material.id,estoque);
    quantidade.max = String(disponivel);
    if (material.controle !== 'individualizado') { quantidade.value='1'; atualizarBotoes(); return; }
    quantidade.readOnly = true;
    quantidade.value = '0';
    identificacoesBox.classList.remove('hidden');
    const token = ++revisaoUnidades, epoca=sessao, uid=obterUsuario()?.uid;
    identificacoesStatus.textContent = 'Consultando as identificações disponíveis…';
    try {
      if (!Object.hasOwn(unidadesPorMaterial,material.id)) {
        unidadesPorMaterial[material.id] = await listarUnidadesDsips(material.id);
      }
      if (token!==revisaoUnidades || epoca!==sessao || uid!==obterUsuario()?.uid ||
          materiaisSelect.value!==material.id || !ativo() || !podeGravar()) return;
      const unidades = unidadesDisponiveisDsips(unidadesPorMaterial[material.id]);
      identificacoes.replaceChildren();
      for(const unidade of unidades) {
        const label=elemento('label','dsips-cautelas-unit-choice');
        const checkbox=document.createElement('input');
        checkbox.type='checkbox';checkbox.value=unidade.id;
        checkbox.addEventListener('change',()=>{
          quantidade.value=String(identificacoes.querySelectorAll('input:checked').length);
        });
        label.append(checkbox,elemento('span','',unidade.identificacao || unidade.id));
        identificacoes.append(label);
      }
      identificacoesStatus.textContent=unidades.length
        ? 'Selecione as identificações que serão entregues.'
        : 'Nenhuma identificação disponível neste material.';
    } catch (erro) {
      if(token!==revisaoUnidades || epoca!==sessao || uid!==obterUsuario()?.uid) return;
      console.warn('Falha ao consultar unidades de cautela.',erro);
      identificacoesStatus.textContent='Falha ao consultar identificações. Selecione novamente o material.';
    }
    atualizarBotoes();
  }
  function renderizarCesta() {
    cestaLista.replaceChildren();
    cestaStatus.textContent=cesta.length
      ? cesta.length+' material(is) na cautela. Confira os itens antes de confirmar.'
      : 'Cesta vazia. Selecione um material e use Adicionar.';
    for(const item of cesta) {
      const material=materialPorId(item.materialId);
      const card=elemento('article','dsips-cautelas-cart-item');
      const texto=elemento('div','dsips-cautelas-cart-copy');
      texto.append(elemento('strong','',nomeMaterial(item.materialId)),
        elemento('p','',item.quantidade+' '+(material?.unidade || 'un')+
          (item.unidadeIds.length?' · '+item.unidadeIds.map(id=>
            unidadesPorMaterial[item.materialId]?.find(u=>u.id===id)?.identificacao || id).join(', '):'')));
      const remover=elemento('button','app-button app-button-secondary','Remover');
      remover.type='button';
      remover.addEventListener('click',()=>{
        if(gravando||confirmando) return;
        cesta=cesta.filter(registro=>registro.materialId!==item.materialId);
        pendente=null;
        renderizarCesta();atualizarMateriais();
      });
      card.append(texto,remover);cestaLista.append(card);
    }
    atualizarBotoes();
  }
  function adicionarMaterial() {
    if (!pronto || !podeGravar() || gravando || confirmando || cesta.length>=20) {
      editorStatus.textContent=cesta.length>=20?'Limite de 20 materiais por cautela.':'';
      return;
    }
    const material=materialPorId(materiaisSelect.value);
    if (!material || cesta.some(item=>item.materialId===material.id)) return;
    const disponivel=saldoDisponivelDsips(material.id,estoque);
    const quantidadeSelecionada=Number(quantidade.value);
    const selecionadas=[...identificacoes.querySelectorAll('input:checked')].map(input=>input.value);
    if (!Number.isSafeInteger(quantidadeSelecionada) || quantidadeSelecionada<1 ||
        quantidadeSelecionada>disponivel ||
        (material.controle==='individualizado' && quantidadeSelecionada!==selecionadas.length)) {
      editorStatus.textContent='Informe uma quantidade válida dentro do saldo disponível ou selecione as identificações.';
      return;
    }
    cesta.push({materialId:material.id,quantidade:quantidadeSelecionada,
      unidadeIds:material.controle==='individualizado'?selecionadas:[]});
    pendente=null;
    editorStatus.textContent='';
    materiaisSelect.value='';
    limparSelecaoMaterial();
    atualizarMateriais();renderizarCesta();
  }
  function fecharEditor() {
    editor.classList.add('hidden');
    form.reset();
    cesta=[];pendente=null;usuarioBusca.value='';
    limparSelecaoMaterial();
    atualizarUsuarios();atualizarMateriais();
    renderizarCesta();
    editorStatus.textContent='';
  }
  function abrirEditor() {
    if(!pronto||!podeGravar()||gravando||confirmando||carregando) return;
    fecharEditor();
    editor.classList.remove('hidden');
    editor.scrollIntoView({block:'start',behavior:'smooth'});
    usuarioSelect.focus({preventScroll:true});
  }
  function renderizar() {
    lista.replaceChildren();
    const podeEscrever=podeGravar();
    modo.textContent=podeEscrever?'Consulta e registro de cautelas':'Somente consulta';
    abrirBotao.classList.toggle('hidden',!podeEscrever);
    if(!podeEscrever&&!editor.classList.contains('hidden')) fecharEditor();
    atualizarBotoes();
    if(!autorizado()) {
      status.textContent='Acesso não autorizado.';
      total.textContent='0';abertas.textContent='0';return;
    }
    total.textContent=String(cautelas.length);
    abertas.textContent=String(cautelas.filter(c=>['aberta','parcial'].includes(c.status)).length);
    if(carregando) {
      status.textContent='Consultando as cautelas no HML…';
      vazio(lista,'Carregando cautelas','Aguarde a consulta ao DSIPS.');return;
    }
    if(falha) {
      status.textContent=falha;vazio(lista,'Consulta indisponível',
        'Verifique seu acesso e use Atualizar.');return;
    }
    if(!pronto) {
      status.textContent='Abra Cautelas para consultar os registros.';return;
    }
    const filtradas=filtrarCautelasDsips(cautelas,busca.value,filtro.value);
    status.textContent=filtradas.length+' de '+cautelas.length+' cautelas encontradas.';
    if(!filtradas.length) {
      vazio(lista,cautelas.length?'Nenhuma cautela corresponde aos filtros':'Nenhuma cautela registrada',
        cautelas.length?'Altere os filtros para consultar outros registros.':
          'Registre uma cautela de teste com materiais disponíveis.');
      return;
    }
    for(const cautela of filtradas) {
      const card=elemento('article','dsips-cautelas-card');
      const cab=elemento('div','dsips-cautelas-card-heading');
      cab.append(elemento('h3','',cautela.responsavelNome || 'Responsável não informado'),
        elemento('span',cautela.status==='encerrada'?'dsips-status-inactive':'dsips-status-active',
          STATUS_CAUTELA_DSIPS[cautela.status] || cautela.status || 'Sem situação'));
      card.append(cab);
      const detalhes=[cautela.responsavelMatricula?'Matrícula '+cautela.responsavelMatricula:'',
        cautela.criadoEm?.toDate?.()?.toLocaleString('pt-BR') || '',
        cautela.id ? 'Registro '+cautela.id.slice(0,10) : ''].filter(Boolean).join(' · ');
      if(detalhes) card.append(elemento('p','dsips-cautelas-card-meta',detalhes));
      for(const item of cautela.itens || []) {
        const restante=Math.max(0,Number(item.quantidade||0)-Number(item.devolvida||0));
        card.append(elemento('p','dsips-cautelas-card-line',
          (item.nome || 'Material')+' · Entregue: '+item.quantidade+' '+(item.unidade||'un')+
          ' · Pendente: '+restante));
      }
      if(cautela.observacoes) card.append(elemento('p','dsips-cautelas-card-meta',cautela.observacoes));
      lista.append(card);
    }
  }
  function limpar() {
    revisao++;sessao++;revisaoUnidades++;
    cautelas=[];responsaveis=[];materiais=[];estoque=[];unidadesPorMaterial={};
    cesta=[];pendente=null;pronto=false;carregando=false;gravando=false;confirmando=false;falha='';
    busca.value='';filtro.value='todas';
    editor.classList.add('hidden');form.reset();usuarioBusca.value='';
    identificacoes.replaceChildren();identificacoesBox.classList.add('hidden');
    editorStatus.textContent='';identificacoesStatus.textContent='';
    usuarioSelect.replaceChildren(new Option('Selecione um usuário ativo do CMAPP',''));
    materiaisSelect.replaceChildren(new Option('Selecione um material disponível',''));
    renderizarCesta();renderizar();
  }
  async function carregar() {
    if(!autorizado()) {limpar();return;}
    if(gravando||confirmando) return;
    const uid=obterUsuario()?.uid,token=++revisao;
    ++revisaoUnidades;
    fecharEditor();
    carregando=true;falha='';renderizar();
    try {
      const [listaCautelas,itens,localEstoque,pessoas]=await Promise.all([
        listarCadastroDsips('cautelas'),
        podeGravar()?listarCadastroDsips('materiais'):Promise.resolve([]),
        podeGravar()?listarCadastroDsips('estoque'):Promise.resolve([]),
        podeGravar()?listarCadastroDsips('responsaveis'):Promise.resolve([])
      ]);
      if(token!==revisao || uid!==obterUsuario()?.uid || !autorizado()) return;
      cautelas=Array.isArray(listaCautelas)?listaCautelas:[];
      materiais=Array.isArray(itens)?itens:[];
      estoque=Array.isArray(localEstoque)?localEstoque:[];
      responsaveis=Array.isArray(pessoas)?pessoas:[];
      unidadesPorMaterial={};
      pronto=true;
      atualizarUsuarios();atualizarMateriais();
    } catch(erro) {
      if(token!==revisao || uid!==obterUsuario()?.uid || !autorizado()) return;
      console.warn('Falha ao consultar cautelas DSIPS.',erro);
      pronto=false;
      falha=['permission-denied','functions/permission-denied'].includes(erro?.code)
        ? 'Seu perfil não possui acesso à consulta necessária para cautelas.'
        : 'Falha ao consultar cautelas. Tente Atualizar.';
    } finally {
      if(token===revisao) {carregando=false;renderizar();}
    }
  }
  async function salvar(evento) {
    evento.preventDefault();
    if(!podeGravar()||!pronto||gravando||confirmando||editor.classList.contains('hidden')) return;
    if(!form.reportValidity()) return;
    let pedido;
    try {
      pedido=validarCautelaDsips({
        responsavelId:usuarioSelect.value,itens:cesta,observacoes:observacoes.value
      },{responsaveis,materiais,estoque,unidadesPorMaterial});
    }catch(erro) {editorStatus.textContent=erro.message;return;}
    const uid=obterUsuario()?.uid,epoca=sessao;
    confirmando=true;atualizarBotoes();
    let aceito=false;
    try{
      const pessoa=responsaveis.find(p=>p.id===pedido.responsavelId);
      const descricao=pedido.itens.map(item=>
        nomeMaterial(item.materialId)+': '+item.quantidade+(item.unidadeIds.length?' (identificadas)':'')
      ).join('; ');
      aceito=await confirmar({
        titulo:'Confirmar entrega dos materiais?',
        mensagem:'Responsável: '+(pessoa?.nome||'Usuário')+'. Materiais: '+descricao+
          '. Confirme a entrega física. O estoque e o histórico serão atualizados.',
        confirmarTexto:'Registrar cautela'
      });
    }catch(erro) {
      if(epoca===sessao) editorStatus.textContent='Não foi possível abrir a confirmação. Tente novamente.';
    }finally {
      if(epoca===sessao) {confirmando=false;atualizarBotoes();}
    }
    if(!aceito||epoca!==sessao||uid!==obterUsuario()?.uid||!podeGravar()||!ativo()||
      editor.classList.contains('hidden')) return;
    const assinatura=JSON.stringify(pedido);
    if(!pendente||pendente.assinatura!==assinatura)
      pendente={assinatura,operacaoId:crypto.randomUUID()};
    const operacaoId=pendente.operacaoId;
    gravando=true;atualizarBotoes();
    editorStatus.textContent='Registrando cautela com segurança…';
    try {
      await registrarCautelaDsips({...pedido,operacaoId});
      if(epoca!==sessao||uid!==obterUsuario()?.uid||!podeGravar()) return;
      notificar('Cautela registrada no HML.','sucesso');
      gravando=false;
      await carregar();
    }catch(erro) {
      if(epoca!==sessao||uid!==obterUsuario()?.uid||!podeGravar()) return;
      console.warn('Falha ao registrar cautela.',erro);
      editorStatus.textContent=['permission-denied','functions/permission-denied'].includes(erro?.code)
        ? 'Sem permissão para registrar cautelas.'
        : 'Registro não confirmado. Atualize a consulta antes de tentar novamente.';
      notificar('Não foi possível confirmar a cautela.','erro');
    }finally {
      if(epoca===sessao) {gravando=false;atualizarBotoes();}
    }
  }
  abrirBotao.addEventListener('click',abrirEditor);
  cancelarBotao.addEventListener('click',fecharEditor);
  adicionarBotao.addEventListener('click',adicionarMaterial);
  materiaisSelect.addEventListener('change',()=>{void selecionarMaterial();});
  usuarioBusca.addEventListener('input',atualizarUsuarios);
  atualizarBotao.addEventListener('click',()=>{void carregar();});
  form.addEventListener('submit',evento=>{void salvar(evento);});
  busca.addEventListener('input',renderizar);
  filtro.addEventListener('change',renderizar);
  limpar();
  return {carregar,limpar};
}
