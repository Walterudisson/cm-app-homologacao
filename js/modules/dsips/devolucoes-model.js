import { pendente, unidadesPendentes } from './cautelas-model.js?v=1.13.16-h.3';

export function podeDevolverCautelaDsips(cautela) {
  return Boolean(cautela?.id && ['aberta','parcial'].includes(cautela.status) &&
    Array.isArray(cautela.itens) && cautela.itens.some(item => pendente(item)>0));
}

export function itensPendentesDevolucaoDsips(cautela) {
  if (!podeDevolverCautelaDsips(cautela)) return [];
  return cautela.itens.filter(item=>pendente(item)>0).map(item=>({
    materialId:item.materialId,nome:item.nome,unidade:item.unidade,
    controle:item.controle,entregue:Number(item.quantidade),
    devolvida:Number(item.devolvida||0),pendente:pendente(item),
    unidades:item.controle==='individualizado' ? unidadesPendentes(item) : []
  }));
}

export function prepararDevolucaoDsips(cautela, campos) {
  if (!podeDevolverCautelaDsips(cautela)) throw new Error('Esta cautela não possui saldo pendente para devolver.');
  const observacoes=String(campos?.observacoes||'').trim();
  if (observacoes.length>500) throw new Error('Informe observações de até 500 caracteres.');
  if (!Array.isArray(campos?.itens)||!campos.itens.length||campos.itens.length>20)
    throw new Error('Selecione de 1 a 20 materiais para devolver.');
  const pendentes=itensPendentesDevolucaoDsips(cautela);
  const vistos=new Set();
  const unidadesVistas=new Set();
  const itens=campos.itens.map(item=>{
    const original=pendentes.find(p=>p.materialId===item.materialId);
    if (!original||vistos.has(item.materialId)) throw new Error('Material inválido ou repetido nesta devolução.');
    vistos.add(item.materialId);
    const quantidade=Number(item.quantidade);
    if(!Number.isSafeInteger(quantidade)||quantidade<1||quantidade>original.pendente)
      throw new Error('Quantidade inválida ou superior à pendência de '+original.nome+'.');
    if(!Array.isArray(item.unidadeIds)) throw new Error('Confira as identificações da devolução.');
    const unidadeIds=item.unidadeIds.map(String);
    if(original.controle==='individualizado') {
      const permitidas=new Set(original.unidades.map(u=>u.id));
      if(unidadeIds.length!==quantidade||unidadeIds.some(id=>!permitidas.has(id)||unidadesVistas.has(id)))
        throw new Error('Selecione somente identificações ainda pendentes de '+original.nome+'.');
      for(const id of unidadeIds) {
        if(unidadesVistas.has(id)) throw new Error('Identificação repetida.');
        unidadesVistas.add(id);
      }
    } else if(unidadeIds.length) throw new Error('Material por quantidade não recebe identificações.');
    return {materialId:original.materialId,quantidade,unidadeIds};
  });
  if(unidadesVistas.size>200) throw new Error('Limite de 200 identificações por devolução.');
  return {cautelaId:cautela.id,itens,observacoes};
}

export function devolucaoIntegralDsips(cautela) {
  return itensPendentesDevolucaoDsips(cautela).map(item=>({
    materialId:item.materialId,quantidade:item.pendente,unidadeIds:item.unidades.map(u=>u.id)
  }));
}

// Preserva o mesmo recibo para uma repetição exata após resposta incerta.
export function criarReciboDevolucaoDsips(pedido, anterior, gerarId) {
  const assinatura=JSON.stringify(pedido);
  return anterior?.assinatura===assinatura ? anterior : {assinatura,operacaoId:gerarId()};
}
