export const MAX_AJUSTE = 1000000;
const campos = ['total','disponivel','emCautela'];
export function saldoValido(s) {
  return !!s && campos.every(k=>Number.isSafeInteger(s[k]) && s[k]>=0) && s.total<=MAX_AJUSTE && s.total===s.disponivel+s.emCautela;
}
export function elegivelAjuste(material,local,posicao) {
  return !!(material && local && material.ativo!==false && local.ativo!==false && material.saldoInicialRegistrado && ['quantidade','individualizado'].includes(material.controle) && posicao?.materialId===material.id && posicao.localId===local.id && saldoValido(posicao));
}
export function unidadesDisponiveis(unidades,posicao) {
  return unidades.filter(u=>u.materialId===posicao.materialId && u.localId===posicao.localId && u.situacao==='disponivel' && !u.cautelaId && !u.responsavelId);
}
export function preverAjuste(s,tipo,q) {
  if(!saldoValido(s)||!['entrada','baixa'].includes(tipo)||!Number.isSafeInteger(q)||q<1||q>MAX_AJUSTE) throw Error('Informe uma quantidade inteira positiva válida.');
  const delta=tipo==='entrada'?q:-q;
  const depois={total:s.total+delta,disponivel:s.disponivel+delta,emCautela:s.emCautela};
  if(!saldoValido(depois)) throw Error('O ajuste excede o disponível ou o limite de estoque.');
  return depois;
}
export function prepararAjuste({material,local,posicao,tipo,quantidade,motivo,identificadores=[],unidadeIds=[],unidades=[]}) {
  if(!elegivelAjuste(material,local,posicao)) throw Error('Material ou posição de estoque indisponível.');
  motivo=String(motivo??'').trim();
  if(!motivo||motivo.length>500) throw Error('Informe uma justificativa de até 500 caracteres.');
  if(material.controle==='individualizado') {
    identificadores=tipo==='entrada'?identificadores.map(x=>String(x).trim().toUpperCase()).filter(Boolean).sort():[];
    unidadeIds=tipo==='baixa'?[...unidadeIds].sort():[];
    const chaves=identificadores.map(x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
    if(identificadores.some(x=>x.length>100)||new Set(chaves).size!==chaves.length) throw Error('Identificações repetidas ou com mais de 100 caracteres.');
    const disponiveis=new Set(unidadesDisponiveis(unidades,posicao).map(u=>u.id));
    if(new Set(unidadeIds).size!==unidadeIds.length||unidadeIds.some(id=>!disponiveis.has(id))) throw Error('Selecione apenas unidades disponíveis.');
    quantidade=tipo==='entrada'?identificadores.length:unidadeIds.length;
    if(quantidade>200) throw Error('Limite de 200 unidades por ajuste.');
  } else { identificadores=[];unidadeIds=[]; quantidade=Number(quantidade); }
  preverAjuste(posicao,tipo,quantidade);
  return {materialId:material.id,localId:local.id,tipo,quantidade,motivo,saldoEsperado:Object.fromEntries(campos.map(k=>[k,posicao[k]])),identificadores,unidadeIds};
}
