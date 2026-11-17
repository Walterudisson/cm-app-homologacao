import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "../config/firebase.js";

const normalizarId = nome => String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);

export async function listarFuncoesPersonalizadas() {
  const snapshot = await getDocs(collection(db, 'funcoes'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data(), nativa: false }));
}

export async function criarFuncao(dados, operador) {
  const id = normalizarId(dados.nome);
  if (id.length < 3) throw new Error('Informe um nome de função válido.');
  const agora = new Date().toISOString();
  await setDoc(doc(db, 'funcoes', id), {
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim(),
    perfilBase: dados.perfilBase,
    permissoes: [...new Set(dados.permissoes)].sort(),
    ativo: true,
    nativa: false,
    criadoEm: agora,
    criadoPorUid: operador.uid,
    atualizadoEm: agora,
    atualizadoPorUid: operador.uid,
    auditoria: [{ acao: 'criacao', em: agora, uid: operador.uid, nome: operador.nome || operador.email || '' }]
  });
}

export async function atualizarFuncao(id, dados, operador) {
  const agora = new Date().toISOString();
  await updateDoc(doc(db, 'funcoes', id), {
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim(),
    perfilBase: dados.perfilBase,
    permissoes: [...new Set(dados.permissoes)].sort(),
    atualizadoEm: agora,
    atualizadoPorUid: operador.uid,
    auditoria: arrayUnion({ acao: 'atualizacao', em: agora, uid: operador.uid, nome: operador.nome || operador.email || '' })
  });
}

export async function alterarEstadoFuncao(id, ativo, operador) {
  const agora = new Date().toISOString();
  await updateDoc(doc(db, 'funcoes', id), {
    ativo,
    atualizadoEm: agora,
    atualizadoPorUid: operador.uid,
    auditoria: arrayUnion({ acao: ativo ? 'reativacao' : 'desativacao', em: agora, uid: operador.uid, nome: operador.nome || operador.email || '' })
  });
}
