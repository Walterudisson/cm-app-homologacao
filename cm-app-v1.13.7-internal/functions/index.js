const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const auth = getAuth();
const REGIAO = 'southamerica-east1';
const PERFIS = new Set(['admin', 'gestor', 'conferente']);

function texto(valor, maximo = 160) {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

function divisoesValidas(valor) {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.map(item => texto(item, 180)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

async function exigirAdmin(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Faça login novamente.');
  const snap = await db.doc(`usuarios/${request.auth.uid}`).get();
  const usuario = snap.data();
  if (!snap.exists || usuario?.perfil !== 'admin' || usuario?.ativo === false) {
    throw new HttpsError('permission-denied', 'Apenas Administradores ativos podem realizar esta operação.');
  }
  return { uid: request.auth.uid, nome: usuario.nome || '', email: request.auth.token.email || usuario.email || '' };
}

function validarCadastro(data) {
  const nome = texto(data?.nome, 120);
  const email = texto(data?.email, 180).toLowerCase();
  const senha = typeof data?.senha === 'string' ? data.senha : '';
  const perfil = texto(data?.perfil, 20).toLowerCase();
  const divisoesAtribuidas = perfil === 'conferente' ? divisoesValidas(data?.divisoesAtribuidas) : [];
  if (nome.length < 3) throw new HttpsError('invalid-argument', 'Informe o nome completo.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError('invalid-argument', 'Informe um e-mail válido.');
  if (senha.length < 8) throw new HttpsError('invalid-argument', 'A senha inicial deve possuir pelo menos 8 caracteres.');
  if (!PERFIS.has(perfil)) throw new HttpsError('invalid-argument', 'Perfil de acesso inválido.');
  if (perfil === 'conferente' && divisoesAtribuidas.length === 0) {
    throw new HttpsError('invalid-argument', 'Atribua pelo menos uma divisão ao Conferente.');
  }
  return { nome, email, senha, perfil, divisoesAtribuidas };
}

async function auditar(tipo, alvo, operador, detalhes = {}) {
  await db.collection('auditoriaAcessos').add({
    tipo,
    alvoUid: alvo.uid,
    alvoNome: alvo.nome || '',
    alvoEmail: alvo.email || '',
    operadorUid: operador.uid,
    operadorNome: operador.nome,
    operadorEmail: operador.email,
    detalhes,
    registradoEm: FieldValue.serverTimestamp()
  });
}

exports.criarUsuario = onCall({ region: REGIAO, enforceAppCheck: false }, async request => {
  const operador = await exigirAdmin(request);
  const dados = validarCadastro(request.data);
  let conta;
  try {
    conta = await auth.createUser({ email: dados.email, password: dados.senha, displayName: dados.nome, disabled: false });
    const documento = {
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
      divisoesAtribuidas: dados.divisoesAtribuidas,
      ativo: true,
      criadoEm: FieldValue.serverTimestamp(),
      criadoPor: operador.uid,
      atualizadoEm: FieldValue.serverTimestamp(),
      atualizadoPor: operador.uid
    };
    await db.doc(`usuarios/${conta.uid}`).create(documento);
    await auditar('usuario_criado', { uid: conta.uid, nome: dados.nome, email: dados.email }, operador, { perfil: dados.perfil })
      .catch(erro => console.error('Falha ao registrar auditoria de criação', erro));
    return { uid: conta.uid };
  } catch (erro) {
    if (conta?.uid) await auth.deleteUser(conta.uid).catch(() => null);
    if (erro?.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Este e-mail já está cadastrado.');
    console.error('Falha ao criar usuário', erro);
    throw new HttpsError('internal', 'Não foi possível concluir o cadastro.');
  }
});

exports.atualizarUsuario = onCall({ region: REGIAO, enforceAppCheck: false }, async request => {
  const operador = await exigirAdmin(request);
  const uid = texto(request.data?.uid, 128);
  if (!uid || uid === operador.uid) throw new HttpsError('failed-precondition', 'Use Meu perfil para alterar seus próprios dados.');
  const perfil = texto(request.data?.perfil, 20).toLowerCase();
  const nome = texto(request.data?.nome, 120);
  const divisoesAtribuidas = perfil === 'conferente' ? divisoesValidas(request.data?.divisoesAtribuidas) : [];
  if (!PERFIS.has(perfil) || nome.length < 3) throw new HttpsError('invalid-argument', 'Dados do usuário inválidos.');
  if (perfil === 'conferente' && divisoesAtribuidas.length === 0) throw new HttpsError('invalid-argument', 'Atribua pelo menos uma divisão.');
  const ref = db.doc(`usuarios/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Usuário não encontrado.');
  await ref.update({ nome, perfil, divisoesAtribuidas, atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: operador.uid });
  await auth.updateUser(uid, { displayName: nome });
  await auditar('usuario_atualizado', { uid, nome, email: snap.data().email }, operador, { perfil })
    .catch(erro => console.error('Falha ao registrar auditoria de atualização', erro));
  return { uid };
});

exports.alterarEstadoUsuario = onCall({ region: REGIAO, enforceAppCheck: false }, async request => {
  const operador = await exigirAdmin(request);
  const uid = texto(request.data?.uid, 128);
  const ativo = request.data?.ativo;
  if (typeof ativo !== 'boolean' || !uid) throw new HttpsError('invalid-argument', 'Operação inválida.');
  if (uid === operador.uid) throw new HttpsError('failed-precondition', 'O Administrador não pode desativar a própria conta.');
  const ref = db.doc(`usuarios/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Usuário não encontrado.');
  const alvo = { uid, ...snap.data() };
  const alteracao = ativo
    ? { ativo: true, reativadoEm: FieldValue.serverTimestamp(), reativadoPor: operador.uid }
    : { ativo: false, desativadoEm: FieldValue.serverTimestamp(), desativadoPor: operador.uid };
  try {
    if (ativo) await auth.updateUser(uid, { disabled: false });
    await ref.update({ ...alteracao, atualizadoEm: FieldValue.serverTimestamp(), atualizadoPor: operador.uid });
    if (!ativo) {
      await auth.updateUser(uid, { disabled: true });
      await auth.revokeRefreshTokens(uid);
    }
    await auditar(ativo ? 'usuario_reativado' : 'usuario_desativado', alvo, operador)
      .catch(erro => console.error('Falha ao registrar auditoria de estado', erro));
    return { uid, ativo };
  } catch (erro) {
    if (!ativo) await ref.update({ ativo: true }).catch(() => null);
    console.error('Falha ao alterar estado do usuário', erro);
    throw new HttpsError('internal', 'Não foi possível alterar o acesso do usuário.');
  }
});
