import {listarEventosBiDsips} from './service.js?v=1.13.31-h.1';
import {podeConsultarHistoricoDsips} from './historico-model.js?v=1.13.29-h.1';
import {podeConsultarMateriaisDsips} from './consulta-materiais-model.js';
import {periodoBi,resumirEstoqueBi,resumirCautelasBi,resumirEventosBi} from './painel-bi-model.js?v=1.13.31-h.1';
export function criarPainelBiDsips({obterUsuario}){
 const raiz=document.getElementById('dsips-bi'),periodo=document.getElementById('dsips-bi-periodo'),kpis=document.getElementById('dsips-bi-kpis'),graficos=document.getElementById('dsips-bi-graficos'),detalhes=document.getElementById('dsips-bi-detalhes'),status=document.getElementById('dsips-bi-status');
 let dados=null,rev=0;const el=(tag,cls,t)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(t!==undefined)n.textContent=String(t);return n;};
 const fmt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}),mostrar=(n)=>fmt.format(n);
 function limpar(){rev++;dados=null;raiz.classList.add('hidden');kpis.replaceChildren();graficos.replaceChildren();detalhes.replaceChildren();detalhes.classList.add('hidden');status.textContent='';}
 function kpi(titulo,valor,nota,acao){const n=el(acao?'button':'article','cm-bi-kpi');if(acao){n.type='button';n.addEventListener('click',acao);}n.append(el('strong','',valor),el('span','',titulo),el('small','',nota));kpis.append(n);}
 function painel(titulo,nota){const n=el('article','cm-bi-card');n.append(el('h4','',titulo));if(nota)n.append(el('p','cm-bi-note',nota));graficos.append(n);return n;}
 function barra(n,rotulo,v,max,cor){const row=el('div','cm-bi-row'),rot=el('div','cm-bi-row-label');rot.append(el('span','',rotulo),el('strong','',mostrar(v)));const trilha=el('div','cm-bi-track'),fill=el('div','cm-bi-fill '+cor);fill.style.width=(max>0?Math.min(100,100*v/max):0)+'%';trilha.append(fill);row.append(rot,trilha);n.append(row);}
 function listaSemSaldo(items){if(!podeConsultarMateriaisDsips(obterUsuario()))return;detalhes.replaceChildren(el('h4','','Materiais ativos sem saldo disponível'));if(!items.length)detalhes.append(el('p','cm-bi-note','Nenhum material com saldo registrado igual a zero.'));for(const m of items)detalhes.append(el('div','cm-bi-detail',m.nome+' · '+mostrar(m.disponivel)+' '+m.unidade));detalhes.classList.remove('hidden');detalhes.scrollIntoView({block:'nearest',behavior:'smooth'});}
 async function render(){
  if(!dados||!podeConsultarMateriaisDsips(obterUsuario())){limpar();return;}
  const token=++rev,uid=obterUsuario()?.uid,p=periodoBi(Number(periodo.value));const atual=()=>rev===token&&uid===obterUsuario()?.uid&&podeConsultarMateriaisDsips(obterUsuario());
  kpis.replaceChildren();graficos.replaceChildren();detalhes.replaceChildren();detalhes.classList.add('hidden');status.textContent='';
  const est=resumirEstoqueBi(dados.materiais,dados.estoque),ca=resumirCautelasBi(dados.cautelas,p);
  kpi('Materiais sem saldo disponível',mostrar(est.semSaldo.length),'Materiais ativos com saldo registrado igual a zero',()=>listaSemSaldo(est.semSaldo));
  if(est.semInicializacao.length||est.saldoDesconhecido.length)status.textContent=est.semInicializacao.length+' material(is) sem posição de estoque e '+est.saldoDesconhecido.length+' com saldo não confirmado; excluídos do indicador.';
  const ranking=painel('Materiais mais cautelados','No período: número de cautelas distintas que incluem cada material, não soma de unidades.');
  if(!ca.ranking.length)ranking.append(el('p','cm-bi-note','Nenhuma cautela com material identificado no período.'));
  for(const m of ca.ranking.slice(0,8))barra(ranking,m.nome,m.total,ca.ranking[0].total,'azul');
  if(ca.semData||ca.semMaterial)ranking.append(el('p','cm-bi-note','Registros sem data: '+ca.semData+'; itens sem identificador no período: '+ca.semMaterial+'. Não incluídos no ranking.'));
  const situacao=painel('Situação das cautelas','Posição atual de todas as cautelas, independente do período.');
  const soma=Object.values(ca.estados).reduce((a,b)=>a+b,0);for(const [chave,rotulo,cor] of [['aberta','Sem devolução','ambar'],['parcial','Parcialmente devolvidas','azul'],['encerrada','Encerradas','verde'],['outro','Outras situações','cinza']])barra(situacao,rotulo,ca.estados[chave],soma,cor);
  if(!podeConsultarHistoricoDsips(obterUsuario())){kpi('Tempo médio até devolução integral','—','Disponível para perfis autorizados à auditoria.');return;}
  const bloco=painel('Movimentações por período','Cautelas, devoluções, saldos iniciais e ajustes registrados. Meses inicial e final podem ser parciais.');bloco.append(el('p','cm-bi-note','Consultando eventos…'));
  try{
   const resultado=await listarEventosBiDsips(p.inicio,p.fim);if(!atual()||!podeConsultarHistoricoDsips(obterUsuario()))return;
   bloco.replaceChildren(el('h4','','Movimentações por período'));
   if(!resultado.completo){bloco.append(el('p','cm-bi-note','Mais de 1.000 eventos no período. Selecione um período menor para indicadores completos.'));kpi('Tempo médio até devolução integral','—','Período excedeu o limite de consulta.');return;}
   const bi=resumirEventosBi(resultado.eventos,dados.cautelas,p);
   kpi('Tempo médio até devolução integral',bi.mediaDias===null?'—':mostrar(bi.mediaDias)+' dias',bi.amostra+' cautela(s) encerrada(s), com devolução vinculada no período. Última devolução registrada.');
   bloco.append(el('p','cm-bi-note','Eventos por mês; devoluções parciais e integrais contam como operações distintas.'));
   const max=Math.max(1,...bi.meses.flatMap(m=>[m.cautelas,m.devolucoes,m.ajustes,m.saldos]));
   for(const m of bi.meses){const sec=el('div','cm-bi-month');sec.append(el('strong','',m.mes.split('-').reverse().join('/')));for(const [tipo,rot,cor] of [['cautelas','Cautelas','azul'],['devolucoes','Devoluções','verde'],['ajustes','Ajustes','ambar'],['saldos','Saldos iniciais','cinza']])barra(sec,rot,m[tipo],max,cor);bloco.append(sec);}
   if(bi.semVinculo||bi.invalidas)bloco.append(el('p','cm-bi-note','Devoluções sem vínculo: '+bi.semVinculo+'; intervalos inválidos: '+bi.invalidas+'. Excluídos do tempo médio.'));
  }catch{if(atual()){bloco.replaceChildren(el('h4','','Movimentações por período'),el('p','cm-bi-note','Não foi possível consultar a auditoria. Altere o período ou reabra o painel.'));kpi('Tempo médio até devolução integral','—','Consulta de auditoria indisponível.');}}
 }
 async function carregar(d){dados=d;raiz.classList.remove('hidden');await render();}
 periodo.addEventListener('change',()=>void render());return{carregar,limpar};
}
