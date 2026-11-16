'use strict';
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { criarServicoAcessos } = require('./servico.cjs');
module.exports = function registrarAcessosV2({ onCall, db, auth, FieldValue, HttpsError, regiao='southamerica-east1' }) {
  const api=criarServicoAcessos({db,FieldValue,HttpsError,politicaUrl:pathToFileURL(path.join(__dirname,'politica/politica.mjs')).href});
  const contas=require('./contas.cjs').criarContasV2({db,auth,FieldValue,HttpsError,contexto:api.contexto});
  const negocio=require('../operacoes-v2/servico.cjs').criarOperacoesV2({db,FieldValue,HttpsError,contexto:api.contexto});
  const patrimonios=require('../operacoes-v2/patrimonios.cjs').criarPatrimoniosV2({db,FieldValue,HttpsError,contexto:api.contexto});
  const inventarios=require('../operacoes-v2/inventarios.cjs').criarInventariosV2({db,FieldValue,HttpsError,contexto:api.contexto});
  return Object.fromEntries(Object.entries({
    cmappMeusAcessos:api.consultarMeusAcessos,cmappConsultarAcessos:api.consultarAcessos,
    cmappListarUsuariosAcesso:api.listarUsuarios,cmappListarDivisoesAcesso:api.listarDivisoes,cmappConsultarAuditoriaAcesso:api.consultarAuditoria,
    cmappConcederAcesso:api.conceder,cmappRevogarAcesso:api.revogar,
    cmappDesignarDelegacao:api.designarDelegacao,cmappRemoverDelegacao:api.removerDelegacao,
    cmappDsipsSalvarCadastro:negocio.salvarCadastro,cmappDsipsRegistrarSaldoInicial:negocio.registrarSaldoInicial,
    cmappDsipsRegistrarCautela:negocio.registrarCautela,cmappDsipsRegistrarDevolucao:negocio.registrarDevolucao,
    cmappDsipsListar:negocio.listarDsips,cmappDsipsListarResponsaveis:negocio.listarResponsaveis,
    cmappDsipsListarEventos:negocio.listarEventos,cmappConsultarPatrimonio:negocio.consultarPatrimonio,
    cmappPatrimoniosResumo:patrimonios.resumir,cmappPatrimoniosCatalogo:patrimonios.catalogo,cmappPatrimoniosListar:patrimonios.listar,cmappPatrimoniosConferir:patrimonios.conferir,
    cmappPatrimoniosSugerirDestino:patrimonios.sugerir,cmappPatrimoniosResolverTransferencia:patrimonios.resolverTransferencia,
    cmappPatrimoniosResolverSugestao:patrimonios.resolverSugestao,
    cmappInventarioConsultar:inventarios.consultar,cmappInventarioComandar:inventarios.comandar,
    cmappInventarioConsolidar:inventarios.consolidar,cmappInventarioItens:inventarios.itens,
    cmappConsultarSincronizacaoConta:contas.consultarSincronizacao,cmappReconciliarConta:contas.reconciliar,cmappCriarConta:contas.criar,cmappAtualizarConta:contas.atualizar,cmappAlterarEstadoConta:contas.alterarEstado,cmappPrepararRecuperacao:contas.recuperar
  }).map(([nome,handler])=>[nome,onCall({region:regiao,enforceAppCheck:false},handler)]));
};
