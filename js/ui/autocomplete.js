// Componente reutilizável; seleção explícita por ID. Sem dependências externas.
const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function buscarOpcoesAutocomplete(itens,termo,pesquisa=x=>[x.nome],limite=8,minimo=2){
 const t=normalizar(termo);if(t.length<minimo)return [];
 const partes=t.split(/\s+/);return itens.filter(x=>x?.id&&partes.every(p=>normalizar(pesquisa(x).join(' ')).includes(p))).slice(0,limite);
}
export function criarAutocomplete({raiz,campo,valor,rotulo=x=>x.nome,detalhe=()=>'',pesquisa=x=>[x.nome],aoAlterar=()=>{},limite=8,minimo=2}){
 const lista=raiz.querySelector('[role=listbox]'),limpar=raiz.querySelector('.cm-combo-clear'),status=raiz.querySelector('.cm-combo-status');
 let itens=[],opcoes=[],indice=-1,desabilitado=false;
 function fechar(){opcoes=[];indice=-1;lista.replaceChildren();lista.hidden=true;campo.setAttribute('aria-expanded','false');campo.removeAttribute('aria-activedescendant');}
 function validade(){const valido=itens.some(x=>x.id===valor.value);campo.setCustomValidity(valido?'':'Selecione uma opção da lista.');limpar.hidden=!campo.value&&!valor.value;status.textContent=valido?'Responsável selecionado.':'Digite pelo menos '+minimo+' caracteres e selecione uma opção.';return valido;}
 function escolher(x){if(desabilitado||!itens.some(y=>y.id===x.id))return;valor.value=x.id;campo.value=rotulo(x)+(detalhe(x)?' · '+detalhe(x):'');fechar();validade();aoAlterar(x.id);}
 function destacar(i){indice=i;const nodes=[...lista.children];nodes.forEach((n,j)=>{n.setAttribute('aria-selected',String(j===i));});if(i>=0&&nodes[i]){campo.setAttribute('aria-activedescendant',nodes[i].id);nodes[i].scrollIntoView({block:'nearest'});}else campo.removeAttribute('aria-activedescendant');}
 function sugerir(){fechar();if(desabilitado||valor.value)return;const termo=campo.value;if(normalizar(termo).length<minimo){validade();return;}opcoes=buscarOpcoesAutocomplete(itens,termo,pesquisa,limite,minimo);if(!opcoes.length){status.textContent='Nenhum resultado encontrado.';return;}opcoes.forEach((x,i)=>{const n=document.createElement('button');n.type='button';n.tabIndex=-1;n.id=lista.id+'-'+i;n.setAttribute('role','option');n.setAttribute('aria-selected','false');const titulo=document.createElement('strong');titulo.textContent=rotulo(x);n.append(titulo);if(detalhe(x)){const d=document.createElement('small');d.textContent=detalhe(x);n.append(d);}n.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')e.preventDefault();});n.addEventListener('click',()=>{escolher(x);campo.focus({preventScroll:true});});lista.append(n);});lista.hidden=false;campo.setAttribute('aria-expanded','true');status.textContent=opcoes.length+' sugestão(ões). Selecione uma opção.';}
 function reset(){valor.value='';campo.value='';fechar();validade();}
 function setItems(novos){itens=Array.isArray(novos)?novos:[];if(valor.value&&!itens.some(x=>x.id===valor.value))reset();else{fechar();validade();}}
 campo.addEventListener('input',()=>{valor.value='';validade();aoAlterar('');sugerir();});
 campo.addEventListener('focus',()=>{if(!valor.value)sugerir();});
 campo.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab'){fechar();return;}if(e.key==='Enter'){e.preventDefault();if(indice>=0&&opcoes[indice])escolher(opcoes[indice]);return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(lista.hidden)sugerir();if(opcoes.length)destacar(e.key==='ArrowDown'?Math.min(indice+1,opcoes.length-1):Math.max(indice-1,0));}});
 limpar.addEventListener('click',()=>{if(!desabilitado){reset();aoAlterar('');campo.focus();}});
 raiz.addEventListener('focusout',e=>{if(e.relatedTarget&&!raiz.contains(e.relatedTarget))fechar();});
 document.addEventListener('pointerdown',e=>{if(!raiz.contains(e.target))fechar();});
 function setDisabled(v){desabilitado=Boolean(v);campo.disabled=desabilitado;limpar.disabled=desabilitado;if(desabilitado)fechar();}
 reset();return {setItems,reset,setDisabled,fechar};
}
