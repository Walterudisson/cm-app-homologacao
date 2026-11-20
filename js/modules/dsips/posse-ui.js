import {criarPaginadorLocal} from '../../ui/paginador.js?v=1.13.33-h.1';
import {podeConsultarHistoricoDsips} from './historico-model.js?v=1.13.29-h.1';
import { listarCautelasPendentesDsips } from './service.js?v=1.13.33-h.1';
import { podeConsultarPosseDsips, consolidarPosseDsips, filtrarPosseDsips } from './posse-model.js?v=1.13.17-h.1';

import {podeRegistrarCautelasDsips} from './registro-cautelas-model.js?v=1.13.26-h.1';
export function criarPosseDsips({obterUsuario,iniciarDevolucao=()=>{}, abrirHistorico=()=>{}}) {
  const porId=id=>document.getElementById(id);
  const lista=porId('dsips-posse-list'), status=porId('dsips-posse-status');
  const paginador=criarPaginadorLocal({lista,tamanho:15,renderizar,podeNavegar:()=>autorizado(),rotulo:'Páginas de responsáveis'});
  const busca=porId('dsips-posse-search'), atualizar=porId('dsips-posse-refresh');
  const total=porId('dsips-posse-total'), cautelasTotal=porId('dsips-posse-cautelas');
  let grupos=[],revisao=0,carregando=false,pronto=false,falha='';
  const autorizado=()=>podeConsultarPosseDsips(obterUsuario());
  function el(tag,classe,valor){
    const node=document.createElement(tag);if(classe)node.className=classe;
    if(valor!==undefined)node.textContent=String(valor??'');return node;
  }
  function renderizar(){
    paginador.ocultar();lista.replaceChildren();atualizar.disabled=carregando;
    lista.setAttribute('aria-busy',String(carregando));
    total.textContent='0';cautelasTotal.textContent='0';
    if(!autorizado()){status.textContent='Acesso não autorizado.';return;}
    if(carregando){status.textContent='Consultando cautelas pendentes…';return;}
    if(falha){status.textContent=falha;return;}
    if(!pronto){status.textContent='Abra a consulta para carregar as posses.';return;}
    total.textContent=String(grupos.length);
    cautelasTotal.textContent=String(new Set(grupos.flatMap(g=>g.materiais.flatMap(m=>m.cautelas.map(c=>c.id)))).size);
    const filtrados=filtrarPosseDsips(grupos,busca.value);
    status.textContent=filtrados.length+' de '+grupos.length+' responsáveis com materiais pendentes.';
    if(!filtrados.length){
      const vazio=el('div','app-card dsips-empty');
      vazio.append(el('strong','',grupos.length?'Nenhum resultado encontrado':'Nenhuma posse pendente'),
        el('p','',grupos.length?'Altere o termo pesquisado.':'Não há cautelas com materiais pendentes.'));
      lista.append(vazio);return;
    }
    for(const grupo of paginador.recortar(filtrados,busca.value)){
      const card=el('article','dsips-cautelas-card');
      const cab=el('div','dsips-cautelas-card-heading');
      cab.append(el('h3','',grupo.nome));
      if(grupo.legado)cab.append(el('span','dsips-cautela-status dsips-cautela-status-desconhecida','Registro legado'));
      card.append(cab);
      if(podeConsultarHistoricoDsips(obterUsuario())&&grupo.chave.startsWith('usuario:')){const b=el('button','app-button app-button-secondary','Histórico do responsável');b.type='button';b.addEventListener('click',()=>abrirHistorico({visao:'pessoa',id:grupo.chave.slice(8),nome:grupo.nome}));card.append(b);}
      if(grupo.matricula)card.append(el('p','dsips-cautelas-card-meta','Matrícula: '+grupo.matricula));
      for(const material of grupo.materiais){
        const bloco=el('div','dsips-posse-item');
        bloco.append(el('strong','',material.nome),el('p','dsips-posse-qtd',material.quantidade+' '+material.unidade+' pendente(s)'));
        if(material.identificacoes.length)bloco.append(el('p','dsips-cautelas-card-meta','Identificações: '+material.identificacoes.join(', ')));
        bloco.append(el('p','dsips-cautelas-card-meta','Cautelas: '+material.cautelas.map(c=>c.id+' ('+c.quantidade+')').join(' · ')));
        if(podeRegistrarCautelasDsips(obterUsuario())){
          const acoes=el('div','cm-posse-devolucoes');
          for(const cautela of material.cautelas){if(!cautela.id)continue;const b=el('button','app-button app-button-secondary',material.cautelas.length===1?'Iniciar devolução':'Devolver · '+cautela.id.slice(0,10));b.type='button';b.addEventListener('click',()=>{if(autorizado()&&podeRegistrarCautelasDsips(obterUsuario()))void iniciarDevolucao(cautela.id);});acoes.append(b);}bloco.append(acoes);
        }
        card.append(bloco);
      }
      lista.append(card);
    }
  }
  function limpar(){paginador.reset();revisao++;grupos=[];carregando=false;pronto=false;falha='';busca.value='';renderizar();}
  async function carregar(){
    if(!autorizado()){limpar();return;}
    paginador.reset();const token=++revisao,uid=obterUsuario()?.uid;
    grupos=[];pronto=false;carregando=true;falha='';renderizar();
    try{
      const cautelas=await listarCautelasPendentesDsips();
      if(token!==revisao||uid!==obterUsuario()?.uid||!autorizado())return;
      grupos=consolidarPosseDsips(cautelas);pronto=true;
    }catch(erro){
      if(token!==revisao||uid!==obterUsuario()?.uid||!autorizado())return;
      falha='Não foi possível consultar as posses. Confira o acesso e tente Atualizar.';
      console.warn('Falha na consulta de posse DSIPS.',erro);
    }finally{if(token===revisao){carregando=false;renderizar();}}
  }
  busca.addEventListener('input',renderizar);
  atualizar.addEventListener('click',()=>{void carregar();});
  limpar();return {carregar,limpar};
}
