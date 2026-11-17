// Regras de negócio da versão HML 1.16.1; autorização substituída pelo adaptador v2.
'use strict';
const { createHash } = require('node:crypto');
const COLECOES = Object.freeze({ categoria: 'dsipsCategorias', local: 'dsipsLocais', material: 'dsipsMateriais' });
const hash = valor => createHash('sha256').update(valor).digest('hex');
const chave = valor => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
const serializar = valor => JSON.stringify(valor && typeof valor === 'object'
  ? Array.isArray(valor) ? valor.map(item => JSON.parse(serializar(item)))
    : Object.fromEntries(Object.keys(valor).sort().map(k => [k, JSON.parse(serializar(valor[k]))]))
  : valor);

function criarOperacoes({ db, FieldValue, HttpsError, autorizar }) {
  if(typeof autorizar !== "function") throw Error("Autorização transacional v2 obrigatória.");
  const erro = (codigo, mensagem) => { throw new HttpsError(codigo, mensagem); };
  function texto(valor, nome, maximo = 160, obrigatorio = true) {
    const result = typeof valor === 'string' ? valor.trim().normalize('NFC') : '';
    if ((obrigatorio && !result) || result.length > maximo) erro('invalid-argument', `${nome}: preencha um valor válido (até ${maximo} caracteres).`);
    return result;
  }
  function idValido(valor, nome = 'Identificador') {
    if (typeof valor !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(valor)) erro('invalid-argument', `${nome} inválido.`);
    return valor;
  }
  function normalizar(tipo, entrada) {
    const dados = { nome: texto(entrada?.nome, 'Nome', 120), ativo: entrada?.ativo !== false };
    if (entrada?.ativo !== undefined && typeof entrada.ativo !== 'boolean') erro('invalid-argument', 'Situação inválida.');
    if (tipo === 'material') {
      dados.categoriaId = idValido(entrada?.categoriaId, 'Categoria');
      if (!['quantidade', 'individualizado'].includes(entrada?.controle)) erro('invalid-argument', 'Selecione o tipo de controle.');
      if (!['un', 'par', 'caixa', 'kit'].includes(entrada?.unidade)) erro('invalid-argument', 'Unidade de medida inválida.');
      dados.controle = entrada.controle; dados.unidade = entrada.unidade;
      dados.icone = entrada?.icone || 'caixa'; dados.cor = entrada?.cor || 'azul';
      if (!['caixa','escudo','radio','chave','maleta','colete'].includes(dados.icone) || !['azul','verde','roxo','ambar'].includes(dados.cor)) erro('invalid-argument', 'Personalização do card inválida.');
      dados.observacoes = texto(entrada?.observacoes, 'Observações', 500, false);
    }
    return dados;
  }
  async function executar(request, acao, payload, preparar) {
    const uid = request.auth?.uid;
    if (!uid) erro('unauthenticated', 'Faça login novamente.');
    const operacaoId = idValido(request.data?.operacaoId, 'Operação');
    const fingerprint = hash(serializar({ acao, payload }));
    const operacaoRef = db.doc(`dsipsOperacoes/${uid}_${operacaoId}`);
    const usuarioRef = db.doc(`usuarios/${uid}`);
    return db.runTransaction(async tx => {
      const [usuarioSnap, anterior] = await Promise.all([tx.get(usuarioRef), tx.get(operacaoRef)]);
      const usuario = usuarioSnap.data();
      const autorizacao = await autorizar({tx,uid,acao,payload});
      if (anterior.exists) {
        if (anterior.data().fingerprint !== fingerprint) erro('already-exists', 'Esta operação já foi utilizada com outros dados.');
        return anterior.data().resultado;
      }
      // Preparar todas as leituras e validações antes de executar qualquer escrita.
      const plano = await preparar(tx, uid);
      const agora = FieldValue.serverTimestamp();
      plano.gravar(tx, agora, uid);
      tx.create(db.doc(`dsipsEventos/${uid}_${operacaoId}`), {
        tipo: acao, entidadeId: plano.resultado.id, operadorUid: uid,
        autorizacaoVersao: 2, autorizacaoRevisao: autorizacao.revisao || 0,
        operadorNome: usuario.nome || '', registradoEm: agora, dados: plano.eventoDados || payload,
        ...(plano.antes ? { antes: plano.antes } : {})
      });
      tx.create(operacaoRef, { fingerprint, resultado: plano.resultado, operadorUid: uid, registradoEm: agora });
      return plano.resultado;
    });
  }

  async function salvarCadastro(request) {
    const tipo = request.data?.tipo;
    if (!Object.hasOwn(COLECOES, tipo)) erro('invalid-argument', 'Tipo de cadastro inválido.');
    const id = idValido(request.data?.id);
    const dados = normalizar(tipo, request.data?.dados);
    return executar(request, 'cadastro_salvo', { tipo, id, ...dados }, async tx => {
      const ref = db.doc(`${COLECOES[tipo]}/${id}`);
      const atual = await tx.get(ref);
      const antes = atual.exists ? atual.data() : null;
      if (tipo === 'material') {
        const categoria = await tx.get(db.doc(`dsipsCategorias/${dados.categoriaId}`));
        if (!categoria.exists || categoria.data().ativo === false) erro('failed-precondition', 'Selecione uma categoria ativa.');
        if (antes?.saldoInicialRegistrado && (antes.controle !== dados.controle || antes.unidade !== dados.unidade)) {
          erro('failed-precondition', 'O tipo de controle e a unidade não podem mudar após o saldo inicial.');
        }
      }
      if (tipo === 'responsavel' && antes && antes.matricula !== dados.matricula) erro('failed-precondition', 'A matrícula não pode ser alterada.');
      const valorChave = tipo === 'responsavel' ? dados.matricula : dados.nome;
      const chaveRef = db.doc(`dsipsChaves/${hash(tipo + ':' + chave(valorChave))}`);
      const chaveAtual = await tx.get(chaveRef);
      if (chaveAtual.exists && chaveAtual.data().entidadeId !== id) erro('already-exists', tipo === 'responsavel' ? 'Matrícula já cadastrada.' : 'Já existe um cadastro com esse nome.');
      const antigaChave = antes ? hash(tipo + ':' + chave(tipo === 'responsavel' ? antes.matricula : antes.nome)) : null;
      return {
        resultado: { id }, antes,
        gravar(tx, agora, operadorUid) {
          if (antigaChave && antigaChave !== chaveRef.id) tx.delete(db.doc(`dsipsChaves/${antigaChave}`));
          tx.set(chaveRef, { entidadeId: id, tipo });
          tx.set(ref, {
            ...dados, atualizadoEm: agora, atualizadoPor: operadorUid,
            ...(!antes ? { criadoEm: agora, criadoPor: operadorUid, ...(tipo === 'material' ? { saldoInicialRegistrado: false } : {}) } : {})
          }, { merge: true });
        }
      };
    });
  }

  async function registrarSaldoInicial(request) {
    const materialId = idValido(request.data?.materialId, 'Material');
    const localId = idValido(request.data?.localId, 'Local');
    const quantidade = request.data?.quantidade;
    const motivo = texto(request.data?.motivo, 'Justificativa', 500);
    const recebidos = request.data?.identificadores ?? [];
    if (!Number.isSafeInteger(quantidade) || quantidade < 0 || quantidade > 1000000) erro('invalid-argument', 'Quantidade deve ser um inteiro entre zero e 1.000.000.');
    if (!Array.isArray(recebidos) || recebidos.length > 200) erro('invalid-argument', 'Informe até 200 identificadores por material individualizado.');
    const identificadores = recebidos.map(valor => texto(valor, 'Identificação', 100).toUpperCase());
    if (new Set(identificadores.map(chave)).size !== identificadores.length) erro('invalid-argument', 'Há identificadores repetidos no lançamento.');
    const payload = { materialId, localId, quantidade, motivo, identificadores };
    return executar(request, 'saldo_inicial_registrado', payload, async tx => {
      const materialRef = db.doc(`dsipsMateriais/${materialId}`);
      const estoqueRef = db.doc(`dsipsEstoque/${materialId}`);
      const [material, local, estoque] = await Promise.all([
        tx.get(materialRef), tx.get(db.doc(`dsipsLocais/${localId}`)), tx.get(estoqueRef)
      ]);
      if (!material.exists || material.data().ativo === false) erro('failed-precondition', 'Selecione um material ativo.');
      if (!local.exists || local.data().ativo === false) erro('failed-precondition', 'Selecione um local ativo.');
      if (material.data().saldoInicialRegistrado || estoque.exists) erro('already-exists', 'Este material já possui saldo inicial registrado.');
      const individualizado = material.data().controle === 'individualizado';
      if ((individualizado && identificadores.length !== quantidade) || (!individualizado && identificadores.length)) {
        erro('invalid-argument', 'No controle individualizado, informe uma identificação por unidade; no controle por quantidade, não informe identificações.');
      }
      const unidades = identificadores.map(identificacao => ({ identificacao, ref: db.doc(`dsipsUnidades/${hash(chave(identificacao))}`) }));
      const existentes = await Promise.all(unidades.map(unidade => tx.get(unidade.ref)));
      if (existentes.some(unidade => unidade.exists)) erro('already-exists', 'Uma das identificações já está cadastrada no DSIPS.');
      return {
        resultado: { id: materialId, quantidade },
        eventoDados: { ...payload, materialNome: material.data().nome, localNome: local.data().nome, unidade: material.data().unidade },
        gravar(tx, agora, operadorUid) {
          tx.create(estoqueRef, { materialId, localId, total: quantidade, disponivel: quantidade, emCautela: 0, registradoEm: agora, registradoPor: operadorUid });
          tx.update(materialRef, { saldoInicialRegistrado: true, atualizadoEm: agora, atualizadoPor: operadorUid });
          for (const unidade of unidades) tx.create(unidade.ref, {
            materialId, localId, identificacao: unidade.identificacao, situacao: 'disponivel', criadoEm: agora, criadoPor: operadorUid
          });
        }
      };
    });
  }
  return { salvarCadastro, registrarSaldoInicial, contexto: { executar, erro, texto, idValido } };
}

module.exports = { criarOperacoes, chave, hash };
