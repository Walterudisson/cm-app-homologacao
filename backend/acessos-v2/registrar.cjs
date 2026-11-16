'use strict';
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { criarServicoAcessos } = require('./servico.cjs');
module.exports = function registrarAcessosV2({ onCall, db, FieldValue, HttpsError, regiao='southamerica-east1' }) {
  const api=criarServicoAcessos({db,FieldValue,HttpsError,politicaUrl:pathToFileURL(path.join(__dirname,'politica/politica.mjs')).href});
  return Object.fromEntries(Object.entries({
    cmappMeusAcessos:api.consultarMeusAcessos,cmappConsultarAcessos:api.consultarAcessos,
    cmappListarUsuariosAcesso:api.listarUsuarios,cmappConsultarAuditoriaAcesso:api.consultarAuditoria,
    cmappConcederAcesso:api.conceder,cmappRevogarAcesso:api.revogar,
    cmappDesignarDelegacao:api.designarDelegacao,cmappRemoverDelegacao:api.removerDelegacao
  }).map(([nome,handler])=>[nome,onCall({region:regiao,enforceAppCheck:false},handler)]));
};
