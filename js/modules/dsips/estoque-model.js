import {
  podeConsultarMateriaisDsips,
  podeGerenciarMateriaisDsips
} from './consulta-materiais-model.js?v=1.13.15-h.1';

export const podeConsultarEstoqueDsips = podeConsultarMateriaisDsips;
export const podeRegistrarSaldoDsips = podeGerenciarMateriaisDsips;

export function identificadoresDoTextoDsips(texto) {
  return String(texto || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}
const normalizar = valor => String(valor || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

export function materiaisPendentesSaldoDsips(materiais = [], estoque = []) {
  const comPosicao = new Set(estoque.map(item => item.materialId));
  return materiais.filter(item =>
    item && item.ativo !== false && item.saldoInicialRegistrado !== true && !comPosicao.has(item.id)
  ).sort((a,b)=>String(a.nome || '').localeCompare(String(b.nome || ''),'pt-BR'));
}

export function resumoEstoqueDsips(materiais = [], estoque = []) {
  const comSaldo = new Set(estoque.map(item => item.materialId));
  for (const item of materiais) if (item.saldoInicialRegistrado === true) comSaldo.add(item.id);
  const pendentes = materiaisPendentesSaldoDsips(materiais, estoque);
  const individualizados = new Set(materiais.filter(item => item.controle === 'individualizado').map(item => item.id));
  return {
    inicializados: comSaldo.size,
    pendentes: pendentes.length,
    identificacoesDisponiveis: estoque
      .filter(item => individualizados.has(item.materialId))
      .reduce((total,item)=>total+Math.max(0,Number(item.disponivel) || 0),0)
  };
}

export function prepararSaldoInicialDsips(campos, { materiais = [], locais = [], estoque = [] } = {}) {
  const materialId = String(campos.materialId || '').trim();
  const localId = String(campos.localId || '').trim();
  const material = materiais.find(item => item.id === materialId);
  if (!material || !materiaisPendentesSaldoDsips(materiais, estoque).some(item => item.id === materialId)) {
    throw new Error('Selecione um material ativo que ainda não tenha saldo inicial.');
  }
  if (!locais.some(item => item.id === localId && item.ativo !== false)) {
    throw new Error('Selecione um local de estoque ativo.');
  }
  const motivo = String(campos.motivo || '').trim();
  if (!motivo || motivo.length > 500) throw new Error('Informe uma justificativa de até 500 caracteres.');
  const identificadores = material.controle === 'individualizado'
    ? identificadoresDoTextoDsips(campos.identificadores) : [];
  let quantidade;
  if (material.controle === 'individualizado') {
    if (identificadores.length > 200) throw new Error('São permitidas até 200 identificações por material.');
    const unicos = new Set(identificadores.map(normalizar));
    if (unicos.size !== identificadores.length) {
      throw new Error('Há identificações repetidas. Confira patrimônio e número de série.');
    }
    if (identificadores.some(item => item.length > 120)) {
      throw new Error('Cada identificação deve ter até 120 caracteres.');
    }
    quantidade = identificadores.length;
  } else {
    const texto = String(campos.quantidade ?? '').trim();
    quantidade = Number(texto);
    if (!texto || !Number.isSafeInteger(quantidade) || quantidade < 0 || quantidade > 1000000) {
      throw new Error('Informe uma quantidade inteira entre zero e 1.000.000.');
    }
  }
  return { materialId, localId, quantidade, motivo, identificadores };
}
