import {visualMaterialDsips,ICONES_CARDS_DSIPS,filtrarMateriaisDsips} from './consulta-materiais-model.js';
import {saldoDisponivelDsips} from './registro-cautelas-model.js';
export function filtrarMateriaisPdv(materiais,estoque,cesta,busca=''){
 return filtrarMateriaisDsips(materiais,busca).filter(m=>m.ativo!==false&&!cesta.some(i=>i.materialId===m.id)).map(m=>({...m,saldo:saldoDisponivelDsips(m.id,estoque),visual:visualMaterialDsips(m)})).filter(m=>m.saldo>0);
}
export function criarIconePdv(icone){
 const wrapper=document.createElement('span');wrapper.className='cm-pdv-icon';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 for(const d of ICONES_CARDS_DSIPS[icone]||ICONES_CARDS_DSIPS.caixa){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.append(path);}wrapper.append(svg);return wrapper;
}