import {iniciarAreaOperacionalV2} from '../js/platform/area-operacional-v2.js';
import * as api from '../js/services/operacoes-v2.service.js';
import {criarPatrimoniosV2,temConsultaPatrimonial} from './controller.js';
import {criarControladorCamera} from '../js/controllers/camera.controller.js';
iniciarAreaOperacionalV2({rotulo:'Patrimônios',montar:deps=>{
 let camera;const ui=criarPatrimoniosV2({...deps,api,aoSairLeitura:()=>{if(camera)void camera.desligar({limparResultado:true});},aoSalvar:async()=>{ui.novaLeitura();await camera?.retomarAposSalvar();}});
 camera=criarControladorCamera({limparPlaqueta:v=>String(v||'').replace(/\D/g,''),obterContextoLeitura:()=>deps.obterSessao(),aoReconhecerPlaqueta:ui.reconhecer,aoPrepararNovaLeitura:ui.novaLeitura,podeManterCamera:()=>temConsultaPatrimonial(deps.obterSessao())&&ui.estaNaLeitura()});camera.inicializar();
 return{...ui,limpar(){ui.limpar();void camera.desligar({limparResultado:true});}};
},temAcesso:temConsultaPatrimonial});
