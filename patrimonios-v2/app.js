import {iniciarAreaOperacionalV2} from '../js/platform/area-operacional-v2.js';
import * as api from '../js/services/operacoes-v2.service.js';
import {criarPatrimoniosV2,temConsultaPatrimonial} from './controller.js';
iniciarAreaOperacionalV2({rotulo:'Patrimônios',montar:deps=>criarPatrimoniosV2({...deps,api}),temAcesso:temConsultaPatrimonial});
