// Fluxo homologado de cautela/devolução; identidade do responsável vem de usuarios.
'use strict';
const { criarOperacoes, hash } = require('./dsips-base.cjs');

function criarCautelas(deps) {
  const { db } = deps;
  const { executar, erro, texto, idValido } = criarOperacoes(deps).contexto;
  async function lerTodos(promessas) {
    // Não abandonar leituras em andamento quando outra linha reprova a validação.
    const resultados = await Promise.allSettled(promessas);
    const falha = resultados.find(item => item.status === 'rejected');
    if (falha) throw falha.reason;
    return resultados.map(item => item.value);
  }
  function normalizarItens(itens) {
    if (!Array.isArray(itens) || !itens.length || itens.length > 20) erro('invalid-argument', 'Inclua de 1 a 20 materiais por operação.');
    const normalizados = itens.map(item => {
      const materialId = idValido(item?.materialId, 'Material');
      const quantidade = item?.quantidade;
      if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 1000000) erro('invalid-argument', 'A quantidade deve ser um inteiro positivo.');
      if (!Array.isArray(item.unidadeIds ?? [])) erro('invalid-argument', 'Identificações inválidas.');
      return { materialId, quantidade, unidadeIds: (item.unidadeIds || []).map(id => idValido(id, 'Unidade')) };
    });
    if (new Set(normalizados.map(item => item.materialId)).size !== normalizados.length) erro('invalid-argument', 'Agrupe cada material em uma única linha.');
    const unidades = normalizados.flatMap(item => item.unidadeIds);
    if (unidades.length > 200 || new Set(unidades).size !== unidades.length) erro('invalid-argument', 'Selecione até 200 unidades, sem repetições.');
    return normalizados;
  }
  function conferirEstoque(estoque) {
    if (!estoque || !['total', 'disponivel', 'emCautela'].every(campo => Number.isSafeInteger(estoque[campo]) && estoque[campo] >= 0)
      || estoque.total !== estoque.disponivel + estoque.emCautela) erro('failed-precondition', 'O estoque possui uma inconsistência. Solicite a conferência antes de movimentar.');
  }
  function conferirIdentificacao(item, individualizado) {
    if ((individualizado && item.unidadeIds.length !== item.quantidade) || (!individualizado && item.unidadeIds.length)) erro('invalid-argument', 'Selecione uma identificação por unidade individualizada.');
  }
  async function registrarCautela(request) {
    const responsavelId = idValido(request.data?.responsavelId, 'Responsável');
    const observacoes = texto(request.data?.observacoes, 'Observações', 500, false);
    const itens = normalizarItens(request.data?.itens);
    return executar(request, 'cautela_registrada', { responsavelId, observacoes, itens }, async (tx, uid) => {
      const id = 'C-' + hash(uid + ':' + request.data.operacaoId).slice(0, 32);
      const ref = db.doc(`dsipsCautelas/${id}`);
      const responsavel = await tx.get(db.doc(`usuarios/${responsavelId}`));
      if (!responsavel.exists || responsavel.data().ativo === false) erro('failed-precondition', 'Selecione um responsável ativo.');
      const planos = await lerTodos(itens.map(async item => {
        const estoqueRef = db.doc(`dsipsEstoque/${item.materialId}`);
        const [material, estoque] = await lerTodos([tx.get(db.doc(`dsipsMateriais/${item.materialId}`)), tx.get(estoqueRef)]);
        if (!material.exists || material.data().ativo === false) erro('failed-precondition', 'Um dos materiais está indisponível.');
        if (!estoque.exists) erro('failed-precondition', 'Registre primeiro o saldo inicial do material.');
        const posicao = estoque.data(); conferirEstoque(posicao);
        if (posicao.materialId !== item.materialId) erro('failed-precondition', 'O vínculo do estoque está inconsistente.');
        if (posicao.disponivel < item.quantidade) erro('failed-precondition', 'Quantidade maior que o estoque disponível.');
        conferirIdentificacao(item, material.data().controle === 'individualizado');
        const local = await tx.get(db.doc(`dsipsLocais/${posicao.localId}`));
        if (!local.exists || local.data().ativo === false) erro('failed-precondition', 'O local de estoque está inativo.');
        const unidades = await lerTodos(item.unidadeIds.map(async unidadeId => {
          const ref = db.doc(`dsipsUnidades/${unidadeId}`); const snap = await tx.get(ref);
          if (!snap.exists || snap.data().materialId !== item.materialId || snap.data().localId !== posicao.localId
            || snap.data().situacao !== 'disponivel' || snap.data().cautelaId) erro('failed-precondition', 'Uma unidade selecionada não está disponível para este material.');
          return { ref, id: unidadeId, identificacao: snap.data().identificacao };
        }));
        return { estoqueRef, posicao, unidades, item: {
          materialId: item.materialId, nome: material.data().nome, controle: material.data().controle,
          unidade: material.data().unidade, localId: posicao.localId, localNome: local.data().nome,
          quantidade: item.quantidade, devolvida: 0, unidades: unidades.map(({ id, identificacao }) => ({ id, identificacao })), unidadesDevolvidas: []
        } };
      }));
      const responsavelNome = responsavel.data().nome;
      return {
        resultado: { id }, eventoDados: { cautelaId: id, responsavelId, responsavelNome, observacoes, itens: planos.map(plano => plano.item) },
        gravar(tx, agora, operadorUid) {
          tx.create(ref, { responsavelId, responsavelNome, responsavelUid: responsavelId, responsavelOrigem: 'usuarios', responsavelMatricula: responsavel.data().matricula || '',
            observacoes, itens: planos.map(plano => plano.item), status: 'aberta', criadoEm: agora, criadoPor: operadorUid, atualizadoEm: agora });
          for (const plano of planos) {
            tx.update(plano.estoqueRef, { disponivel: plano.posicao.disponivel - plano.item.quantidade, emCautela: plano.posicao.emCautela + plano.item.quantidade });
            for (const unidade of plano.unidades) tx.update(unidade.ref, { situacao: 'em_cautela', cautelaId: id, responsavelId, atualizadoEm: agora });
          }
        }
      };
    });
  }
  async function registrarDevolucao(request) {
    const cautelaId = idValido(request.data?.cautelaId, 'Cautela');
    const observacoes = texto(request.data?.observacoes, 'Observações', 500, false);
    const itens = normalizarItens(request.data?.itens);
    return executar(request, 'devolucao_registrada', { cautelaId, observacoes, itens }, async tx => {
      const ref = db.doc(`dsipsCautelas/${cautelaId}`); const snap = await tx.get(ref);
      if (!snap.exists) erro('not-found', 'Cautela não encontrada.');
      const cautela = snap.data();
      if (!['aberta', 'parcial'].includes(cautela.status)) erro('failed-precondition', 'Esta cautela já está encerrada.');
      const planos = await lerTodos(itens.map(async item => {
        const original = cautela.itens.find(linha => linha.materialId === item.materialId);
        if (!original || item.quantidade > original.quantidade - original.devolvida) erro('failed-precondition', 'A devolução supera o saldo pendente desta cautela.');
        conferirIdentificacao(item, original.controle === 'individualizado');
        if (item.unidadeIds.some(id => !original.unidades.some(unidade => unidade.id === id) || original.unidadesDevolvidas.includes(id))) erro('failed-precondition', 'A identificação não está pendente nesta cautela.');
        const estoqueRef = db.doc(`dsipsEstoque/${item.materialId}`); const estoque = await tx.get(estoqueRef);
        if (!estoque.exists) erro('failed-precondition', 'Estoque não encontrado para devolução.');
        const posicao = estoque.data(); conferirEstoque(posicao);
        if (posicao.localId !== original.localId || posicao.materialId !== item.materialId || posicao.emCautela < item.quantidade) erro('failed-precondition', 'O estoque não corresponde ao saldo desta cautela.');
        const unidades = await lerTodos(item.unidadeIds.map(async id => {
          const ref = db.doc(`dsipsUnidades/${id}`); const unidade = await tx.get(ref);
          if (!unidade.exists || unidade.data().cautelaId !== cautelaId || unidade.data().materialId !== item.materialId
            || unidade.data().situacao !== 'em_cautela' || unidade.data().localId !== original.localId) erro('failed-precondition', 'A unidade não está em cautela neste registro.');
          return ref;
        }));
        return { item, original, posicao, estoqueRef, unidades };
      }));
      const novosItens = cautela.itens.map(item => {
        const plano = planos.find(plano => plano.item.materialId === item.materialId);
        return plano ? { ...item, devolvida: item.devolvida + plano.item.quantidade, unidadesDevolvidas: [...item.unidadesDevolvidas, ...plano.item.unidadeIds] } : item;
      });
      const encerrada = novosItens.every(item => item.devolvida === item.quantidade);
      const resumo = planos.map(plano => ({ nome: plano.original.nome, materialId: plano.item.materialId, quantidade: plano.item.quantidade, unidade: plano.original.unidade,
        unidades: plano.original.unidades.filter(unidade => plano.item.unidadeIds.includes(unidade.id)) }));
      return {
        resultado: { id: cautelaId, status: encerrada ? 'encerrada' : 'parcial' },
        eventoDados: { cautelaId, responsavelId: cautela.responsavelId, responsavelNome: cautela.responsavelNome, observacoes, itens: resumo },
        gravar(tx, agora, operadorUid) {
          tx.update(ref, { itens: novosItens, status: encerrada ? 'encerrada' : 'parcial', atualizadoEm: agora, ...(encerrada ? { encerradoEm: agora } : {}) });
          tx.create(db.doc(`dsipsDevolucoes/${operadorUid}_${request.data.operacaoId}`), { cautelaId, responsavelId: cautela.responsavelId, itens: resumo, observacoes, registradoEm: agora, registradoPor: operadorUid });
          for (const plano of planos) {
            tx.update(plano.estoqueRef, { disponivel: plano.posicao.disponivel + plano.item.quantidade, emCautela: plano.posicao.emCautela - plano.item.quantidade });
            for (const ref of plano.unidades) tx.update(ref, { situacao: 'disponivel', cautelaId: null, responsavelId: null, atualizadoEm: agora });
          }
        }
      };
    });
  }
  return { registrarCautela, registrarDevolucao };
}
module.exports = { criarCautelas };
