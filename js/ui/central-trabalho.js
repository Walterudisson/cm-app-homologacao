import {modulosDoUsuario} from '../platform/modules.js';
const conf = Object.freeze({
  patrimonios: {nome:'Patrimônio',descricao:'Inventário, conferência e movimentação de bens.',destino:'dashboard',path:'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10M7.5 5l9 4'},
  dsips: {nome:'DSIPS',descricao:'Materiais, cautelas, devoluções e estoque.',destino:'dsips-inicio',path:'M12 3l8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V6l8-3zm-4 9 3 3 5-6'}
});
export function destinosCentral(usuario) {
  if(!usuario || Object.hasOwn(usuario,'autorizacaoVersao')) return [];
  return modulosDoUsuario(usuario).filter(m=>Object.hasOwn(conf,m.id)).map(m=>({id:m.id,...conf[m.id]}));
}
export const podeAbrirCentral = usuario => destinosCentral(usuario).length>0;
export function renderizarCentral(container,usuario,navegar){
  if(!container)return;
  container.replaceChildren();
  const el=(tag,classe,texto)=>{const n=document.createElement(tag);if(classe)n.className=classe;if(texto!==undefined)n.textContent=texto;return n;};
  for(const m of destinosCentral(usuario)){
    const card=el('button','cm-ux-module-card');card.type='button';card.dataset.modulo=m.id;
    const body=el('span','cm-ux-module-body'), icon=el('span','cm-ux-module-icon');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',m.path);svg.append(path);icon.append(svg);
    body.append(icon,el('strong','cm-ux-module-title',m.nome),el('span','cm-ux-module-description',m.descricao));
    const action=el('span','cm-ux-module-action');action.append(el('span','','Acessar módulo'),el('span','','→'));
    card.append(body,action);card.addEventListener('click',()=>navegar(m.destino));container.append(card);
  }
}
