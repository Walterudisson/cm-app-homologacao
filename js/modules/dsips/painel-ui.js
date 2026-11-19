import {listarCadastroDsips} from './service.js?v=1.13.19-h.1';
import {podeConsultarMateriaisDsips} from './consulta-materiais-model.js';
import {resumirPainelDsips,acoesPainelDsips} from './painel-model.js?v=1.13.22-h.1';
const paths={box:'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10',warehouse:'M3 21V8l9-5 9 5v13M7 21V11h10v10M7 15h10M7 18h10',clipboard:'M8 4H5v17h14V4h-3M8 3h8v4H8zM8 12h8M8 16h5',users:'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m10-15a4 4 0 1 1-8 0 4 4 0 0 1 8 0M18 15a4 4 0 0 1 3 4v2',folder:'M3 6h7l2 2h9v12H3z',history:'M3 12a9 9 0 1 1 3 7M3 4v8h8m1-5v5l3 2'};
export function criarPainelDsips({obterUsuario,navegar}){
 const k=document.getElementById('dsips-painel-kpis'),a=document.getElementById('dsips-painel-acoes'),s=document.getElementById('dsips-painel-status'),r=document.getElementById('dsips-painel-refresh');let rev=0;
 const el=(tag,cls,t)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(t!==undefined)n.textContent=t;return n;};
 function icon(key){const n=el('span','cm-panel-icon'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),p=document.createElementNS('http://www.w3.org/2000/svg','path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');p.setAttribute('d',paths[key]);svg.append(p);n.append(svg);return n;}
 function botao(dest,cls){const b=el('button',cls);b.type='button';b.addEventListener('click',()=>{if(acoesPainelDsips(obterUsuario()).some(x=>x[0]===dest))navegar(dest);});return b;}
 function render(d={}){k.replaceChildren();a.replaceChildren();if(!podeConsultarMateriaisDsips(obterUsuario()))return;
 for(const [key,title,dest,ico] of [['materiais','Materiais ativos','dsips-materiais','box'],['disponiveis','Tipos disponíveis','dsips-estoque','warehouse'],['cautelas','Cautelas em aberto','dsips-cautelas','clipboard'],['responsaveis','Responsáveis com materiais','dsips-posse','users']]){const b=botao(dest,'cm-panel-kpi'),v=el('span');v.append(el('strong','',d[key]===undefined?'—':String(d[key])),el('small','',title));b.append(icon(ico),v);k.append(b);}
 for(const [dest,title,desc,ico] of acoesPainelDsips(obterUsuario())){const b=botao(dest,'cm-panel-action');if(dest==='dsips-cautelas')b.dataset.primary='true';b.append(icon(ico),el('strong','',title),el('small','',desc));a.append(b);}
 }
 function limpar(){rev++;k.replaceChildren();a.replaceChildren();s.textContent='';r.disabled=false;}
 async function carregar(){limpar();if(!podeConsultarMateriaisDsips(obterUsuario()))return;const token=rev,uid=obterUsuario()?.uid;const atual=()=>token===rev&&uid===obterUsuario()?.uid&&podeConsultarMateriaisDsips(obterUsuario());render();r.disabled=true;s.textContent='Consultando dados…';try{const [m,e,c]=await Promise.all(['materiais','estoque','cautelas'].map(listarCadastroDsips));if(!atual())return;render(resumirPainelDsips(m,e,c));s.textContent='Indicadores atualizados em '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}catch(err){if(atual())s.textContent='Não foi possível consultar os indicadores. Tente atualizar.';}finally{if(atual())r.disabled=false;}}
 r.addEventListener('click',()=>void carregar());return {carregar,limpar};
}