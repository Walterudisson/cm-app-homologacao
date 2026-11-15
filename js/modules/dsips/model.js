import { modulosDoUsuario } from '../../platform/modules.js';
export const podeGerenciarDsips = usuario => ['admin', 'gestor'].includes(usuario?.perfil)
  && modulosDoUsuario(usuario).some(modulo => modulo.id === 'dsips');
export function identificadoresDoTexto(texto) {
  return String(texto || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}
export function resumoDsips({ materiais = [], estoque = [], responsaveis = [], cautelas = [] }) {
  return {
    materiais: materiais.filter(item => item.ativo !== false).length,
    comSaldo: estoque.filter(item => item.total > 0).length,
    semSaldo: materiais.filter(item => item.ativo !== false && !item.saldoInicialRegistrado).length,
    responsaveis: responsaveis.filter(item => item.ativo !== false).length,
    cautelas: cautelas.filter(item => ['aberta', 'parcial'].includes(item.status)).length
  };
}
export function filtrarPorNome(itens, termo) {
  const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const busca = normalizar(termo);
  return itens.filter(item => normalizar(`${item.nome || ''} ${item.matricula || ''} ${item.setor || ''}`).includes(busca));
}
