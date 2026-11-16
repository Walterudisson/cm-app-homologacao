'use strict';
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { criarServicoAcessos } = require('./servico.cjs');
module.exports = function registrarAcessosV2({ onCall, db, auth, FieldValue, HttpsError, regiao='southamerica-east1' }) {
  const api=criarServicoAcessos({db,FieldValue,HttpsError,politicaUrl:pathToFileURL(path.join(__dirname,'politica/politica.mjs')).href});
  const contas=require('./contas.cjs').criarContasV2({db,auth,FieldValue,HttpsError,contexto:api.contexto});
  return Object.fromEntries(Object.entries({
    cmappMeusAcessos:api.consultarMeusAcessos,cmappConsultarAcessos:api.consultarAcessos,
    cmappListarUsuariosAcesso:api.listarUsuarios,cmappListarDivisoesAcesso:api.listarDivisoes,cmappConsultarAuditoriaAcesso:api.consultarAuditoria,
    cmappConcederAcesso:api.conceder,cmappRevogarAcesso:api.revogar,
    cmappDesignarDelegacao:api.designarDelegacao,cmappRemoverDelegacao:api.removerDelegacao,
    cmappCriarConta:contas.criar,cmappAtualizarConta:contas.atualizar,cmappAlterarEstadoConta:contas.alterarEstado,cmappPrepararRecuperacao:contas.recuperar
  }).map(([nome,handler])=>[nome,onCall({region:regiao,enforceAppCheck:false},handler)]));
};
