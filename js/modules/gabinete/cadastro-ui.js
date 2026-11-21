import {qualidadeContatoGabinete,ErroCadastroGabinete} from './cadastro-model.js';
import {normalizarBusca} from './agenda-model.js';
import {dataLocalHoje} from './aniversarios-model.js';

// GAB-07: CRUD integralmente em memória para HML. Nenhuma alteração em Firebase/Storage.
export function criarCadastroGabineteUI({armazenamento,obterUsuario,podeGerenciar,notificar,abrirFicha}){
  const secao=document.getElementById('sec-gabinete-cadastros');
  const novo=document.getElementById('gab-cad-novo');
  const termo=document.getElementById('gab-cad-busca');
  const tipoFiltro=document.getElementById('gab-cad-tipo');
  const estadoFiltro=document.getElementById('gab-cad-estado');
  const lista=document.getElementById('gab-cad-lista');
  const vazio=document.getElementById('gab-cad-vazio');
  const total=document.getElementById('gab-cad-total');
  const metricas=document.getElementById('gab-cad-metricas');
  const dialogo=document.getElementById('gab-cad-dialogo');
  const form=document.getElementById('gab-cad-form');
  const titulo=document.getElementById('gab-cad-dialogo-titulo');
  const erro=document.getElementById('gab-cad-erro');
  const cancelar=document.getElementById('gab-cad-cancelar');
  const fechar=document.getElementById('gab-cad-fechar');
  const confirmar=document.getElementById('gab-cad-confirmar');
  const confirmacao=document.getElementById('gab-cad-confirmacao');
  const confirmTexto=document.getElementById('gab-cad-confirmacao-texto');
  const confirmFechar=document.getElementById('gab-cad-confirmacao-fechar');
  const confirmCancelar=document.getElementById('gab-cad-confirmacao-cancelar');
  const confirmExecutar=document.getElementById('gab-cad-confirmacao-executar');
  const campos=['tipo','nome','unidade','funcao','ramal','email','telefoneInstitucional','aniversario'];
  const inputs=Object.fromEntries(campos.map(x=>[x,document.getElementById('gab-cad-'+x)]));
  let alterando=null,acaoConfirmada=null,inicializado=false;
  const autorizado=()=>Boolean(obterUsuario()?.uid&&podeGerenciar()&&armazenamento.usuarioAtual()===obterUsuario().uid);
  const el=(tag,classe='',texto)=>{
    const n=document.createElement(tag);
    if(classe)n.className=classe;
    if(texto!==undefined)n.textContent=String(texto);
    return n;
  };
  const botao=(texto,classe,clique)=>{
    const b=el('button',classe,texto);b.type='button';b.addEventListener('click',clique);return b;
  };
  function abrirModal(d){
    if(typeof d.showModal==='function'){if(!d.open)d.showModal();}
    else d.setAttribute('open','');
  }
  function fecharModal(d){if(d.open&&typeof d.close==='function')d.close();else d.removeAttribute('open');}
  function msgErro(mensagem,campo){
    erro.textContent=mensagem;erro.hidden=false;
    if(campo&&inputs[campo]){inputs[campo].setAttribute('aria-invalid','true');inputs[campo].focus();}
    else erro.focus();
  }
  function limparErros(){
    erro.hidden=true;erro.textContent='';
    for(const input of Object.values(inputs))input.removeAttribute('aria-invalid');
  }
  function entrada(){
    const aniversario=inputs.aniversario.value.trim();
    let data='';
    if(aniversario){
      const m=/^(\d{2})\/(\d{2})$/.exec(aniversario);
      data=m?m[2]+'-'+m[1]:aniversario;
    }
    return {
      tipo:inputs.tipo.value,nome:inputs.nome.value,unidade:inputs.unidade.value,
      funcao:inputs.funcao.value,ramal:inputs.ramal.value,email:inputs.email.value,
      telefoneInstitucional:inputs.telefoneInstitucional.value,aniversario:data
    };
  }
  function abrirFormulario(id=null){
    if(!autorizado())return;
    const contato=id?armazenamento.obter(id):null;
    if(id&&(!contato||!contato.ativo))return;
    alterando=contato?.id||null;limparErros();form.reset();
    titulo.textContent=contato?'Editar contato':'Novo contato';
    confirmar.textContent=contato?'Salvar alterações':'Adicionar contato';
    for(const [campo,input] of Object.entries(inputs)){
      input.value=contato?.[campo]||'';
    }
    if(contato?.aniversario){
      const [mes,dia]=contato.aniversario.split('-');
      inputs.aniversario.value=dia+'/'+mes;
    }
    atualizarCampos();
    abrirModal(dialogo);inputs.nome.focus();
  }
  function atualizarCampos(){
    const soPessoa=inputs.tipo.value==='pessoa';
    const grupo=document.getElementById('gab-cad-aniversario-grupo');
    grupo.hidden=!soPessoa;
    if(!soPessoa)inputs.aniversario.value='';
  }
  function confirmarAcao(id,tipoAcao){
    if(!autorizado())return;
    const contato=armazenamento.obter(id);
    if(!contato)return;
    acaoConfirmada={id,acao:tipoAcao,uid:obterUsuario().uid};
    const textos={
      excluir:'Excluir "'+contato.nome+'" do diretório demonstrativo? O registro poderá ser restaurado nesta sessão.',
      restaurar:'Restaurar "'+contato.nome+'" para a lista ativa?',
      revisar:'Confirmar que os dados institucionais de "'+contato.nome+'" foram revisados hoje?'
    };
    confirmTexto.textContent=textos[tipoAcao]||'Confirmar ação?';
    confirmExecutar.textContent=({excluir:'Excluir contato',restaurar:'Restaurar',revisar:'Confirmar revisão'})[tipoAcao];
    confirmExecutar.dataset.destrutivo=String(tipoAcao==='excluir');
    abrirModal(confirmacao);
  }
  function confirmarPendente(){
    if(!acaoConfirmada||!autorizado()||acaoConfirmada.uid!==obterUsuario().uid){fecharModal(confirmacao);return;}
    const {id,acao}=acaoConfirmada;acaoConfirmada=null;
    try{
      if(acao==='excluir')armazenamento.excluir(id);
      if(acao==='restaurar')armazenamento.restaurar(id);
      if(acao==='revisar')armazenamento.revisar(id);
      fecharModal(confirmacao);
      notificar(({excluir:'Contato retirado da lista ativa. Você pode restaurá-lo.',restaurar:'Contato restaurado.',revisar:'Revisão cadastral registrada nesta sessão.'})[acao],'sucesso');
    }catch(e){fecharModal(confirmacao);notificar(e.message||'Não foi possível concluir a ação.','erro');}
  }
  function salvar(evento){
    evento.preventDefault();
    if(!autorizado())return;
    limparErros();
    try{
      const registro=alterando?armazenamento.editar(alterando,entrada()):armazenamento.criar(entrada());
      fecharModal(dialogo);alterando=null;
      // Permite visualizar o registro recém-incluído apesar de filtros anteriores.
      termo.value='';tipoFiltro.value='';estadoFiltro.value='ativos';
      renderizar();
      notificar(registro.id.startsWith('sessao-')?'Contato demonstrativo incluído.':'Contato demonstrativo atualizado.','sucesso');
    }catch(e){
      if(e instanceof ErroCadastroGabinete){msgErro(e.message,e.campo);return;}
      msgErro('Não foi possível salvar. Tente novamente.');
    }
  }
  function badge(texto,estado){
    const n=el('span','cm-gab-cad-badge',texto);
    n.dataset.estado=estado;return n;
  }
  function cartão(c,hoje){
    const li=el('li','cm-gab-cad-row');li.dataset.id=c.id;
    if(!c.ativo)li.dataset.inativo='true';
    const identificacao=el('div','cm-gab-cad-info');
    const nome=el('strong','',c.nome);
    const detalhe=el('span','',[c.unidade,({pessoa:'Pessoa',ramal:'Ramal',externo:'Externo'})[c.tipo]].filter(Boolean).join(' · '));
    const contato=el('small','',[c.ramal?'Ramal '+c.ramal:'',c.email].filter(Boolean).join(' · ')||'Sem meio de contato informado');
    identificacao.append(nome,detalhe,contato);
    const qualidade=qualidadeContatoGabinete(c,hoje);
    const status=el('div','cm-gab-cad-status');
    status.append(badge(c.ativo?qualidade.revisao.rotulo:'Excluído',c.ativo?qualidade.revisao.codigo:'excluido'));
    if(c.ativo&&qualidade.pendencias.length){
      status.append(el('small','',qualidade.pendencias.join(' • ')));
    }else if(c.ativo&&qualidade.revisao.codigo==='proxima'){
      status.append(el('small','','A revisão completa 90 dias em breve'));
    }
    const acoes=el('div','cm-gab-cad-actions');
    if(c.ativo){
      acoes.append(botao('Ver ficha','cm-gab-action',()=>abrirFicha?.(c.id)));
      acoes.append(botao('Editar','cm-gab-action',()=>abrirFormulario(c.id)));
      acoes.append(botao('Revisar hoje','cm-gab-action',()=>confirmarAcao(c.id,'revisar')));
      acoes.append(botao('Excluir','cm-gab-action cm-gab-cad-danger',()=>confirmarAcao(c.id,'excluir')));
    }else{
      acoes.append(botao('Restaurar','cm-gab-action cm-gab-primary',()=>confirmarAcao(c.id,'restaurar')));
    }
    li.append(identificacao,status,acoes);return li;
  }
  function renderizar(){
    lista.replaceChildren();
    if(!autorizado()){
      secao.dataset.bloqueado='true';
      total.textContent='';metricas.replaceChildren();vazio.hidden=true;return;
    }
    secao.dataset.bloqueado='false';
    const hoje=dataLocalHoje();
    const todos=armazenamento.listar({incluirInativos:true});
    const ativos=todos.filter(c=>c.ativo);
    const vencidos=ativos.filter(c=>['sem-revisao','vencida'].includes(qualidadeContatoGabinete(c,hoje).revisao.codigo));
    const pendentes=ativos.filter(c=>qualidadeContatoGabinete(c,hoje).precisaAtencao);
    metricas.replaceChildren();
    for(const [titulo,valor] of [['Contatos ativos',ativos.length],['Revisões pendentes',vencidos.length],['Registros para atenção',pendentes.length]]){
      const card=el('div','cm-gab-cad-kpi');
      card.append(el('strong','',valor),el('span','',titulo));metricas.append(card);
    }
    const situacao=estadoFiltro.value;
    const consulta=normalizarBusca(termo.value);
    const encontrados=todos.filter(c=>{
      if(situacao==='arquivados'&&c.ativo)return false;
      if(situacao!=='arquivados'&&!c.ativo)return false;
      if(situacao==='pendentes'&&!qualidadeContatoGabinete(c,hoje).precisaAtencao)return false;
      if(situacao==='vencidos'&&!['vencida','sem-revisao'].includes(qualidadeContatoGabinete(c,hoje).revisao.codigo))return false;
      if(situacao==='em-dia'&&qualidadeContatoGabinete(c,hoje).revisao.codigo!=='em-dia')return false;
      if(tipoFiltro.value&&c.tipo!==tipoFiltro.value)return false;
      return normalizarBusca([c.nome,c.unidade,c.funcao,c.ramal,c.email].join(' ')).includes(consulta);
    });
    encontrados.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    for(const c of encontrados)lista.append(cartão(c,hoje));
    total.textContent=encontrados.length===1?'1 contato nesta consulta':encontrados.length+' contatos nesta consulta';
    vazio.hidden=Boolean(encontrados.length);
  }
  function limpar(){
    fecharModal(dialogo);fecharModal(confirmacao);
    alterando=null;acaoConfirmada=null;lista.replaceChildren();metricas.replaceChildren();
    termo.value='';tipoFiltro.value='';estadoFiltro.value='ativos';
    total.textContent='';limparErros();vazio.hidden=true;secao.dataset.bloqueado='true';
  }
  function inicializar(){
    if(inicializado)return;
    inicializado=true;
    novo.addEventListener('click',()=>abrirFormulario());
    for(const input of [termo,tipoFiltro,estadoFiltro])input.addEventListener(input===termo?'input':'change',renderizar);
    inputs.tipo.addEventListener('change',atualizarCampos);
    form.addEventListener('submit',salvar);
    cancelar.addEventListener('click',()=>fecharModal(dialogo));
    fechar.addEventListener('click',()=>fecharModal(dialogo));
    confirmCancelar.addEventListener('click',()=>{acaoConfirmada=null;fecharModal(confirmacao);});
    confirmFechar.addEventListener('click',()=>{acaoConfirmada=null;fecharModal(confirmacao);});
    confirmExecutar.addEventListener('click',confirmarPendente);
    confirmacao.addEventListener('close',()=>{acaoConfirmada=null;});
    dialogo.addEventListener('close',()=>{alterando=null;limparErros();});
    armazenamento.assinar(()=>{
      if(autorizado()&&!secao.classList.contains('hidden'))renderizar();
    });
  }
  return {inicializar,renderizar,limpar,abrirEdicao:abrirFormulario};
}
