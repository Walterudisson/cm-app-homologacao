"use strict";
const {pathToFileURL}=require('node:url');const path=require('node:path');
module.exports=function({onSchedule,db,auth,FieldValue,HttpsError,regiao='southamerica-east1'}){
 const api=require('./servico.cjs').criarServicoAcessos({db,FieldValue,HttpsError,politicaUrl:pathToFileURL(path.join(__dirname,'politica/politica.mjs')).href});
 const contas=require('./contas.cjs').criarContasV2({db,auth,FieldValue,HttpsError,contexto:api.contexto});
 return{cmappSincronizarContas:onSchedule({schedule:'every 5 minutes',region:regiao,timeZone:'America/Sao_Paulo',timeoutSeconds:60,maxInstances:1,concurrency:1,retryCount:0},()=>contas.processarPendencias())};
};
