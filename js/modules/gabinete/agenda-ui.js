import {filtrarContatosGabinete} from './agenda-model.js';
import {iniciaisInstitucionais} from './diretorio-referencias.js';

// O contrato aceita registros estruturados no futuro; esta sprint NÃO busca dados privados.
export function criarAgendaGabinete({obterUsuario,podeConsultar,podeGerenciar=()=>false,editarContato=()=>{},notificar,armazenamento}){
  const entrada=document.getElementById('gabinete-busca-contato');
  const tipo=document.getElementById('gabinete-tipo-contato');
  const lista=document.getElementById('gabinete-lista-contatos');
  const contagem=document.getElementById('gabinete-total-contatos');
  const alternarFavoritos=document.getElementById('gabinete-filtrar-favoritos');
  const notaFavoritos=document.getElementById('gabinete-nota-favoritos');
  const lateral=document.getElementById('gabinete-agenda-sidebar');
  const alternarCategorias=document.getElementById('gabinete-toggle-categorias');
  const botoesCategorias=[...document.querySelectorAll('#gabinete-agenda-categorias [data-gab-categoria]')];
  const botoesContagens=[...document.querySelectorAll('#gabinete-agenda-categorias [data-gab-contagem]')];
  const botaoGrade=document.getElementById('gabinete-ver-grade');
  const botaoLista=document.getElementById('gabinete-ver-lista');
  const dialogo=document.getElementById('gabinete-ficha-dialog');
  const fichaTitulo=document.getElementById('gabinete-ficha-titulo');
  const fichaSubtitulo=document.getElementById('gabinete-ficha-subtitulo');
  const fichaCampos=document.getElementById('gabinete-ficha-campos');
  const fichaAcoes=document.getElementById('gabinete-ficha-acoes');
  const fechar=document.getElementById('gabinete-ficha-fechar');
  let uidAtual='',favoritos=new Set(),apenasFavoritos=false,inicializada=false,aberta=null,modo='grid';

  const elemento=(tag,classe='',valor)=>{
    const el=document.createElement(tag);
    if(classe)el.className=classe;
    if(valor!==undefined)el.textContent=String(valor);
    return el;
  };
  const autorizado=()=>Boolean(obterUsuario()?.uid&&podeConsultar());
  const chave=uid=>'cmapp-gab05-favoritos-demo-'+uid;

  function sincronizarUsuario(){
    const uid=autorizado()?obterUsuario().uid:'';
    if(uid===uidAtual)return;
    uidAtual=uid;
    favoritos=new Set();
    if(!uid||!autorizado())return;
    try{
      const valor=JSON.parse(localStorage.getItem(chave(uid))||'[]');
      if(Array.isArray(valor)) favoritos=new Set(valor.filter(id=>typeof id==='string'&&(id.startsWith('demo-')||id.startsWith('org:demo-org-'))&&armazenamento.obter(id)?.ativo));
    }catch(_){ favoritos=new Set(); }
  }
  function persistirFavoritos(){
    if(!uidAtual||!autorizado())return;
    try{localStorage.setItem(chave(uidAtual),JSON.stringify([...favoritos].filter(id=>(id.startsWith('demo-')||id.startsWith('org:demo-org-'))&&armazenamento.obter(id)?.ativo)));}
    catch(_){notificar('Favoritos disponíveis nesta sessão, mas não foi possível salvá-los neste dispositivo.','aviso');}
  }
  function alterarFavorito(id){
    if(!autorizado()||!armazenamento.obter(id)?.ativo)return;
    sincronizarUsuario();
    if(favoritos.has(id))favoritos.delete(id);else favoritos.add(id);
    persistirFavoritos();
    renderizar();
  }
  function fecharFicha(){
    if(dialogo.open)dialogo.close();
    else dialogo.removeAttribute('open');
    aberta=null;
  }
  function botao(texto,classe,callback){
    const b=elemento('button',classe,texto);b.type='button';
    b.addEventListener('click',callback);return b;
  }
  async function copiar(valor,descricao){
    if(!autorizado())return;
    try{
      if(!navigator.clipboard?.writeText)throw new Error('indisponivel');
      await navigator.clipboard.writeText(String(valor));
      if(autorizado())notificar(descricao+' copiado(a).','sucesso');
    }catch(_){if(autorizado())notificar('Não foi possível copiar automaticamente.','aviso');}
  }
  function ancorar(texto,url){
    const a=elemento('a','cm-gab-action',texto);a.href=url;
    a.rel='noopener noreferrer';return a;
  }
  function valorTelefone(contato){
    const telefone=String(contato.telefoneInstitucional||'').trim();
    const digitos=telefone.replace(/\D/g,'');
    return digitos.length>=10 && digitos.length<=15 ? telefone : '';
  }
  function acoesContato(destino,contato){
    if(contato.ramal)destino.append(botao('Copiar ramal','cm-gab-action',()=>copiar(contato.ramal,'Ramal')));
    if(contato.email)destino.append(botao('Copiar e-mail','cm-gab-action',()=>copiar(contato.email,'E-mail')));
    const telefone=valorTelefone(contato);
    if(telefone)destino.append(ancorar('Ligar','tel:'+telefone.replace(/[^+\d]/g,'')));
    if(contato.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato.email) && !contato.email.endsWith('.invalid')){
      destino.append(ancorar('Enviar e-mail','mailto:'+encodeURIComponent(contato.email)));
    }
  }
  function avatar(contato,grande=false){
    const el=elemento('span',grande?'cm-gab-avatar cm-gab-avatar-lg':'cm-gab-avatar',iniciaisInstitucionais(contato.nome));
    el.setAttribute('aria-hidden','true');
    if(contato.tipo==='externo'||contato.tipo==='ramal'){
      el.textContent=contato.tipo==='externo'?'🏛':'☎';
      return el;
    }
    // A foto real só é reutilizada para o próprio usuário autenticado, em memória.
    const url=armazenamento.fotoDoContato?.(contato)||'';
    if(url){
      const imagem=elemento('img');
      imagem.alt='';
      imagem.loading='lazy';
      imagem.referrerPolicy='no-referrer';
      imagem.src=url;
      imagem.addEventListener('error',()=>{imagem.remove();});
      el.append(imagem);
    }
    return el;
  }
  function preencherFicha(contato){
    fichaTitulo.textContent=contato.nome;
    fichaSubtitulo.textContent=contato.origem==='usuarios'?'Contato vinculado ao Meu Perfil · Somente leitura':contato.origem==='orgaos'?'Órgão externo · Cadastro do Gabinete':'Ficha institucional · Dados de demonstração';
    const avatarFicha=document.getElementById('gabinete-ficha-avatar');
    avatarFicha?.replaceChildren(avatar(contato,true));
    fichaCampos.replaceChildren();
    const campos=[
      ['Tipo',({pessoa:'Pessoa',ramal:'Ramal',externo:'Contato externo'})[contato.tipo]||contato.tipo],
      ['Unidade',contato.unidade],['Função',contato.funcao],
      ['Ramal',contato.ramal],['E-mail institucional',contato.email],
      ['Telefone institucional',valorTelefone(contato)]
    ];
    for(const [rotulo,valor] of campos){
      if(!valor)continue;
      const bloco=elemento('div','cm-gab-field');
      bloco.append(elemento('dt','',rotulo),elemento('dd','',valor));
      fichaCampos.append(bloco);
    }
    fichaAcoes.replaceChildren();
    const favorito=favoritos.has(contato.id);
    const marcar=botao(favorito?'★ Remover dos favoritos':'☆ Adicionar aos favoritos','cm-gab-action',()=>alterarFavorito(contato.id));
    marcar.setAttribute('aria-pressed',String(favorito));
    fichaAcoes.append(marcar);
    acoesContato(fichaAcoes,contato);
    if(contato.somenteLeitura)fichaAcoes.append(elemento('span','cm-gab-readonly',contato.origem==='orgaos'?'Órgão mantido em Gabinete > Cadastros e revisão':'Identidade mantida na Gestão de Usuários'));
    if(podeGerenciar()&&!contato.somenteLeitura)fichaAcoes.append(botao('Editar cadastro','cm-gab-action',()=>editarContato(contato.id)));
  }
  function abrirFicha(id){
    if(!autorizado())return;
    sincronizarUsuario();
    const contato=armazenamento.obter(id);
    if(!contato?.ativo)return;
    aberta=contato;preencherFicha(contato);
    if(typeof dialogo.showModal==='function') {
      if(!dialogo.open)dialogo.showModal();
    } else dialogo.setAttribute('open','');
  }
  function cartão(contato){
    const li=elemento('li','cm-gab-contact');
    li.dataset.tipo=contato.tipo;
    li.dataset.id=contato.id;
    const topo=elemento('div','cm-gab-contact-top');
    topo.append(elemento('span','cm-gab-type',({pessoa:'Pessoa',ramal:'Ramal',externo:'Externo'})[contato.tipo]));
    const marcado=favoritos.has(contato.id);
    const estrela=botao(marcado?'★':'☆','cm-gab-contact-star',()=>alterarFavorito(contato.id));
    estrela.setAttribute('aria-pressed',String(marcado));
    estrela.setAttribute('aria-label',(marcado?'Remover dos favoritos: ':'Adicionar aos favoritos: ')+contato.nome);
    topo.append(estrela);
    const corpo=botao('','cm-gab-contact-body',()=>abrirFicha(contato.id));
    corpo.setAttribute('aria-label','Ver ficha de '+contato.nome);
    corpo.append(avatar(contato));
    corpo.append(elemento('strong','cm-gab-contact-name',contato.nome));
    if(contato.funcao)corpo.append(elemento('span','cm-gab-contact-role',contato.funcao));
    if(contato.unidade)corpo.append(elemento('span','cm-gab-contact-details',contato.unidade));
    if(contato.ramal)corpo.append(elemento('span','cm-gab-contact-ramal','Ramal '+contato.ramal));
    const acoes=elemento('div','cm-gab-contact-actions');
    acoes.append(botao('Ver ficha','cm-gab-action cm-gab-primary',()=>abrirFicha(contato.id)));
    if(contato.ramal){
      acoes.append(botao('Copiar ramal','cm-gab-action',()=>copiar(contato.ramal,'Ramal')));
    } else {
      const telefone=valorTelefone(contato);
      if(telefone)acoes.append(ancorar('Ligar','tel:'+telefone.replace(/[^+\d]/g,'')));
      else if(contato.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato.email) && !contato.email.endsWith('.invalid'))
        acoes.append(ancorar('E-mail','mailto:'+encodeURIComponent(contato.email)));
    }
    li.append(topo,corpo,acoes);
    return li;
  }
  function fecharCategorias(){
    lateral.dataset.open='false';
    alternarCategorias.setAttribute('aria-expanded','false');
  }
  function escolherCategoria(categoria,{limparBusca=false}={}){
    if(!autorizado())return;
    if(limparBusca)entrada.value='';
    apenasFavoritos=categoria==='favoritos';
    tipo.value=['pessoa','ramal','externo'].includes(categoria)?categoria:'';
    fecharCategorias();
    renderizar();
  }
  function atualizarNavegacao(contatos){
    const totais={todos:contatos.length,favoritos:contatos.filter(c=>favoritos.has(c.id)).length,
      pessoa:0,ramal:0,externo:0};
    for(const contato of contatos)if(Object.hasOwn(totais,contato.tipo))totais[contato.tipo]++;
    for(const el of botoesContagens)el.textContent=String(totais[el.dataset.gabContagem]||0);
    const categoria=apenasFavoritos?'favoritos':tipo.value||'todos';
    for(const botao of botoesCategorias)botao.setAttribute('aria-pressed',String(botao.dataset.gabCategoria===categoria));
    botaoGrade.setAttribute('aria-pressed',String(modo==='grid'));
    botaoLista.setAttribute('aria-pressed',String(modo==='list'));
    lista.dataset.view=modo;
  }
  function renderizar(){
    sincronizarUsuario();
    lista.replaceChildren();
    if(!autorizado()){
      fecharFicha();
      contagem.textContent='';
      notaFavoritos.textContent='';
      atualizarNavegacao([]);
      return;
    }
    // Revisões e alterações na fonte única atualizam a ficha sem divulgar campos privados.
    if(aberta){
      const atualizado=armazenamento.obter(aberta.id);
      if(!atualizado?.ativo)fecharFicha();
      else {aberta=atualizado;if(dialogo.open)preencherFicha(atualizado);}
    }
    for(const id of favoritos)if(!armazenamento.obter(id)?.ativo)favoritos.delete(id);
    const contatos=armazenamento.listar().filter(c=>c.ativo);
    atualizarNavegacao(contatos);
    const encontrados=filtrarContatosGabinete(contatos,{
      termo:entrada.value,tipo:tipo.value,apenasFavoritos,favoritos
    });
    for(const contato of encontrados)lista.append(cartão(contato));
    if(!encontrados.length)lista.append(elemento('li','cm-gab-empty','Nenhum contato corresponde aos filtros. Experimente outra categoria ou pesquisa.'));
    contagem.textContent=encontrados.length===1?'1 contato encontrado':encontrados.length+' contatos encontrados';
    alternarFavoritos.setAttribute('aria-pressed',String(apenasFavoritos));
    notaFavoritos.textContent='Favoritos dos exemplos salvos neste dispositivo; outros contatos apenas nesta sessão.';
  }
  function mostrarFavoritos(){
    if(!autorizado())return;
    escolherCategoria('favoritos',{limparBusca:true});
  }
  function pesquisar(termo){
    entrada.value=String(termo||'');
    tipo.value='';
    apenasFavoritos=false;
    fecharCategorias();
    renderizar();
  }
  function limpar(){
    fecharFicha();
    uidAtual='';favoritos=new Set();apenasFavoritos=false;modo='grid';
    entrada.value='';tipo.value='';lista.replaceChildren();
    contagem.textContent='';notaFavoritos.textContent='';
    fecharCategorias();
    atualizarNavegacao([]);
  }
  function inicializar(){
    if(inicializada)return;
    inicializada=true;
    entrada.addEventListener('input',renderizar);
    tipo.addEventListener('change',()=>{apenasFavoritos=false;renderizar();});
    for(const botao of botoesCategorias){
      botao.addEventListener('click',()=>{
        const categoria=botao.dataset.gabCategoria;
        escolherCategoria(categoria==='favoritos'&&apenasFavoritos?'todos':categoria);
      });
    }
    alternarCategorias.addEventListener('click',()=>{
      const abrir=lateral.dataset.open!=='true';
      lateral.dataset.open=String(abrir);
      alternarCategorias.setAttribute('aria-expanded',String(abrir));
    });
    botaoGrade.addEventListener('click',()=>{if(!autorizado())return;modo='grid';renderizar();});
    botaoLista.addEventListener('click',()=>{if(!autorizado())return;modo='list';renderizar();});
    fechar.addEventListener('click',fecharFicha);
    dialogo.addEventListener('close',()=>{aberta=null;});
    dialogo.addEventListener('click',evento=>{if(evento.target===dialogo)fecharFicha();});
  }
  return {inicializar,renderizar,pesquisar,mostrarFavoritos,abrirContato:abrirFicha,limpar,fecharFicha};
}
