import { modulosDoUsuario } from '../../platform/modules.js';

// A interface nunca concede acesso: a autorização efetiva é a das Rules de HML.
// Perfis básicos e contas V2 nunca usam esta página legada.
export function podeConsultarMateriaisDsips(usuario) {
  if (!usuario || Object.hasOwn(usuario, 'autorizacaoVersao')) return false;
  return modulosDoUsuario(usuario).some(modulo => modulo.id === 'dsips');
}

const normalizar = texto => String(texto || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR').trim();

export function filtrarMateriaisDsips(itens, busca = '', categoriaId = '') {
  const termo = normalizar(busca);
  return (Array.isArray(itens) ? itens : [])
    .filter(item => item && (!categoriaId || item.categoriaId === categoriaId)
      && normalizar(item.nome).includes(termo))
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}


export function podeGerenciarMateriaisDsips(usuario) {
  return podeConsultarMateriaisDsips(usuario) && ['admin', 'gestor'].includes(usuario.perfil);
}

// Validação de interface; o backend mantém a autoridade das regras e permissões.
export function prepararCadastroMaterialDsips(campos, { id, categorias = [], anterior = null } = {}) {
  if (!id || typeof id !== 'string') throw new Error('Identificação inválida do material.');
  const nome = String(campos.nome || '').trim();
  if (!nome || nome.length > 120) throw new Error('Informe um nome de até 120 caracteres.');
  const categoriaId = String(campos.categoriaId || '').trim();
  if (!categorias.some(item => item.id === categoriaId && item.ativo !== false)) {
    throw new Error('Selecione uma categoria ativa para o material.');
  }
  const controle = String(campos.controle || '');
  const unidade = String(campos.unidade || '');
  const icone = String(campos.icone || 'caixa');
  const cor = String(campos.cor || 'azul');
  const observacoes = String(campos.observacoes || '').trim();
  if (!['quantidade', 'individualizado'].includes(controle)) throw new Error('Tipo de controle inválido.');
  if (!['un', 'par', 'caixa', 'kit'].includes(unidade)) throw new Error('Unidade de medida inválida.');
  if (!['caixa', 'escudo', 'radio', 'chave', 'maleta', 'colete'].includes(icone)) throw new Error('Ícone inválido.');
  if (!['azul', 'verde', 'roxo', 'ambar'].includes(cor)) throw new Error('Cor inválida.');
  if (observacoes.length > 500) throw new Error('Observações devem ter no máximo 500 caracteres.');
  if (anterior?.saldoInicialRegistrado && (controle !== anterior.controle || unidade !== anterior.unidade)) {
    throw new Error('Controle e unidade não podem mudar após o saldo inicial.');
  }
  return { tipo: 'material', id, dados: { nome, categoriaId, controle, unidade, icone, cor, observacoes, ativo: campos.ativo === true } };
}


// Ícones e cores controlados por listas fechadas; dados antigos têm padrão azul/caixa.
export const ICONES_CARDS_DSIPS = Object.freeze({
  caixa: Object.freeze(['M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 18Z', 'm3.3 7 8.7 5 8.7-5','M12 22V12']),
  escudo: Object.freeze(['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z']),
  radio: Object.freeze(['M4 9h16v11H4z', 'M8 9 18 3', 'M8 14h4', 'M17 16a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z']),
  chave: Object.freeze(['M14 7a5 5 0 1 0-9.8 1.4A5 5 0 0 0 14 7Z', 'M10 11 20 21', 'M17 18l2-2']),
  maleta: Object.freeze(['M5 6h14a2 2 0 0 1 2 2v12H3V8a2 2 0 0 1 2-2Z', 'M9 6V3h6v3', 'M3 12h18', 'M11 12v2h2v-2']),
  colete: Object.freeze(['M8 2h8l2 4 3 2v13H3V8l3-2 2-4Z', 'M9 2v6h6V2', 'M12 8v13', 'M6 13h4', 'M14 13h4'])
});
export const CORES_CARDS_DSIPS = Object.freeze(['azul', 'verde', 'roxo', 'ambar']);
export function visualMaterialDsips(material) {
  const icone = material?.icone;
  const cor = material?.cor;
  return {
    icone: typeof icone === 'string' && Object.hasOwn(ICONES_CARDS_DSIPS, icone) ? icone : 'caixa',
    cor: CORES_CARDS_DSIPS.includes(cor) ? cor : 'azul'
  };
}
