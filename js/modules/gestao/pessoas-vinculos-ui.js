import {projetarMapaInstitucional,filtrarMapaInstitucional} from './pessoas-vinculos-model.js';

// GEST-04: interface de consulta das fontes autorizadas de Gestão.
// Nenhuma busca transversal, persistência, sugestão automática de identidade ou exportação.
export function criarPainelPessoasVinculos({
  obterUsuario=()=>null,podeConsultar=()=>false,abrirConta=()=>{},abrirDivisao=()=>{}
}={}){
  const porId=id=>document.getElementById(id);
  const raiz=porId('sec-pessoas');
  const lista=porId('gest04-lista');
  const resumo=porId('gest04-resumo');
  const busca=porId('gest04-busca');
  const situacao=porId('gest04-situacao');
  const mais=porId('gest04-mais');
  const mensagem=porId('gest04-mensagem');
  const tabs=[...raiz.querySelectorAll('[data-gest04-visao]')];
  let mapa=null,visao='pessoas',limite=12,inicializado=false;
  const habilitado=()=>obterUsuario()?.perfil==='admin'&&podeConsultar();
  const el=(tag,classe='',texto)=>{
    const x=document.createElement(tag);
    if(classe)x.className=classe;
    if(texto!==undefined)x.textContent=String(texto);
    return x;
  };
  const linha=(titulo,valor)=>{
    const x=el('div','gest04-dado');
    x.append(el('span','',titulo),el('strong','',valor));
    return x;
  };
  function aviso(rotulo,estado){
    const selo=el('span','gest04-status',rotulo);
    selo.dataset.estado=estado;
    return selo;
  }
  function botaoAbrir(rotulo,acao){
    const b=el('button','gest04-acao',rotulo);
    b.type='button';
    b.addEventListener('click',()=>{if(habilitado()&&mapa)acao();});
    return b;
  }
  function blocoPessoa(p){
    const artigo=el('article','gest04-registro');
    const cab=el('div','gest04-cabecalho');
    const avatar=el('span','gest04-avatar',p.nome.split(/\s+/).filter(Boolean).slice(0,2).map(n=>n[0]).join('').toLocaleUpperCase('pt-BR'));
    const identidade=el('div','gest04-identidade');
    identidade.append(el('strong','',p.nome),el('small','',p.email||'E-mail institucional não informado'));
    const badges=el('div','gest04-badges');
    badges.append(aviso(p.pessoaId?'pessoaId informado':'Somente UID da conta',p.pessoaId?'identidade-informada':'pendente'),
      aviso(p.ativo?'Conta ativa':'Conta inativa',p.ativo?'confirmado':'pendente'));
    cab.append(avatar,identidade,badges);
    const infos=el('div','gest04-dados');
    const nomesVinculos=p.vinculos.map(v=>v.divisaoNome+' ('+(v.tipo==='principal'?'Principal':'Substituto')+')');
    infos.append(linha('Referência institucional',p.rotuloIdentidade),
      linha('Responsabilidades referenciadas por UID',nomesVinculos.join(' · ')||'Nenhuma nesta consulta'),
      linha('Divisões na conta (nomes legados)',p.divisoesLegadas.join(' · ')||'Nenhuma informada'));
    const rodape=el('div','gest04-rodape');
    rodape.append(el('span','gest04-nota','Não presumir identidade em outros módulos por nome ou e-mail.'));
    rodape.append(botaoAbrir('Abrir cadastro existente',()=>abrirConta(p.uid)));
    artigo.append(cab,infos,rodape);return artigo;
  }
  function estadoVinculo(v){
    if(!v)return aviso('Não definido','pendente');
    const textos={
      'confirmado':'UID identificado','somente-nome':'Nome sem UID','nao-definido':'Não definido',
      'nao-localizado':'UID não localizado','conta-inativa':'Conta inativa',
      'nome-desatualizado':'Nome a revisar','mesma-conta':'Responsável duplicado',
      'uid-duplicado':'UID repetido'
    };
    return aviso(textos[v.status]||'Referência a revisar',v.status==='confirmado'?'confirmado':'pendente');
  }
  function blocoDivisao(d){
    const artigo=el('article','gest04-registro');
    const cab=el('div','gest04-cabecalho');
    const titulo=el('div','gest04-identidade');
    titulo.append(el('strong','',d.nome),el('small','',d.ativo?'Divisão ativa':'Divisão inativa'));
    cab.append(el('span','gest04-avatar gest04-avatar-divisao','▦'),titulo);
    const infos=el('div','gest04-dados gest04-dados-dois');
    for(const tipo of ['principal','substituto']){
      const v=mapa.vinculos.find(c=>c.divisaoId===d.id&&c.tipo===tipo);
      const card=el('div','gest04-dado');
      card.append(el('span','',tipo==='principal'?'Responsável principal':'Substituto'),
        el('strong','',v?.nomeAtual||v?.nomeHistorico||'Não definido'),estadoVinculo(v));
      infos.append(card);
    }
    const rodape=el('div','gest04-rodape');
    rodape.append(el('span','gest04-nota','Vínculos confirmados apenas quando o UID existe na lista autorizada.'));
    rodape.append(botaoAbrir('Abrir divisão existente',()=>abrirDivisao(d.id)));
    artigo.append(cab,infos,rodape);return artigo;
  }
  function blocoPendencia(p){
    const artigo=el('article','gest04-registro gest04-registro-pendente');
    const titulo=el('div','gest04-cabecalho');
    const info=el('div','gest04-identidade');
    info.append(el('strong','',p.titulo),el('small','',p.detalhe));
    titulo.append(el('span','gest04-avatar gest04-avatar-pendente','!'),info,
      aviso('Revisão manual', 'pendente'));
    artigo.append(titulo);
    if(p.divisaoId){
      const rodape=el('div','gest04-rodape');
      rodape.append(el('span','gest04-nota','Nenhum vínculo será corrigido automaticamente.'));
      rodape.append(botaoAbrir('Consultar divisão',()=>abrirDivisao(p.divisaoId)));
      artigo.append(rodape);
    }else artigo.append(el('p','gest04-nota','Não unir contas por coincidência de dados.'));
    return artigo;
  }
  function definirOpcoes(){
    situacao.replaceChildren();
    const opts=visao==='pessoas'?
      [['todas','Todas as contas'],['pendentes','Sem pessoaId'],['confirmados','Com pessoaId informado']]:
      visao==='divisoes'?
      [['todas','Todas as divisões'],['pendentes','Com referências para revisar'],['confirmados','Sem pendências de referência']]:
      [['todas','Todas as pendências']];
    for(const [valor,rotulo] of opts){
      const opt=el('option','',rotulo);opt.value=valor;situacao.append(opt);
    }
    situacao.value='todas';
    situacao.disabled=visao==='pendencias';
  }
  function renderizar(){
    lista.replaceChildren();
    if(!habilitado()||!mapa){
      for(const id of ['gest04-total-contas','gest04-total-divisoes','gest04-total-vinculos','gest04-total-pendencias']){
        const campo=porId(id);if(campo)campo.textContent='0';
      }
      resumo.textContent=mapa?'Consulta indisponível para esta sessão.':'Dados não carregados.';
      mensagem.textContent='';
      mais.hidden=true;
      return;
    }
    const m=mapa.estatisticas;
    porId('gest04-total-contas').textContent=m.contas;
    porId('gest04-total-divisoes').textContent=m.divisoes;
    porId('gest04-total-vinculos').textContent=m.vinculosConfirmados;
    porId('gest04-total-pendencias').textContent=m.referenciasParaRevisar;
    const ref=porId('gest04-referencia');
    ref.textContent=m.contasSemPessoaId+' conta(s) sem pessoaId institucional. '+
      m.contasComPessoaId+' com pessoaId informado, ainda sem validação do cadastro central.';
    tabs.forEach(b=>{
      const sel=b.dataset.gest04Visao===visao;
      b.setAttribute('aria-pressed',String(sel));
      b.classList.toggle('is-selected',sel);
    });
    const filtrados=filtrarMapaInstitucional(mapa,{
      visao,termo:busca.value,situacao:situacao.value
    });
    resumo.textContent=filtrados.length+' registro(s) nesta visão. Somente fontes já autorizadas de Gestão.';
    const itens=filtrados.slice(0,limite);
    if(!itens.length)mensagem.textContent='Nenhum registro encontrado com esses filtros.';
    else mensagem.textContent='';
    for(const item of itens)lista.append(visao==='divisoes'?blocoDivisao(item):
      visao==='pendencias'?blocoPendencia(item):blocoPessoa(item));
    mais.hidden=filtrados.length<=limite;
    mais.textContent='Mostrar mais ('+(filtrados.length-limite)+' restantes)';
  }
  function inicializar(){
    if(inicializado)return;
    inicializado=true;
    for(const b of tabs)b.addEventListener('click',()=>{
      if(!habilitado())return;
      visao=b.dataset.gest04Visao;limite=12;definirOpcoes();renderizar();
    });
    busca.addEventListener('input',()=>{limite=12;renderizar();});
    situacao.addEventListener('change',()=>{limite=12;renderizar();});
    mais.addEventListener('click',()=>{if(!habilitado())return;limite+=12;renderizar();});
    definirOpcoes();
  }
  function atualizar(dados){
    inicializar();
    if(!habilitado()){limpar();return;}
    mapa=projetarMapaInstitucional(dados);
    renderizar();
  }
  function limpar(){
    mapa=null;visao='pessoas';limite=12;
    if(busca)busca.value='';
    if(inicializado)definirOpcoes();
    lista?.replaceChildren();
    renderizar();
  }
  return Object.freeze({inicializar,atualizar,renderizar,limpar});
}
