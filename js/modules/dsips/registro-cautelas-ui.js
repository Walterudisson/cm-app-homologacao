import {criarPaginadorLocal} from '../../ui/paginador.js?v=1.13.33-h.1';
import {criarAutocomplete} from '../../ui/autocomplete.js?v=1.13.32-h.1';
import {
  listarCadastroDsips, listarUnidadesDsips, registrarCautelaDsips, registrarDevolucaoDsips
} from './service.js?v=1.13.16-h.3';
import {
  podeConsultarCautelasDsips, podeRegistrarCautelasDsips,
  saldoDisponivelDsips, unidadesDisponiveisDsips,
  validarCautelaDsips, filtrarCautelasDsips, STATUS_CAUTELA_DSIPS, classeStatusCautelaDsips
} from './registro-cautelas-model.js?v=1.13.30-h.1';
import { podeDevolverCautelaDsips, itensPendentesDevolucaoDsips, prepararDevolucaoDsips,
  devolucaoIntegralDsips, criarReciboDevolucaoDsips } from './devolucoes-model.js?v=1.13.16-h.3';

import {filtrarMateriaisPdv, criarIconePdv} from './pdv-model.js?v=1.13.22-h.1';

export function criarRegistroCautelasDsips({ obterUsuario, confirmar, notificar = () => {} }) {
  const porId = id => document.getElementById(id);
  const secao = porId('sec-dsips-cautelas');
  const form = porId('dsips-cautelas-form');
  const editor = porId('dsips-cautelas-editor');
  const editorStatus = porId('dsips-cautelas-editor-status');
  const status = porId('dsips-cautelas-status');
  const lista = porId('dsips-cautelas-list');
  const modo = porId('dsips-cautelas-mode');
  const painelConsulta=porId('dsips-cautelas-consulta');
  const atualizarBotao = porId('dsips-cautelas-refresh');
  const cancelarBotao = porId('dsips-cautelas-cancel');
  const enviarBotao = porId('dsips-cautelas-submit');
  const usuarioBusca = porId('dsips-cautelas-user-search');
  const usuarioSelect = form.elements.namedItem('responsavelId');
  const comboResponsavel=criarAutocomplete({mensagemSelecionado:'Responsável selecionado.',raiz:porId('dsips-responsavel-combo'),campo:usuarioBusca,valor:usuarioSelect,rotulo:p=>p.nome,detalhe:p=>p.matricula?'Matrícula '+p.matricula:'',pesquisa:p=>[p.nome,p.matricula],aoAlterar:()=>{pendente=null;atualizarBotoes();}});
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
  const kpis=[...secao.querySelectorAll('[data-cautelas-kpi]')];
  const devolucaoEditor = porId('dsips-devolucao-editor');
  const devolucaoForm = porId('dsips-devolucao-form');
  const devolucaoCampos = porId('dsips-devolucao-campos');
  const devolucaoItens = porId('dsips-devolucao-itens');
  const devolucaoResponsavel = porId('dsips-devolucao-responsavel');
  const devolucaoStatus = porId('dsips-devolucao-status');
  const devolucaoTudo = porId('dsips-devolucao-tudo');
  const devolucaoCancelar = porId('dsips-devolucao-cancel');
  const devolucaoEnviar = porId('dsips-devolucao-submit');
  const pdvGrid=porId('dsips-pdv-materials'),pdvBusca=porId('dsips-pdv-search'),pdvEntrega=porId('dsips-pdv-entrega'),pdvRetorno=porId('dsips-pdv-retorno'),pdvConsulta=porId('dsips-pdv-consulta');
  const menos=porId('dsips-pdv-minus'),mais=porId('dsips-pdv-plus'),rapidos=porId('dsips-pdv-quick'),saldoPrevisto=porId('dsips-pdv-balance');
  let cautelaDevolucao = null, linhasDevolucao = [], reciboDevolucao = null, envioIncerto = false;

  let cautelas = [], responsaveis = [], materiais = [], estoque = [];
  let unidadesPorMaterial = {}, cesta = [];
  let pronto = false, carregando = false, gravando = false, confirmando = false, falha = '';
  const paginador=criarPaginadorLocal({lista,tamanho:20,renderizar,podeNavegar:()=>autorizado()&&!gravando&&!confirmando&&!envioIncerto&&editor.classList.contains('hidden')&&devolucaoEditor.classList.contains('hidden'),rotulo:'Páginas de cautelas'});
  const paginadorPdv=criarPaginadorLocal({lista:pdvGrid,tamanho:24,renderizar:renderizarPdv,podeNavegar:()=>pronto&&podeGravar()&&!gravando&&!confirmando&&!carregando,rotulo:'Páginas de materiais disponíveis'});
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
  function atualizarBotoes() {
    const bloqueado = carregando || gravando || confirmando;
    const semEntrega = bloqueado || !pronto || !podeGravar() || !responsaveis.some(p => p.ativo !== false && p.id) ||
      !materiais.some(item => item.ativo !== false && saldoDisponivelDsips(item.id, estoque) > 0);
    atualizarBotao.disabled = bloqueado;
    adicionarBotao.disabled = bloqueado || !pronto || !materiaisSelect.value;
    cancelarBotao.disabled = bloqueado;
    enviarBotao.disabled = bloqueado || !cesta.length || !usuarioSelect.value;
    comboResponsavel.setDisabled(bloqueado||!pronto||!podeGravar());
    devolucaoCampos.disabled = bloqueado || envioIncerto;
    devolucaoCancelar.disabled = bloqueado || envioIncerto;
    devolucaoEnviar.disabled = bloqueado || !cautelaDevolucao;
    if(envioIncerto) {
      atualizarBotao.disabled = true;
      devolucaoEnviar.textContent = 'Repetir confirmação';
    } else {
      devolucaoEnviar.textContent = 'Conferir e registrar devolução';
    }
    const operacaoAberta=!editor.classList.contains('hidden')||!devolucaoEditor.classList.contains('hidden');
    pdvEntrega.disabled=semEntrega||envioIncerto||operacaoAberta;
    pdvConsulta.disabled=bloqueado||envioIncerto||operacaoAberta;
    kpis.forEach(b=>{b.disabled=pdvConsulta.disabled||!pronto||!autorizado();b.setAttribute('aria-pressed',String(!painelConsulta.classList.contains('hidden')&&filtro.value===b.dataset.cautelasKpi));});
    pdvRetorno.disabled=bloqueado||!pronto||envioIncerto||!editor.classList.contains('hidden')||!devolucaoEditor.classList.contains('hidden');
    pdvGrid.querySelectorAll('button').forEach(b=>{b.disabled=bloqueado||!pronto||!podeGravar();});
    atualizarQuantidade();
  }
  function atualizarUsuarios(){comboResponsavel.setItems(responsaveis.filter(p=>p.ativo!==false&&p.id));}
  function atualizarQuantidade(){
    const m=materialPorId(materiaisSelect.value),saldo=m?saldoDisponivelDsips(m.id,estoque):0,n=Number(quantidade.value);
    const livre=Boolean(m&&m.controle!=='individualizado'&&pronto&&podeGravar()&&!carregando&&!gravando&&!confirmando);
    quantidade.disabled=!m||carregando||gravando||confirmando;
    menos.hidden=mais.hidden=rapidos.hidden=!m||m.controle==='individualizado';
    menos.disabled=!livre||n<=1;mais.disabled=!livre||n>=saldo;
    const valido=/^[0-9]+$/.test(quantidade.value)&&Number.isSafeInteger(n)&&n>=1&&n<=saldo;
    saldoPrevisto.textContent=m?(valido?'Saldo após entrega: '+(saldo-n)+' '+(m.unidade||'un'):'Disponível: '+saldo+' '+(m.unidade||'un')):'';
    adicionarBotao.disabled=adicionarBotao.disabled||!valido;
    rapidos.replaceChildren();
    if(livre)for(const q of [1,10,25,50].filter(q=>q<=saldo)){const b=elemento('button','app-button app-button-secondary',q);b.type='button';b.setAttribute('aria-pressed',String(n===q));b.addEventListener('click',()=>definirQuantidade(q));rapidos.append(b);}
  }
  function definirQuantidade(n){const m=materialPorId(materiaisSelect.value);if(!m||m.controle==='individualizado'||!podeGravar()||gravando||confirmando||carregando)return;quantidade.value=String(Math.min(saldoDisponivelDsips(m.id,estoque),Math.max(1,n)));atualizarBotoes();}
  function renderizarPdv(){
    paginadorPdv.ocultar();pdvGrid.replaceChildren();
    for(const material of paginadorPdv.recortar(filtrarMateriaisPdv(materiais,estoque,cesta,pdvBusca.value),pdvBusca.value)){
      const b=elemento('button','cm-pdv-material');b.type='button';b.dataset.materialId=material.id;b.dataset.cor=material.visual.cor;
      b.append(criarIconePdv(material.visual.icone),elemento('strong','',material.nome),elemento('span','',material.saldo+' '+(material.unidade||'un')+' disponíveis'));
      b.setAttribute('aria-pressed',String(materiaisSelect.value===material.id));
      b.addEventListener('click',async()=>{if(!pronto||!podeGravar()||gravando||confirmando||carregando||!ativo()||editor.classList.contains('hidden'))return;
        materiaisSelect.value=material.id;await selecionarMaterial();if(materiaisSelect.value===material.id&&!editor.classList.contains('hidden')){renderizarPdv();atualizarBotoes();if(material.controle==='individualizado')identificacoesBox.scrollIntoView({block:'nearest'});else {quantidade.focus({preventScroll:true});quantidade.select();}}
      });pdvGrid.append(b);
    }
    atualizarBotoes();
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
    renderizarPdv();
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
          quantidade.value=String(identificacoes.querySelectorAll('input:checked').length);atualizarBotoes();
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
      : 'Nenhum material adicionado à cautela. Selecione um material.';
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
    paginadorPdv.reset();pdvBusca.value='';
    form.reset();
    cesta=[];pendente=null;comboResponsavel.reset();
    limparSelecaoMaterial();
    atualizarUsuarios();atualizarMateriais();
    renderizarCesta();
    editorStatus.textContent='';
  }
  function abrirEditor() {
    if(!devolucaoEditor.classList.contains('hidden')) {
      notificar('Conclua ou cancele a devolução antes de iniciar outra entrega.','aviso');return;
    }
    if(!pronto||!podeGravar()||gravando||confirmando||carregando) return;
    fecharEditor();
    painelConsulta.classList.add('hidden');editor.classList.remove('hidden');
    atualizarBotoes();
    editor.scrollIntoView({block:'start',behavior:'smooth'});
    usuarioBusca.focus({preventScroll:true});
  }
  function fecharDevolucao() {
    devolucaoEditor.classList.add('hidden');
    devolucaoForm.reset();
    devolucaoItens.replaceChildren();
    devolucaoResponsavel.textContent='';
    devolucaoStatus.textContent='';
    cautelaDevolucao=null;linhasDevolucao=[];reciboDevolucao=null;envioIncerto=false;
  }
  function abrirDevolucao(cautela) {
    if(!pronto||!podeGravar()||gravando||confirmando||carregando||envioIncerto||
        !podeDevolverCautelaDsips(cautela)) return;
    if(!editor.classList.contains('hidden')||!devolucaoEditor.classList.contains('hidden')) {
      notificar('Conclua ou cancele a operação aberta antes de iniciar outra.','aviso');return;
    }
    fecharDevolucao();
    cautelaDevolucao=cautela;
    devolucaoResponsavel.textContent=(cautela.responsavelNome||'Responsável não informado')+
      ' · Registro '+cautela.id.slice(0,10);
    for(const item of itensPendentesDevolucaoDsips(cautela)) {
      const bloco=elemento('article','dsips-devolucao-item');
      bloco.append(elemento('strong','',item.nome||'Material'),
        elemento('p','dsips-cautelas-card-meta',
          'Entregue: '+item.entregue+' · Devolvido: '+item.devolvida+' · Pendente: '+item.pendente+' '+(item.unidade||'un')));
      const label=elemento('label','dsips-devolucao-quantity','Quantidade a devolver');
      const qtd=document.createElement('input');
      qtd.type='number';qtd.min='0';qtd.max=String(item.pendente);qtd.step='1';qtd.value='0';
      qtd.inputMode='numeric';qtd.required=true;
      qtd.readOnly=item.controle==='individualizado';
      qtd.setAttribute('aria-label','Quantidade a devolver de '+(item.nome||'material'));
      label.append(qtd);bloco.append(label);
      const unidades=elemento('div','dsips-cautelas-units');
      if(qtd.readOnly) {
        for(const unidade of item.unidades) {
          const escolha=elemento('label','dsips-cautelas-unit-choice');
          const input=document.createElement('input');input.type='checkbox';input.value=unidade.id;
          input.addEventListener('change',()=>{qtd.value=String(unidades.querySelectorAll('input:checked').length);});
          escolha.append(input,elemento('span','',unidade.identificacao||unidade.id));unidades.append(escolha);
        }
        if(!item.unidades.length) unidades.append(elemento('p','dsips-editor-status','Nenhuma identificação pendente localizada.'));
        bloco.append(unidades);
      }
      linhasDevolucao.push({item,qtd,unidades});
      devolucaoItens.append(bloco);
    }
    painelConsulta.classList.add('hidden');devolucaoEditor.classList.remove('hidden');
    atualizarBotoes();
    devolucaoEditor.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function iniciarDevolucaoPorId(id){
    if(!ativo()||!podeGravar()||!pronto||carregando||gravando||confirmando||envioIncerto)return false;
    const cautela=cautelas.find(c=>c.id===id);
    if(!podeDevolverCautelaDsips(cautela)){notificar('Esta cautela não possui pendências disponíveis.','aviso');return false;}
    abrirDevolucao(cautela);return cautelaDevolucao?.id===id&&!devolucaoEditor.classList.contains('hidden');
  }
  function preencherDevolucaoIntegral() {
    if(!cautelaDevolucao||!podeGravar()||carregando||gravando||confirmando||envioIncerto) return;
    const todos=devolucaoIntegralDsips(cautelaDevolucao);
    for(const linha of linhasDevolucao) {
      const item=todos.find(i=>i.materialId===linha.item.materialId);
      linha.qtd.value=String(item.quantidade);
      for(const input of linha.unidades.querySelectorAll('input[type=checkbox]'))
        input.checked=item.unidadeIds.includes(input.value);
    }
    devolucaoStatus.textContent='Todos os itens pendentes selecionados. Confira antes de registrar.';
  }
  async function salvarDevolucao(evento) {
    evento.preventDefault();
    if(!podeGravar()||!pronto||carregando||gravando||confirmando||!cautelaDevolucao||
        devolucaoEditor.classList.contains('hidden')||!ativo()) return;
    let pedido;
    try{
      if(!envioIncerto&&!devolucaoForm.reportValidity()) return;
      pedido=prepararDevolucaoDsips(cautelaDevolucao,{
        observacoes:devolucaoForm.elements.namedItem('observacoes').value,
        itens:linhasDevolucao.filter(l=>Number(l.qtd.value)!==0).map(l=>({
          materialId:l.item.materialId,quantidade:Number(l.qtd.value),
          unidadeIds:[...l.unidades.querySelectorAll('input:checked')].map(i=>i.value)
        }))
      });
      if(envioIncerto&&reciboDevolucao?.assinatura!==JSON.stringify(pedido))
        throw new Error('O lançamento anterior ainda não foi confirmado. Repita a mesma devolução.');
    }catch(erro){devolucaoStatus.textContent=erro.message;return;}
    const uid=obterUsuario()?.uid,epoca=sessao,original=cautelaDevolucao;
    confirmando=true;atualizarBotoes();
    let aceito=false;
    try{
      const descricao=pedido.itens.map(item=>{
        const linha=linhasDevolucao.find(l=>l.item.materialId===item.materialId).item;
        return linha.nome+': '+item.quantidade+' '+(linha.unidade||'un')+
          (item.unidadeIds.length?' ('+item.unidadeIds.map(id=>linha.unidades.find(u=>u.id===id)?.identificacao||id).join(', ')+')':'');
      }).join('; ');
      aceito=await confirmar({titulo:'Confirmar devolução dos materiais?',
        mensagem:'Responsável: '+(original.responsavelNome||'Usuário')+'. Retorno: '+descricao+
          '. Confirme a devolução física. O estoque de origem será atualizado.',
        confirmarTexto:'Registrar devolução'});
    }catch(erro){if(epoca===sessao)devolucaoStatus.textContent='Não foi possível abrir a confirmação.';}
    finally{if(epoca===sessao){confirmando=false;atualizarBotoes();}}
    if(!aceito||epoca!==sessao||uid!==obterUsuario()?.uid||!podeGravar()||!ativo()||
        cautelaDevolucao!==original||devolucaoEditor.classList.contains('hidden')) return;
    reciboDevolucao=criarReciboDevolucaoDsips(pedido,reciboDevolucao,()=>crypto.randomUUID());
    const operacaoId=reciboDevolucao.operacaoId;
    gravando=true;atualizarBotoes();
    devolucaoStatus.textContent='Registrando devolução com segurança…';
    try{
      await registrarDevolucaoDsips({...pedido,operacaoId});
      if(epoca!==sessao||uid!==obterUsuario()?.uid||!podeGravar()) return;
      envioIncerto=false;
      fecharDevolucao();
      notificar('Devolução registrada no HML.','sucesso');
      painelConsulta.classList.remove('hidden');
      gravando=false;
      await carregar();
    }catch(erro){
      if(epoca!==sessao||uid!==obterUsuario()?.uid||!podeGravar())return;
      console.warn('Falha ao registrar devolução.',erro);
      const rejeitado=['functions/permission-denied','permission-denied','functions/invalid-argument',
        'functions/failed-precondition','functions/not-found','functions/already-exists',
        'functions/unauthenticated'].includes(erro?.code);
      envioIncerto=!rejeitado;
      devolucaoStatus.textContent=envioIncerto
        ?'Não foi possível confirmar o resultado. Repita a confirmação sem alterar os dados: o identificador da operação será preservado.'
        :'O registro foi recusado. Confira a cautela e atualize a consulta antes de tentar novamente.';
      notificar('Devolução não confirmada.','erro');
    }finally{if(epoca===sessao){gravando=false;atualizarBotoes();}}
  }
  function renderizar() {
    paginador.ocultar();lista.replaceChildren();
    const podeEscrever=podeGravar();
    modo.textContent=podeEscrever?'':'Somente consulta';
    pdvEntrega.classList.toggle('hidden',!podeEscrever);pdvRetorno.classList.toggle('hidden',!podeEscrever);
    if(!podeEscrever&&!editor.classList.contains('hidden')) fecharEditor();
    if(!podeEscrever&&!devolucaoEditor.classList.contains('hidden')) fecharDevolucao();
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
    for(const cautela of paginador.recortar(filtradas,JSON.stringify([busca.value,filtro.value]))) {
      const card=elemento('article','dsips-cautelas-card');
      const cab=elemento('div','dsips-cautelas-card-heading');
      cab.append(elemento('h3','',cautela.responsavelNome || 'Responsável não informado'),
        elemento('span',classeStatusCautelaDsips(cautela.status),
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
          ' · Devolvido: '+Number(item.devolvida||0)+' · Pendente: '+restante));
        if(item.controle==='individualizado') {
          const ids=(item.unidades||[]).filter(u=>!(item.unidadesDevolvidas||[]).includes(u.id));
          if(ids.length) card.append(elemento('p','dsips-cautelas-card-meta','Identificações pendentes: '+ids.map(u=>u.identificacao||u.id).join(', ')));
        }
      }
      if(cautela.observacoes) card.append(elemento('p','dsips-cautelas-card-meta',cautela.observacoes));
      if(podeEscrever&&podeDevolverCautelaDsips(cautela)) {
        const devolver=elemento('button','app-button app-button-secondary','Registrar devolução');
        devolver.type='button';
        devolver.setAttribute('aria-label','Registrar devolução de '+(cautela.responsavelNome||'cautela'));
        devolver.disabled=gravando||confirmando||envioIncerto;
        devolver.addEventListener('click',()=>abrirDevolucao(cautela));
        card.append(devolver);
      }
      lista.append(card);
    }
  }
  function limpar() {
    paginador.reset();paginadorPdv.reset();revisao++;sessao++;revisaoUnidades++;
    sairTela();pdvBusca.value='';pdvGrid.replaceChildren();
    fecharDevolucao();
    cautelas=[];responsaveis=[];materiais=[];estoque=[];unidadesPorMaterial={};
    cesta=[];pendente=null;pronto=false;carregando=false;gravando=false;confirmando=false;falha='';
    busca.value='';filtro.value='todas';
    editor.classList.add('hidden');form.reset();usuarioBusca.value='';
    identificacoes.replaceChildren();identificacoesBox.classList.add('hidden');
    editorStatus.textContent='';identificacoesStatus.textContent='';
    comboResponsavel.reset();comboResponsavel.setItems([]);
    materiaisSelect.replaceChildren(new Option('Selecione um material disponível',''));
    renderizarCesta();renderizar();
  }
  async function carregar() {
    if(!autorizado()) {limpar();return;}
    if(gravando||confirmando||envioIncerto) return;
    paginador.reset();paginadorPdv.reset();const uid=obterUsuario()?.uid,token=++revisao;
    ++revisaoUnidades;
    fecharEditor();fecharDevolucao();
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
  devolucaoTudo.addEventListener('click',preencherDevolucaoIntegral);
  devolucaoCancelar.addEventListener('click',()=>{if(!gravando&&!confirmando&&!envioIncerto){fecharDevolucao();painelConsulta.classList.remove('hidden');atualizarBotoes();}});
  devolucaoForm.addEventListener('submit',evento=>{void salvarDevolucao(evento);});
  cancelarBotao.addEventListener('click',fecharEditor);
  adicionarBotao.addEventListener('click',adicionarMaterial);
  quantidade.addEventListener('focus',()=>{if(!quantidade.readOnly)quantidade.select();});
  quantidade.addEventListener('input',atualizarBotoes);
  quantidade.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!adicionarBotao.disabled)adicionarMaterial();}});
  menos.addEventListener('click',()=>definirQuantidade((Number(quantidade.value)||1)-1));
  mais.addEventListener('click',()=>definirQuantidade((Number(quantidade.value)||0)+1));
  materiaisSelect.addEventListener('change',()=>{renderizarPdv();void selecionarMaterial();});
  pdvBusca.addEventListener('input',renderizarPdv);
  pdvEntrega.addEventListener('click',()=>{if(!pdvEntrega.disabled)abrirEditor();});
  function focarConsulta(){painelConsulta.classList.remove('hidden');atualizarBotoes();painelConsulta.scrollIntoView({block:'start',behavior:'smooth'});}
  kpis.forEach(b=>b.addEventListener('click',()=>{if(b.disabled||!autorizado()||!ativo())return;paginador.reset();filtro.value=b.dataset.cautelasKpi;busca.value='';renderizar();focarConsulta();}));
  pdvConsulta.addEventListener('click',()=>{if(!pdvConsulta.disabled){paginador.reset();filtro.value='todas';busca.value='';renderizar();focarConsulta();busca.focus({preventScroll:true});}});
  pdvRetorno.addEventListener('click',()=>{if(!pdvRetorno.disabled&&podeGravar()){paginador.reset();filtro.value='pendentes';busca.value='';renderizar();focarConsulta();busca.focus({preventScroll:true});}});
  function sairTela(){document.body.classList.remove('cm-pdv-kiosk');painelConsulta.classList.add('hidden');comboResponsavel.fechar();}
  atualizarBotao.addEventListener('click',()=>{void carregar();});
  form.addEventListener('submit',evento=>{void salvar(evento);});
  busca.addEventListener('input',renderizar);
  filtro.addEventListener('change',renderizar);
  limpar();
  return {carregar,limpar,sairTela,iniciarDevolucaoPorId};
}
