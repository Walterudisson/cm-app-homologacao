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
