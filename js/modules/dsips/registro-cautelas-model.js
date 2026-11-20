import {
  podeConsultarMateriaisDsips, podeGerenciarMateriaisDsips
} from './consulta-materiais-model.js?v=1.13.16-h.3';

export const podeConsultarCautelasDsips = podeConsultarMateriaisDsips;
export const podeRegistrarCautelasDsips = podeGerenciarMateriaisDsips;

export const STATUS_CAUTELA_DSIPS = Object.freeze({
  aberta: 'Sem devolução', parcial: 'Parcialmente devolvida', encerrada: 'Encerrada'
});

// Classes fechadas e exclusivas das cautelas; não alterar as situações dos cadastros.
export function classeStatusCautelaDsips(status) {
  const chave = typeof status === 'string' && Object.hasOwn(STATUS_CAUTELA_DSIPS,status) ? status : 'desconhecida';
  return 'dsips-cautela-status dsips-cautela-status-' + chave;
}

export function saldoDisponivelDsips(materialId, estoque = []) {
  return (Array.isArray(estoque) ? estoque : [])
    .filter(item => item?.materialId === materialId)
    .reduce((total,item) => total + Math.max(0,Number(item.disponivel) || 0),0);
}

export function unidadesDisponiveisDsips(unidades = []) {
  return (Array.isArray(unidades) ? unidades : []).filter(item =>
    item?.id && item.situacao === 'disponivel' && !item.cautelaId
  );
}

export function validarCautelaDsips(campos, { responsaveis = [], materiais = [], estoque = [], unidadesPorMaterial = {} } = {}) {
  const responsavelId = String(campos?.responsavelId || '').trim();
  if (!responsaveis.some(item => item.id === responsavelId && item.ativo !== false)) {
    throw new Error('Selecione um usuário ativo do CMAPP para receber os materiais.');
  }
  const observacoes = String(campos.observacoes || '').trim();
  if (observacoes.length > 500) throw new Error('As observações podem ter até 500 caracteres.');
  const itens = campos.itens || [];
  if (!Array.isArray(itens) || !itens.length || itens.length > 20) {
    throw new Error('Inclua de 1 a 20 materiais na cautela.');
  }
  const ids = new Set();
  let totalIdentificados = 0;
  const normalizados = itens.map(item => {
    const materialId = String(item.materialId || '').trim();
    const material = materiais.find(m => m.id === materialId && m.ativo !== false);
    if (!material || ids.has(materialId)) throw new Error('Material inválido ou repetido na cautela.');
    ids.add(materialId);
    const quantidade = Number(item.quantidade);
    const disponivel = saldoDisponivelDsips(materialId, estoque);
    if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > disponivel) {
      throw new Error('Quantidade inválida ou superior ao estoque disponível para ' + material.nome + '.');
    }
    let unidadeIds = [];
    if (material.controle === 'individualizado') {
      if (!Array.isArray(item.unidadeIds)) throw new Error('Selecione as identificações do material.');
      unidadeIds = item.unidadeIds.map(String);
      const permitidas = new Set(unidadesDisponiveisDsips(unidadesPorMaterial[materialId]).map(u => u.id));
      if (unidadeIds.length !== quantidade || new Set(unidadeIds).size !== unidadeIds.length ||
          unidadeIds.some(id => !permitidas.has(id))) {
        throw new Error('Confira as identificações disponíveis de ' + material.nome + '.');
      }
      totalIdentificados += unidadeIds.length;
    } else if (item.unidadeIds?.length) {
      throw new Error('Material por quantidade não recebe identificações individuais.');
    }
    return { materialId, quantidade, unidadeIds };
  });
  if (totalIdentificados > 200) throw new Error('Limite de 200 unidades identificadas por cautela.');
  return { responsavelId, itens: normalizados, observacoes };
}

export function filtrarCautelasDsips(cautelas = [], texto = '', status = 'todas') {
  const normalizar = valor => String(valor || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
  const busca = normalizar(texto);
  return (Array.isArray(cautelas) ? cautelas : []).filter(item =>
    item && (status === 'todas' || item.status === status || (status === 'pendentes' && ['aberta','parcial'].includes(item.status))) &&
    normalizar([item.responsavelNome, item.responsavelMatricula,
      ...(item.itens || []).map(m => m.nome)].join(' ')).includes(busca)
  ).sort((a,b) => Number(b.criadoEm?.toMillis?.() || 0) - Number(a.criadoEm?.toMillis?.() || 0));
}
