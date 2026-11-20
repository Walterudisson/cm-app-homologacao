import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { auth, db, functions } from '../../config/firebase.js';
import {criarCacheConsultas} from '../../core/cache-consultas.js?v=1.13.34-h.1';
const cache=criarCacheConsultas({identidade:()=>auth.currentUser?.uid});
const TTL_CATALOGO=60000;
const catalogos=new Set(['materiais','categorias','locais']);
export function invalidarCacheDsips(){cache.limpar();}
let gravacoes=0;
async function gravarDsips(nome,dados){invalidarCacheDsips();gravacoes++;try{return (await httpsCallable(functions,nome)(dados)).data;}finally{gravacoes--;invalidarCacheDsips();}}


const colecoes = Object.freeze({ categorias: 'dsipsCategorias', locais: 'dsipsLocais', materiais: 'dsipsMateriais', estoque: 'dsipsEstoque', cautelas: 'dsipsCautelas' });
export async function listarCadastroDsips(tipo) {
  // Responsáveis, cautelas e estoque não reutilizam resultados concluídos.
  return cache.consultar('cadastro:'+tipo,()=>consultarCadastroDsips(tipo),!gravacoes&&catalogos.has(tipo)?TTL_CATALOGO:0);
}
async function consultarCadastroDsips(tipo) {
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
  return cache.consultar('unidades:'+materialId,async()=>{
  const snapshot = await getDocs(query(collection(db, 'dsipsUnidades'), where('materialId', '==', materialId)));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  });
}
export const salvarCadastroDsips = dados => gravarDsips('dsipsSalvarCadastro',dados);
export const registrarSaldoInicialDsips = dados => gravarDsips('dsipsRegistrarSaldoInicial',dados);
export const registrarCautelaDsips = dados => gravarDsips('dsipsRegistrarCautela',dados);
export const registrarAjusteEstoqueDsips = dados => gravarDsips('dsipsRegistrarAjusteEstoque',dados);
export const registrarDevolucaoDsips = dados => gravarDsips('dsipsRegistrarDevolucao',dados);

/* BI: consulta de período delimitado; 1001º documento informa excesso, nunca é apresentado como total. */
export async function listarEventosBiDsips(inicio,fim){
  if(!(inicio instanceof Date)||!(fim instanceof Date)||!Number.isFinite(+inicio)||!Number.isFinite(+fim)||inicio>fim)throw new Error('Período inválido.');
  const snapshot=await getDocs(query(collection(db,'dsipsEventos'),where('registradoEm','>=',inicio),where('registradoEm','<=',fim),orderBy('registradoEm','desc'),limit(1001)));
  return {eventos:snapshot.docs.slice(0,1000).map(doc=>({...doc.data(),id:doc.id})),completo:snapshot.docs.length<=1000};
}

// Consulta de posse não precisa ler cautelas encerradas. Filtro único no índice padrão de status.
export async function listarCautelasPendentesDsips(){
  return cache.consultar('cautelas:pendentes',async()=>{
  const snapshot=await getDocs(query(collection(db,'dsipsCautelas'),where('status','in',['aberta','parcial'])));
  return snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
  });
}
