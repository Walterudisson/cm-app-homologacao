import { listarPaginaEventosDsips } from './service.js?v=1.13.18-h.1';
import { podeConsultarHistoricoDsips,filtrarTimelineDsips,TIPOS_HISTORICO_DSIPS } from './historico-model.js?v=1.13.28-h.1';

export function criarHistoricoDsips({obterUsuario}){
  const porId=id=>document.getElementById(id);
  const lista=porId('dsips-historico-list'),status=porId('dsips-historico-status');
  const busca=porId('dsips-historico-search'),tipo=porId('dsips-historico-tipo');
  const atualizar=porId('dsips-historico-refresh'),mais=porId('dsips-historico-more');
  const abas=[...document.querySelectorAll('[data-historico-visao]')],de=porId('dsips-historico-de'),ate=porId('dsips-historico-ate');let visao='geral';
  let eventos=[],cursor=null,temMais=false,carregando=false,pronto=false,falha='',revisao=0;
  const autorizado=()=>podeConsultarHistoricoDsips(obterUsuario());
  const dataFormat=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo'});
  function el(tag,classe,valor){
    const node=document.createElement(tag);if(classe)node.className=classe;
    if(valor!==undefined)node.textContent=String(valor??'');return node;
  }
  function renderizar(){
    lista.replaceChildren();atualizar.disabled=carregando;
    lista.setAttribute('aria-busy',String(carregando));mais.classList.toggle('hidden',!temMais||!autorizado());mais.disabled=carregando;
    if(!autorizado()){status.textContent='Acesso não autorizado à auditoria.';return;}
    if(!pronto){status.textContent=falha||(carregando?'Consultando eventos…':'Abra Histórico para consultar os eventos.');return;}
    if(de.value&&ate.value&&de.value>ate.value){status.textContent='Período inválido.';return;}
    const filtrados=filtrarTimelineDsips(eventos,{visao,busca:busca.value,grupo:tipo.value,de:de.value,ate:ate.value});
    status.textContent=(falha?falha+' · ':'')+filtrados.length+' de '+eventos.length+' eventos carregados.'+(temMais?' Há eventos anteriores.':'')+(carregando?' Carregando…':'');
    if(!filtrados.length)lista.append(el('p','dsips-state-message','Nenhum evento corresponde à consulta nos registros carregados.'));
    let diaAnterior=null;
    const simbolos={cadastro:'▤',saldo:'＋',ajuste:'↕',cautela:'↗',devolucao:'↙',outro:'•'};
    for(const e of filtrados){
      if(e.dia!==diaAnterior){lista.append(el('h3','cm-audit-day',e.dia?e.dia.split('-').reverse().join('/'):'Data não informada'));diaAnterior=e.dia;}
      const linha=el('div','cm-audit-row');linha.dataset.grupo=e.grupo;
      const marca=el('span','cm-audit-marker',simbolos[e.grupo]||'•');marca.setAttribute('aria-hidden','true');
      const card=el('article','dsips-historico-card');
      const cab=el('div','dsips-cautelas-card-heading');
      cab.append(el('strong','',TIPOS_HISTORICO_DSIPS[e.grupo]),el('span','dsips-readonly',e.data?dataFormat.format(e.data):'Data não informada'));
      card.append(cab,el('h3','',e.titulo),el('p','dsips-cautelas-card-meta','Operador: '+e.operador));
      for(const linha of e.linhas)card.append(el('p','dsips-cautelas-card-line',linha));
      if(e.tipo)card.append(el('p','dsips-cautelas-card-meta','Evento: '+e.tipo));
      if(e.id)card.append(el('p','dsips-cautelas-card-meta','Registro: '+e.id));
      linha.append(marca,card);lista.append(linha);
    }
  }
  function definirVisao(v){visao=v;abas.forEach(b=>{const ativo=b.dataset.historicoVisao===v;b.classList.toggle('is-selected',ativo);b.setAttribute('aria-pressed',String(ativo));});busca.placeholder=({geral:'Operador, responsável, material ou registro',material:'Nome ou ID do material',pessoa:'Nome ou ID do responsável',operador:'Nome ou ID do operador'})[v];}
  function limpar(){definirVisao('geral');de.value='';ate.value='';revisao++;eventos=[];cursor=null;temMais=false;carregando=false;pronto=false;falha='';busca.value='';tipo.value='todos';renderizar();}
  async function carregar(acrescentar=false){
    if(!autorizado()){limpar();return;}
    if(acrescentar&&(!temMais||carregando))return;
    const token=++revisao,uid=obterUsuario()?.uid;
    if(!acrescentar){eventos=[];cursor=null;temMais=false;pronto=false;}
    carregando=true;falha='';renderizar();
    try{
      const pagina=await listarPaginaEventosDsips(acrescentar?cursor:null);
      if(token!==revisao||uid!==obterUsuario()?.uid||!autorizado())return;
      const ids=new Set(eventos.map(e=>e.id));
      eventos.push(...pagina.eventos.filter(e=>!ids.has(e.id)));
      cursor=pagina.cursor;temMais=pagina.temMais;pronto=true;
    }catch(erro){
      if(token!==revisao||uid!==obterUsuario()?.uid||!autorizado())return;
      if(['permission-denied','functions/permission-denied'].includes(erro?.code)){
        eventos=[];cursor=null;temMais=false;pronto=false;falha='Sem permissão para consultar auditoria.';
      }else falha='Não foi possível consultar os eventos. Tente novamente.';
      console.warn('Falha de consulta à auditoria DSIPS.',erro?.code||'erro');
    }finally{if(token===revisao){carregando=false;renderizar();}}
  }
  abas.forEach(b=>b.addEventListener('click',()=>{definirVisao(b.dataset.historicoVisao);busca.value='';renderizar();}));
  de.addEventListener('change',renderizar);ate.addEventListener('change',renderizar);
  busca.addEventListener('input',renderizar);tipo.addEventListener('change',renderizar);
  atualizar.addEventListener('click',()=>{void carregar();});mais.addEventListener('click',()=>{void carregar(true);});
  limpar();return {carregar,limpar};
}
