import {filtrarContatosGabinete} from './agenda-model.js';

// O contrato aceita registros estruturados no futuro; esta sprint NÃO busca dados privados.
export function criarAgendaGabinete({obterUsuario,podeConsultar,notificar,armazenamento}){
  const entrada=document.getElementById('gabinete-busca-contato');
  const tipo=document.getElementById('gabinete-tipo-contato');
  const lista=document.getElementById('gabinete-lista-contatos');
  const contagem=document.getElementById('gabinete-total-contatos');
  const alternarFavoritos=document.getElementById('gabinete-filtrar-favoritos');
  const notaFavoritos=document.getElementById('gabinete-nota-favoritos');
  const dialogo=document.getElementById('gabinete-ficha-dialog');
  const fichaTitulo=document.getElementById('gabinete-ficha-titulo');
  const fichaSubtitulo=document.getElementById('gabinete-ficha-subtitulo');
  const fichaCampos=document.getElementById('gabinete-ficha-campos');
  const fichaAcoes=document.getElementById('gabinete-ficha-acoes');
  const fechar=document.getElementById('gabinete-ficha-fechar');
  let uidAtual='',favoritos=new Set(),apenasFavoritos=false,inicializada=false,aberta=null;

  const elemento=(tag,classe='',valor)=>{
    const el=document.createElement(tag);
    if(classe)el.className=classe;
    if(valor!==undefined)el.textContent=String(valor);
    return el;
  };
  const autorizado=()=>Boolean(obterUsuario()?.uid&&podeConsultar());
  const chave=uid=>'cmapp-gab05-favoritos-demo-'+uid;

  function sincronizarUsuario(){
    const uid=obterUsuario()?.uid || '';
    if(uid===uidAtual)return;
    uidAtual=uid;
    favoritos=new Set();
    if(!uid||!autorizado())return;
    try{
      const valor=JSON.parse(localStorage.getItem(chave(uid))||'[]');
      if(Array.isArray(valor)) favoritos=new Set(valor.filter(id=>typeof id==='string'&&id.startsWith('demo-')&&armazenamento.obter(id)?.ativo));
    }catch(_){ favoritos=new Set(); }
  }
  function persistirFavoritos(){
    if(!uidAtual||!autorizado())return;
    try{localStorage.setItem(chave(uidAtual),JSON.stringify([...favoritos].filter(id=>id.startsWith('demo-')&&armazenamento.obter(id)?.ativo)));}
    catch(_){notificar('Favoritos disponíveis nesta sessão, mas não foi possível salvá-los neste dispositivo.','aviso');}
  }
  function alterarFavorito(id){
    if(!autorizado()||!armazenamento.obter(id)?.ativo)return;
    sincronizarUsuario();
    if(favoritos.has(id))favoritos.delete(id);else favoritos.add(id);
    persistirFavoritos();
    renderizar();
    if(aberta?.id===id && dialogo.open) preencherFicha(aberta);
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
      notificar(descricao+' copiado(a).','sucesso');
    }catch(_){notificar('Não foi possível copiar automaticamente: '+valor,'aviso');}
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
  function preencherFicha(contato){
    fichaTitulo.textContent=contato.nome;
    fichaSubtitulo.textContent='Ficha institucional · Dados de demonstração';
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
    const li=elemento('li','cm-gab-contact');li.dataset.tipo=contato.tipo;li.dataset.id=contato.id;
    const corpo=elemento('div','cm-gab-contact-copy');
    const tag=elemento('span','cm-gab-type',({pessoa:'Pessoa',ramal:'Ramal',externo:'Externo'})[contato.tipo]);
    const titulo=elemento('strong','cm-gab-contact-name',contato.nome);
    const resumo=elemento('span','cm-gab-contact-details', [contato.unidade,contato.ramal?'Ramal '+contato.ramal:''].filter(Boolean).join(' · '));
    corpo.append(tag,titulo,resumo);
    const acoes=elemento('div','cm-gab-contact-actions');
    acoes.append(botao('Ver ficha','cm-gab-action cm-gab-primary',()=>abrirFicha(contato.id)));
    const marcado=favoritos.has(contato.id);
    const favoritar=botao(marcado?'★ Favorito':'☆ Favoritar','cm-gab-action cm-gab-favorite',()=>alterarFavorito(contato.id));
    favoritar.setAttribute('aria-pressed',String(marcado));
    favoritar.setAttribute('aria-label',(marcado?'Remover dos favoritos: ':'Adicionar aos favoritos: ')+contato.nome);
    acoes.append(favoritar);
    if(contato.ramal) acoes.append(botao('Copiar ramal','cm-gab-action',()=>copiar(contato.ramal,'Ramal')));
    else if(contato.email) acoes.append(botao('Copiar e-mail','cm-gab-action',()=>copiar(contato.email,'E-mail')));
    li.append(corpo,acoes);
    return li;
  }
  function renderizar(){
    sincronizarUsuario();
    lista.replaceChildren();
    if(!autorizado()){contagem.textContent='';return;}
    if(aberta&&!armazenamento.obter(aberta.id)?.ativo)fecharFicha();
    const encontrados=filtrarContatosGabinete(armazenamento.listar(),{
      termo:entrada.value,tipo:tipo.value,apenasFavoritos,favoritos
    });
    for(const contato of encontrados)lista.append(cartão(contato));
    if(!encontrados.length)lista.append(elemento('li','cm-gab-empty','Nenhum contato corresponde aos filtros.'));
    contagem.textContent=encontrados.length===1?'1 contato encontrado':encontrados.length+' contatos encontrados';
    alternarFavoritos.setAttribute('aria-pressed',String(apenasFavoritos));
    alternarFavoritos.textContent=apenasFavoritos?'★ Exibindo favoritos':'☆ Somente favoritos';
    notaFavoritos.textContent=favoritos.size===1?'1 favorito salvo neste dispositivo':favoritos.size+' favoritos salvos neste dispositivo';
  }
  function mostrarFavoritos(){
    if(!autorizado())return;
    entrada.value='';tipo.value='';apenasFavoritos=true;renderizar();
  }
  function pesquisar(termo){
    entrada.value=String(termo||'');
    tipo.value='';
    apenasFavoritos=false;
    renderizar();
  }
  function limpar(){
    fecharFicha();uidAtual='';favoritos=new Set();apenasFavoritos=false;
    entrada.value='';tipo.value='';lista.replaceChildren();
    contagem.textContent='';notaFavoritos.textContent='';
  }
  function inicializar(){
    if(inicializada)return;
    inicializada=true;
    entrada.addEventListener('input',renderizar);
    tipo.addEventListener('change',renderizar);
    alternarFavoritos.addEventListener('click',()=>{
      if(!autorizado())return;
      apenasFavoritos=!apenasFavoritos;renderizar();
    });
    fechar.addEventListener('click',fecharFicha);
    dialogo.addEventListener('close',()=>{aberta=null;});
    dialogo.addEventListener('click',evento=>{if(evento.target===dialogo)fecharFicha();});
  }
  return {inicializar,renderizar,pesquisar,mostrarFavoritos,abrirContato:abrirFicha,limpar,fecharFicha};
}
