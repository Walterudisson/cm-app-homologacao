import {
  MODULOS_MATRIZ,PERFIS_NATIVOS,filtrarMatrizGestao,
  classificacaoMatrizPerfil,resumoMatrizGestao
} from './matriz-acessos-model.js';

// GEST-01: painel consultivo; não grava Firestore, não cria concessões nem recalcula direitos.
export function criarMatrizAcessosGestaoUI({podeConsultar=()=>false}={}){
  const raiz=document.getElementById('gest-matriz-contrato');
  const modulo=document.getElementById('gest-matriz-modulo');
  const estado=document.getElementById('gest-matriz-estado');
  const busca=document.getElementById('gest-matriz-busca');
  const corpo=document.getElementById('gest-matriz-corpo');
  const resumo=document.getElementById('gest-matriz-resumo');
  const vazio=document.getElementById('gest-matriz-vazio');
  let inicializado=false;
  const el=(tag,classe='',texto)=>{
    const node=document.createElement(tag);
    if(classe)node.className=classe;
    if(texto!==undefined)node.textContent=String(texto);
    return node;
  };
  const td=(rotulo,texto,classe='')=>{
    const node=el('td',classe,texto);
    node.setAttribute('data-label',rotulo);
    return node;
  };
  const valorPerfil=(item,perfil)=>{
    const estado=classificacaoMatrizPerfil(item,perfil);
    const rotulos={'declarada':'Declarada','nao-declarada':'Não declarada','a-definir':'A definir'};
    const span=el('span','gest-matriz-atributo',rotulos[estado]||'Não declarada');
    span.dataset.estado=estado;
    span.title=estado==='declarada'
      ?'Declarada como permissão nativa no frontend legado; não certifica o backend.'
      :estado==='a-definir'?'Permissão proposta, não implementada ou concedida.':'Não consta na função nativa deste perfil.';
    return span;
  };
  function linha(item){
    const tr=el('tr','gest-matriz-linha');
    tr.dataset.estado=item.estado;
    const nome=td('Recurso / operação','');
    nome.append(el('strong','',item.recurso),el('span','gest-matriz-operacao',item.acao));
    const chave=td('Identificador','');
    chave.append(el('code','gest-matriz-chave',item.id));
    const colunaEstado=td('Situação','');
    const selo=el('span','gest-matriz-estado',item.estado==='legado'?'Declarada no legado':'Proposta futura');
    selo.dataset.estado=item.estado;
    colunaEstado.append(selo);
    tr.append(nome,chave,colunaEstado);
    for(const perfil of PERFIS_NATIVOS){
      const coluna=td(perfil.nome,'');
      coluna.append(valorPerfil(item,perfil.id));
      tr.append(coluna);
    }
    const escopo=td('Abrangência','');
    escopo.append(el('span','gest-matriz-escopo',item.escopo));
    const detalhes=el('details','gest-matriz-detalhes');
    detalhes.append(el('summary','','Detalhes e critérios'),el('p','',item.nota));
    escopo.append(detalhes);
    tr.append(escopo);
    return tr;
  }
  function renderizar(){
    corpo.replaceChildren();
    if(!podeConsultar()){
      raiz.hidden=true;
      resumo.textContent='';
      vazio.hidden=true;
      return;
    }
    raiz.hidden=false;
    const linhas=filtrarMatrizGestao({modulo:modulo.value,estado:estado.value,termo:busca.value});
    const totais=resumoMatrizGestao(linhas);
    resumo.textContent=totais.total+' operações exibidas · '+totais.legado+' declaradas no frontend · '+totais.propostas+' propostas';
    for(const item of linhas)corpo.append(linha(item));
    vazio.hidden=linhas.length>0;
  }
  function inicializar(){
    if(inicializado)return;
    inicializado=true;
    for(const nome of MODULOS_MATRIZ){
      const option=el('option','',nome);
      option.value=nome;
      modulo.append(option);
    }
    modulo.value='Gestão';
    for(const input of [modulo,estado,busca])
      input.addEventListener(input===busca?'input':'change',renderizar);
    renderizar();
  }
  return Object.freeze({inicializar,renderizar});
}
