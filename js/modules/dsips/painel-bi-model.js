const diaMs=86400000;
export function dataBi(v){try{const d=v instanceof Date?v:v?.toDate?.();return d instanceof Date&&Number.isFinite(+d)?d:null;}catch{return null;}}
const chaveMes=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'});
export function periodoBi(dias=180,agora=new Date()){const n=[30,90,180].includes(Number(dias))?Number(dias):180;return{inicio:new Date(+agora-n*diaMs),fim:new Date(+agora)};}
const dentro=(d,p)=>d&&d>=p.inicio&&d<=p.fim;
export function resumirEstoqueBi(materiais=[],estoque=[]){
 const posicoes=new Map();for(const p of estoque){if(!p?.materialId)continue;const a=posicoes.get(p.materialId)||[];a.push(p.disponivel);posicoes.set(p.materialId,a);}
 const semSaldo=[],semInicializacao=[],saldoDesconhecido=[],abaixoMinimo=[];
 let configurados=0;
 for(const m of materiais){if(!m?.id||m.ativo===false)continue;const pos=posicoes.get(m.id);if(!pos?.length){semInicializacao.push(m);continue;}
  if(!pos.every(x=>Number.isSafeInteger(x)&&x>=0)){saldoDesconhecido.push(m);continue;}
  const disponivel=pos.reduce((s,v)=>s+v,0);if(!Number.isSafeInteger(disponivel)){saldoDesconhecido.push(m);continue;}
  const item={id:m.id,nome:m.nome||'Material sem nome',unidade:m.unidade||'',disponivel};
  if(disponivel===0)semSaldo.push(item);
  if(Number.isSafeInteger(m.estoqueMinimo)&&m.estoqueMinimo>0){configurados++;if(disponivel<m.estoqueMinimo)abaixoMinimo.push({...item,minimo:m.estoqueMinimo});}
 }
 return {semSaldo,semInicializacao,saldoDesconhecido,abaixoMinimo,configurados};
}
export function resumirCautelasBi(cautelas=[],periodo){
 const estados={aberta:0,parcial:0,encerrada:0,outro:0},mapa=new Map();let semData=0,semMaterial=0;
 for(const c of cautelas){if(!c)continue;const st=Object.hasOwn(estados,c.status)?c.status:'outro';estados[st]++;const d=dataBi(c.criadoEm);if(!d){semData++;continue;}if(!dentro(d,periodo))continue;
   const vistos=new Set();for(const item of Array.isArray(c.itens)?c.itens:[]){if(!item?.materialId){semMaterial++;continue;}if(vistos.has(item.materialId))continue;vistos.add(item.materialId);const prev=mapa.get(item.materialId)||{id:item.materialId,nome:item.nome||'Material sem nome',total:0};prev.total++;mapa.set(item.materialId,prev);}
 }
 const ranking=[...mapa.values()].sort((a,b)=>b.total-a.total||a.nome.localeCompare(b.nome,'pt-BR')||a.id.localeCompare(b.id));
 return {estados,ranking,semData,semMaterial};
}
export function resumirEventosBi(eventos=[],cautelas=[],periodo){
 const meses=new Map(),devolucoes=new Map(),fechadas=new Map(cautelas.filter(c=>c?.id&&c.status==='encerrada').map(c=>[c.id,c]));
 for(let d=new Date(+periodo.inicio);d<=periodo.fim;d=new Date(+d+diaMs)){const k=chaveMes.format(d);meses.set(k,{mes:k,cautelas:0,devolucoes:0,ajustes:0,saldos:0});}
 const ultimo=chaveMes.format(periodo.fim);if(!meses.has(ultimo))meses.set(ultimo,{mes:ultimo,cautelas:0,devolucoes:0,ajustes:0,saldos:0});
 const tipos={cautela_registrada:'cautelas',devolucao_registrada:'devolucoes',ajuste_estoque_registrado:'ajustes',saldo_inicial_registrado:'saldos'};
 const totais={cautelas:0,devolucoes:0,ajustes:0,saldos:0};let semVinculo=0;
 for(const e of eventos){const d=dataBi(e?.registradoEm);if(!dentro(d,periodo)||!Object.hasOwn(tipos,e.tipo))continue;const tipo=tipos[e.tipo],m=meses.get(chaveMes.format(d));if(!m)continue;m[tipo]++;totais[tipo]++;
   if(tipo==='devolucoes'){const id=e.dados?.cautelaId;if(!id){semVinculo++;continue;}if(!devolucoes.has(id)||d>devolucoes.get(id))devolucoes.set(id,d);}
 }
 let soma=0,amostra=0,invalidas=0;
 for(const [id,fim] of devolucoes){const c=fechadas.get(id);if(!c)continue;const inicio=dataBi(c.criadoEm);if(!inicio||fim<inicio){invalidas++;continue;}soma+=(fim-inicio)/diaMs;amostra++;}
 return {meses:[...meses.values()].sort((a,b)=>a.mes.localeCompare(b.mes)),totais,mediaDias:amostra?soma/amostra:null,amostra,semVinculo,invalidas};
}
