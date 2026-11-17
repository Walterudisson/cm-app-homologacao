import {
  podeConsultarMateriaisDsips,
  podeGerenciarMateriaisDsips
} from './consulta-materiais-model.js?v=1.13.14-h.1';

export const TIPOS_CADASTRO_DSIPS = Object.freeze({
  categoria: Object.freeze({ colecao: 'categorias', titulo: 'Categorias', singular: 'categoria' }),
  local: Object.freeze({ colecao: 'locais', titulo: 'Locais de estoque', singular: 'local de estoque' })
});

export const podeConsultarCadastrosDsips = podeConsultarMateriaisDsips;
export const podeGerenciarCadastrosDsips = podeGerenciarMateriaisDsips;

const normalizar = valor => String(valor || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR').trim();

export function filtrarCadastrosDsips(registros, termo = '') {
  const busca = normalizar(termo);
  return (Array.isArray(registros) ? registros : [])
    .filter(item => item && normalizar(item.nome).includes(busca))
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
}

export function prepararCadastroDsips(campos, { tipo, id, existentes = [] } = {}) {
  if (!Object.hasOwn(TIPOS_CADASTRO_DSIPS, tipo)) throw new Error('Tipo de cadastro inválido.');
  if (typeof id !== 'string' || !id.trim()) throw new Error('Identificação inválida do cadastro.');
  const nome = String(campos?.nome || '').trim();
  if (!nome || nome.length > 120) throw new Error('Informe um nome de até 120 caracteres.');
  if (existentes.some(item => item.id !== id && normalizar(item.nome) === normalizar(nome))) {
    throw new Error('Já existe um cadastro com esse nome. Escolha outro.');
  }
  return {
    tipo,
    id,
    dados: { nome, ativo: campos.ativo === true }
  };
}
