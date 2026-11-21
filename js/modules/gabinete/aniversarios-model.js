// GAB-06: aniversariantes exclusivamente fictícios. Somente dia/mês, sem ano de nascimento.
// Em anos não bissextos, 29/02 é apresentado em 01/03 por convenção desta prévia.
const DIA_MS=86400000;
const PADRAO_ZONA='America/Sao_Paulo';
export const PERIODOS_ANIVERSARIO=Object.freeze(['hoje','7','30','todos']);
export const PREFERENCIAS_PADRAO=Object.freeze({exibirPainel:true,periodo:'30'});

export function dataLocalHoje(data=new Date(),zona=PADRAO_ZONA){
  const partes=new Intl.DateTimeFormat('en-US',{timeZone:zona,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(data);
  const campo=tipo=>partes.find(p=>p.type===tipo)?.value;
  return [campo('year'),campo('month'),campo('day')].join('-');
}
function anoBissexto(ano){return ano%4===0&&(ano%100!==0||ano%400===0);}
function diaBase(ano,mes,dia){
  // A validação usa um ano bissexto para que 29/02 seja uma data válida.
  const valida=new Date(Date.UTC(2000,mes-1,dia));
  if(valida.getUTCMonth()!==mes-1||valida.getUTCDate()!==dia)return null;
  if(mes===2&&dia===29&&!anoBissexto(ano))return Date.UTC(ano,2,1);
  return Date.UTC(ano,mes-1,dia);
}
export function proximoAniversario(dataMesDia,hojeISO){
  if(!/^\d{2}-\d{2}$/.test(String(dataMesDia||''))||!/^\d{4}-\d{2}-\d{2}$/.test(String(hojeISO||'')))return null;
  const [mes,dia]=dataMesDia.split('-').map(Number);
  const [anoAtual,mesHoje,diaHoje]=hojeISO.split('-').map(Number);
  if(anoAtual<2000||anoAtual>9998)return null;
  const hoje=Date.UTC(anoAtual,mesHoje-1,diaHoje);
  const validado=new Date(hoje);
  if(validado.getUTCFullYear()!==anoAtual||validado.getUTCMonth()!==mesHoje-1||validado.getUTCDate()!==diaHoje)return null;
  let alvo=diaBase(anoAtual,mes,dia);
  if(alvo===null)return null;
  if(alvo<hoje)alvo=diaBase(anoAtual+1,mes,dia);
  const dias=Math.round((alvo-hoje)/DIA_MS);
  return {dias,data:new Date(alvo).toISOString().slice(0,10),diaMes:`${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}`,ajustado:mes===2&&dia===29&&!anoBissexto(new Date(alvo).getUTCFullYear())};
}
export function listarAniversariantes(contatos,{hoje=dataLocalHoje(),periodo='30'}={}){
  const modo=PERIODOS_ANIVERSARIO.includes(periodo)?periodo:'30';
  const limite=modo==='hoje'?0:modo==='7'?7:modo==='30'?30:Infinity;
  return contatos.filter(c=>c.tipo==='pessoa'&&typeof c.aniversario==='string').flatMap(contato=>{
    const proximo=proximoAniversario(contato.aniversario,hoje);
    return proximo&&proximo.dias<=limite?[{id:contato.id,nome:contato.nome,unidade:contato.unidade,...proximo}]:[];
  }).sort((a,b)=>a.dias-b.dias||a.nome.localeCompare(b.nome,'pt-BR'));
}
export function normalizarPreferencias(valor){
  if(!valor||typeof valor!=='object'||Array.isArray(valor))return {...PREFERENCIAS_PADRAO};
  return {
    exibirPainel:typeof valor.exibirPainel==='boolean'?valor.exibirPainel:true,
    periodo:PERIODOS_ANIVERSARIO.includes(valor.periodo)?valor.periodo:'30'
  };
}
