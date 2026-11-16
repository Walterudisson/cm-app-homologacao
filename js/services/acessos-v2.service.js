// Serviços para as telas v2. Ainda não importados no aplicativo publicado.
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import { functions } from '../config/firebase.js';
const chamar=(nome,dados={})=>httpsCallable(functions,nome)(dados).then(r=>r.data);
export const consultarMeusAcessosV2=()=>chamar('cmappMeusAcessos');
export const consultarAcessosV2=uid=>chamar('cmappConsultarAcessos',{uid});
export const listarUsuariosAcessoV2=(pagina={})=>chamar('cmappListarUsuariosAcesso',pagina);
export const consultarAuditoriaAcessoV2=uid=>chamar('cmappConsultarAuditoriaAcesso',uid?{uid}:{});
export const concederAcessoV2=dados=>chamar('cmappConcederAcesso',dados);
export const revogarAcessoV2=dados=>chamar('cmappRevogarAcesso',dados);
export const designarDelegacaoV2=dados=>chamar('cmappDesignarDelegacao',dados);
export const removerDelegacaoV2=dados=>chamar('cmappRemoverDelegacao',dados);

export const criarContaV2=dados=>chamar('cmappCriarConta',dados);
export const atualizarContaV2=dados=>chamar('cmappAtualizarConta',dados);
export const alterarEstadoContaV2=dados=>chamar('cmappAlterarEstadoConta',dados);
export const prepararRecuperacaoV2=uid=>chamar('cmappPrepararRecuperacao',{uid});

export const listarDivisoesAcessoV2=()=>chamar('cmappListarDivisoesAcesso');
