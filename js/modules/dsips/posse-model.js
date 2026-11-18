import { pendente, unidadesPendentes } from './cautelas-model.js?v=1.13.17-h.1';
import { podeConsultarMateriaisDsips } from './consulta-materiais-model.js?v=1.13.17-h.1';

export const podeConsultarPosseDsips = podeConsultarMateriaisDsips;
const normalizar = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();

export function consolidarPosseDsips(cautelas = []) {
  const grupos = new Map();
  for (const cautela of cautelas) {
    if (!['aberta','parcial'].includes(cautela?.status)) continue;
    const uid = cautela.responsavelUid || (cautela.responsavelOrigem === 'usuarios' ? cautela.responsavelId : '');
    // Não presumir identidade por nome nem unir registros de origem diferente.
    const chave = uid ? 'usuario:'+uid : 'legado:'+(cautela.responsavelId || cautela.id);
    for (const item of cautela.itens || []) {
      const quantidade = pendente(item);
      if (!Number.isSafeInteger(quantidade) || quantidade <= 0) continue;
      if (!grupos.has(chave)) grupos.set(chave,{
        chave,nome:cautela.responsavelNome || 'Responsável não informado',
        matricula:cautela.responsavelMatricula || '', legado:!uid, materiais:new Map()
      });
      const grupo = grupos.get(chave);
      const chaveMaterial=JSON.stringify([item.materialId||cautela.id+':'+item.nome,item.unidade||'un']);
      if(!grupo.materiais.has(chaveMaterial)) grupo.materiais.set(chaveMaterial,{
        materialId:item.materialId,nome:item.nome||'Material não informado',unidade:item.unidade||'un',
        quantidade:0,identificacoes:[],cautelas:[]
      });
      const material=grupo.materiais.get(chaveMaterial);
      material.quantidade+=quantidade;
      material.identificacoes.push(...unidadesPendentes(item).map(u=>String(u.identificacao||u.id||'')).filter(Boolean));
      material.cautelas.push({id:cautela.id,quantidade});
    }
  }
  return [...grupos.values()].map(g=>({...g,materiais:[...g.materiais.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))}))
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
}

export function filtrarPosseDsips(grupos, termo='') {
  const busca=normalizar(termo);
  if(!busca)return grupos;
  return grupos.map(grupo=>{
    if(normalizar(grupo.nome+' '+grupo.matricula).includes(busca))return grupo;
    return {...grupo,materiais:grupo.materiais.filter(m=>normalizar([m.nome,...m.identificacoes,...m.cautelas.map(c=>c.id)].join(' ')).includes(busca))};
  }).filter(grupo=>grupo.materiais.length);
}
