import {iniciarAreaOperacionalV2} from '../js/platform/area-operacional-v2.js';
import * as api from '../js/services/operacoes-v2.service.js';
import {criarOperacoesDsipsV2} from './controller.js';
iniciarAreaOperacionalV2({rotulo:'DSIPS',montar:deps=>criarOperacoesDsipsV2({...deps,api}),temAcesso:(_,ui)=>ui.pode('consultar')});
