import { podeGerenciarMateriaisDsips } from './consulta-materiais-model.js?v=1.13.18-h.1';
export const podeConsultarHistoricoDsips = podeGerenciarMateriaisDsips;
export const TIPOS_HISTORICO_DSIPS=Object.freeze({cadastro:'Cadastro',saldo:'Saldo inicial',ajuste:'Ajustes de estoque',cautela:'Cautela',devolucao:'Devolução',outro:'Outro evento'});
const texto = v => typeof v==='string' ? v.trim() : '';
const normalizar = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
function dataEvento(v){
  try { const d=v?.toDate?.() ?? (v instanceof Date ? v : null); return d instanceof Date && Number.isFinite(d.getTime()) ? d : null; } catch (_) {return null;}
}
export function apresentarEventoDsips(evento){
  const d=evento?.dados||{}, tipo=texto(evento?.tipo);
  let grupo='outro', titulo=tipo||'Evento sem tipo registrado', linhas=[];
  if(tipo==='saldo_inicial_registrado'){
    grupo='saldo'; titulo=texto(d.materialNome)||'Material não informado';
    if(d.quantidade!==undefined && d.quantidade!==null)linhas.push('Saldo inicial: '+String(d.quantidade)+' '+texto(d.unidade));
  }else if(tipo==='ajuste_estoque_registrado'){
    grupo='ajuste'; titulo=(d.tipo==='entrada'?'Entrada de estoque':d.tipo==='baixa'?'Baixa definitiva':'Ajuste de estoque')+' · '+(texto(d.materialNome)||'Material não informado');
    linhas.push('Quantidade: '+String(d.quantidade??'')+' '+texto(d.unidade));
    for(const [k,l] of [['total','Total'],['disponivel','Disponível'],['emCautela','Em cautela']]) if(d.antes?.[k]!==undefined&&d.depois?.[k]!==undefined)linhas.push(l+': '+d.antes[k]+' → '+d.depois[k]);
    for(const u of Array.isArray(d.unidades)?d.unidades:[])if(texto(u.identificacao))linhas.push('Identificação: '+u.identificacao);
  }else if(['cautela_registrada','devolucao_registrada'].includes(tipo)){
    grupo=tipo==='cautela_registrada'?'cautela':'devolucao';
    titulo=texto(d.responsavelNome)||'Responsável não informado';
    for(const item of Array.isArray(d.itens)?d.itens:[]){
      linhas.push([texto(item.nome)||'Material não informado',item.quantidade===undefined||item.quantidade===null?'Quantidade não informada':String(item.quantidade)+' '+texto(item.unidade)].join(': '));
    }
  }else if(tipo.startsWith('cadastro_')||['categoria','local','material','responsavel'].includes(d.tipo)){
    grupo='cadastro';titulo=texto(d.nome)||'Cadastro sem nome registrado';
    if(texto(d.tipo))linhas.push('Tipo: '+d.tipo);
  }
  if(texto(d.localNome))linhas.push('Local: '+d.localNome);
  if(texto(d.motivo))linhas.push('Justificativa: '+d.motivo);
  if(texto(d.observacoes))linhas.push('Observações: '+d.observacoes);
  if(texto(d.cautelaId))linhas.push('Cautela: '+d.cautelaId);
  const data=dataEvento(evento?.registradoEm);
  return {id:texto(evento?.id),grupo,tipo,titulo,operador:texto(evento?.operadorNome)||'Operador não informado',data,linhas};
}
export function filtrarHistoricoDsips(eventos=[],busca='',grupo='todos'){
  const termo=normalizar(busca);
  return eventos.map(apresentarEventoDsips).filter(e=>(grupo==='todos'||e.grupo===grupo)&&
    normalizar([e.id,e.tipo,e.titulo,e.operador,...e.linhas,TIPOS_HISTORICO_DSIPS[e.grupo]].join(' ')).includes(termo));
}

const dataDia = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
export function diaEventoDsips(data){return data?dataDia.format(data):'';}
export function filtrarTimelineDsips(eventos=[],{visao='geral',busca='',grupo='todos',de='',ate=''}={}){
 const termo=normalizar(busca);
 return eventos.flatMap(raw=>{
  const e=apresentarEventoDsips(raw),d=raw.dados||{},dia=diaEventoDsips(e.data);
  if(grupo!=='todos'&&e.grupo!==grupo)return [];
  if((de||ate)&&(!dia||(de&&dia<de)||(ate&&dia>ate)))return [];
  const materiais=[...(Array.isArray(d.itens)?d.itens.map(i=>[i.materialId,i.nome].filter(Boolean).join(' ')):[]),d.materialId,d.materialNome,...(e.grupo==='cadastro'&&d.tipo==='material'?[d.nome,d.id]:[])].filter(Boolean);
  const pessoa=[d.responsavelUid,d.responsavelId,d.responsavelNome].filter(Boolean);
  const operador=[raw.operadorUid,raw.operadorNome].filter(Boolean);
  const campos=visao==='material'?materiais:visao==='pessoa'?pessoa:visao==='operador'?operador:null;
  if(campos&&(!campos.length||!normalizar(campos.join(' ')).includes(termo)))return [];
  if(!campos&&!filtrarHistoricoDsips([raw],busca,grupo).length)return [];
  return [{...e,dia}];
 }).sort((a,b)=>(b.data?.getTime()??-Infinity)-(a.data?.getTime()??-Infinity));
}
