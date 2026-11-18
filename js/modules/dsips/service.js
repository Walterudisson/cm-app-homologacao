import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { db, functions } from '../../config/firebase.js';

const colecoes = Object.freeze({ categorias: 'dsipsCategorias', locais: 'dsipsLocais', materiais: 'dsipsMateriais', estoque: 'dsipsEstoque', cautelas: 'dsipsCautelas' });
export async function listarCadastroDsips(tipo) {
  if (tipo === 'responsaveis') return httpsCallable(functions, 'dsipsListarResponsaveis')({}).then(result => result.data.usuarios);
  if (!Object.hasOwn(colecoes, tipo)) throw new Error('Consulta inválida.');
  const snapshot = await getDocs(collection(db, colecoes[tipo]));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a, b) => (a.nome || a.materialId || '').localeCompare(b.nome || b.materialId || '', 'pt-BR'));
}
export async function listarEventosDsips() {
  const snapshot = await getDocs(query(collection(db, 'dsipsEventos'), orderBy('registradoEm', 'desc'), limit(30)));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
// Cursor do documento mantém ordenação consistente quando timestamps coincidem.
export async function listarPaginaEventosDsips(cursor = null) {
  const restricoes = [orderBy('registradoEm', 'desc')];
  if (cursor) restricoes.push(startAfter(cursor));
  restricoes.push(limit(31));
  const snapshot = await getDocs(query(collection(db, 'dsipsEventos'), ...restricoes));
  const docs = snapshot.docs.slice(0, 30);
  return { eventos: docs.map(doc => ({ ...doc.data(), id: doc.id })),
    cursor: docs.at(-1) || null, temMais: snapshot.docs.length > 30 };
}
export async function listarUnidadesDsips(materialId) {
  const snapshot = await getDocs(query(collection(db, 'dsipsUnidades'), where('materialId', '==', materialId)));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
export const salvarCadastroDsips = dados => httpsCallable(functions, 'dsipsSalvarCadastro')(dados).then(result => result.data);
export const registrarSaldoInicialDsips = dados => httpsCallable(functions, 'dsipsRegistrarSaldoInicial')(dados).then(result => result.data);
export const registrarCautelaDsips = dados => httpsCallable(functions, 'dsipsRegistrarCautela')(dados).then(result => result.data);
export const registrarDevolucaoDsips = dados => httpsCallable(functions, 'dsipsRegistrarDevolucao')(dados).then(result => result.data);
