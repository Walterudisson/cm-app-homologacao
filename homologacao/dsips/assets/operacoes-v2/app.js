import {iniciarAreaOperacionalV2} from '../js/platform/area-operacional-v2.js';
import * as api from '../js/services/operacoes-v2.service.js';
import {criarOperacoesDsipsV2} from './controller.js';
iniciarAreaOperacionalV2({rotulo:'DSIPS',montar:deps=>criarOperacoesDsipsV2({...deps,api}),temAcesso:(_,ui)=>ui.pode('consultar')});

import {auth as authPiloto} from '../js/config/firebase.js';
import {conectarLoginPiloto} from '../gestao-v2/login-piloto.js';
import {onAuthStateChanged as observarPiloto,signInWithEmailAndPassword as entrarPiloto} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
const loginPilotoDsips=conectarLoginPiloto({auth:authPiloto,entrar:entrarPiloto,document});
observarPiloto(authPiloto,usuario=>usuario?loginPilotoDsips.ocultar():loginPilotoDsips.mostrar());
