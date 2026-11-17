'use strict';
// Proteção de transição. Ainda depende do bloqueio e drenagem dos endpoints antigos na migração.
const ALVOS = new Set(['atualizarUsuario','alterarEstadoUsuario','definirModulosUsuario']);
module.exports = function protegerLegado({ onCall, db, HttpsError, regiao, exportsAtuais }) {
  const nomes=['criarUsuario','atualizarUsuario','alterarEstadoUsuario','definirModulosUsuario','dsipsSalvarCadastro','dsipsRegistrarSaldoInicial','dsipsRegistrarCautela','dsipsRegistrarDevolucao','dsipsListarResponsaveis'];
  const resposta={};
  for(const nome of nomes){
    const original=exportsAtuais[nome];if(!original)continue;
    if(typeof original.run!=='function')throw Error('Endpoint legado incompatível: '+nome);
    resposta[nome]=onCall({region:regiao,enforceAppCheck:false},async request=>{
      if(!request.auth?.uid)throw new HttpsError('unauthenticated','Faça login novamente.');
      const uid=request.auth.uid;if(typeof uid!=='string'||uid.includes('/'))throw new HttpsError('invalid-argument','Usuário inválido.');
      const config=await db.doc('cmappConfiguracao/acessos').get();
      if(config.data()?.legadoBloqueado===true)throw new HttpsError('failed-precondition','Gestão em manutenção para migração.');
      const conta=await db.doc('usuarios/'+uid).get();
      if(!conta.exists||conta.data().ativo===false)throw new HttpsError('permission-denied','Conta indisponível.');
      if(Object.hasOwn(conta.data(),'autorizacaoVersao'))throw new HttpsError('permission-denied','Use o fluxo de acesso versionado.');
      if(ALVOS.has(nome)){
        const alvo=request.data?.uid;if(typeof alvo!=='string'||!alvo||alvo.length>128||alvo.includes('/'))throw new HttpsError('invalid-argument','Alvo inválido.');
        const snap=await db.doc('usuarios/'+alvo).get();
        if(snap.exists&&Object.hasOwn(snap.data(),'autorizacaoVersao'))throw new HttpsError('permission-denied','Conta versionada não pode ser alterada pelo fluxo legado.');
      }
      return original.run(request);
    });
  }
  return resposta;
};
