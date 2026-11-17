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
