export function pendente(item) {
  return Math.max(0, Number(item.quantidade || 0) - Number(item.devolvida || 0));
}
export function unidadesPendentes(item) {
  return (item.unidades || []).filter(unidade => !(item.unidadesDevolvidas || []).includes(unidade.id));
}
export function resumirPosse(cautelas) {
  const grupos = new Map();
  for (const cautela of cautelas) {
    if (!['aberta', 'parcial'].includes(cautela.status)) continue;
    if (!grupos.has(cautela.responsavelId)) grupos.set(cautela.responsavelId, {
      responsavelId: cautela.responsavelId, nome: cautela.responsavelNome,
      matricula: cautela.responsavelMatricula || '', materiais: new Map(), cautelas: new Set()
    });
    const grupo = grupos.get(cautela.responsavelId);
    for (const item of cautela.itens) {
      const quantidade = pendente(item); if (!quantidade) continue;
      grupo.cautelas.add(cautela.id);
      if (!grupo.materiais.has(item.materialId)) grupo.materiais.set(item.materialId, { materialId: item.materialId, nome: item.nome, unidade: item.unidade, quantidade: 0, identificacoes: [] });
      const material = grupo.materiais.get(item.materialId); material.quantidade += quantidade;
      material.identificacoes.push(...unidadesPendentes(item).map(unidade => unidade.identificacao));
    }
  }
  return [...grupos.values()].filter(grupo => grupo.materiais.size).map(grupo => ({ ...grupo, materiais: [...grupo.materiais.values()], cautelas: [...grupo.cautelas] })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
export function descricaoItens(itens) {
  return itens.map(item => `${item.nome}: ${item.quantidade} ${item.unidade}`).join('; ');
}
