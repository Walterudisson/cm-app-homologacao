// Exclusivo para contas explicitamente v2. Não tenta endpoints legados em caso de erro.
import {httpsCallable} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
import {functions} from '../config/firebase.js';
const chamar=(nome,dados={})=>httpsCallable(functions,nome)(dados).then(r=>r.data);
export const salvarCadastroDsipsV2=dados=>chamar('cmappDsipsSalvarCadastro',dados);
export const registrarSaldoInicialDsipsV2=dados=>chamar('cmappDsipsRegistrarSaldoInicial',dados);
export const registrarCautelaDsipsV2=dados=>chamar('cmappDsipsRegistrarCautela',dados);
export const registrarDevolucaoDsipsV2=dados=>chamar('cmappDsipsRegistrarDevolucao',dados);
export const listarDsipsV2=pagina=>chamar('cmappDsipsListar',pagina);
export const listarResponsaveisDsipsV2=(pagina={})=>chamar('cmappDsipsListarResponsaveis',pagina);
export const listarEventosDsipsV2=(pagina={})=>chamar('cmappDsipsListarEventos',pagina);
export const consultarPatrimonioV2=id=>chamar('cmappConsultarPatrimonio',{id});
