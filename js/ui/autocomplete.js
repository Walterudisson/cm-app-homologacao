// Componente reutilizável; seleção explícita por ID. Sem dependências externas.
const normalizar=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function buscarOpcoesAutocomplete(itens,termo,pesquisa=x=>[x.nome],limite=8,minimo=2){
 const t=normalizar(termo);if(t.length<minimo)return [];
 const partes=t.split(/\s+/);return itens.filter(x=>x?.id&&partes.every(p=>normalizar(pesquisa(x).join(' ')).includes(p))).slice(0,limite);
}
export function criarAutocomplete({raiz,campo,valor,rotulo=x=>x.nome,detalhe=()=>'',pesquisa=x=>[x.nome],aoAlterar=()=>{},limite=8,minimo=2,mensagemSelecionado='Opção selecionada.'}){
 const lista=raiz.querySelector('[role=listbox]'),limpar=raiz.querySelector('.cm-combo-clear'),status=raiz.querySelector('.cm-combo-status');
 let itens=[],opcoes=[],indice=-1,desabilitado=false;
 function fechar(){opcoes=[];indice=-1;lista.replaceChildren();lista.hidden=true;campo.setAttribute('aria-expanded','false');campo.removeAttribute('aria-activedescendant');}
 function validade(){const valido=itens.some(x=>x.id===valor.value);campo.setCustomValidity(valido?'':'Selecione uma opção da lista.');limpar.hidden=!campo.value&&!valor.value;status.textContent=valido?mensagemSelecionado:minimo>0?'Digite pelo menos '+minimo+' caracteres e selecione uma opção.':'Pesquise ou selecione uma opção da lista.';return valido;}
 function escolher(x){if(desabilitado||!itens.some(y=>y.id===x.id))return;valor.value=x.id;campo.value=rotulo(x)+(detalhe(x)?' · '+detalhe(x):'');fechar();validade();aoAlterar(x.id);}
 function destacar(i){indice=i;const nodes=[...lista.children];nodes.forEach((n,j)=>{n.setAttribute('aria-selected',String(j===i));});if(i>=0&&nodes[i]){campo.setAttribute('aria-activedescendant',nodes[i].id);nodes[i].scrollIntoView({block:'nearest'});}else campo.removeAttribute('aria-activedescendant');}
 function sugerir(){fechar();if(desabilitado||valor.value)return;const termo=campo.value;if(normalizar(termo).length<minimo){validade();return;}opcoes=buscarOpcoesAutocomplete(itens,termo,pesquisa,limite,minimo);if(!opcoes.length){status.textContent='Nenhum resultado encontrado.';return;}opcoes.forEach((x,i)=>{const n=document.createElement('button');n.type='button';n.tabIndex=-1;n.id=lista.id+'-'+i;n.setAttribute('role','option');n.setAttribute('aria-selected','false');const titulo=document.createElement('strong');titulo.textContent=rotulo(x);n.append(titulo);if(detalhe(x)){const d=document.createElement('small');d.textContent=detalhe(x);n.append(d);}n.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')e.preventDefault();});n.addEventListener('click',()=>{escolher(x);campo.focus({preventScroll:true});});lista.append(n);});lista.hidden=false;campo.setAttribute('aria-expanded','true');status.textContent=opcoes.length+' sugestão(ões). Selecione uma opção.';}
 function reset(){valor.value='';campo.value='';fechar();validade();}
 function sincronizar(){const x=itens.find(x=>x.id===valor.value);if(!x){reset();return;}campo.value=rotulo(x)+(detalhe(x)?' · '+detalhe(x):'');fechar();validade();}
 function setItems(novos){itens=Array.isArray(novos)?novos:[];sincronizar();}
 campo.addEventListener('input',()=>{valor.value='';validade();aoAlterar('');sugerir();});
 campo.addEventListener('focus',()=>{if(!valor.value)sugerir();});
 campo.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab'){fechar();return;}if(e.key==='Enter'){e.preventDefault();if(indice>=0&&opcoes[indice])escolher(opcoes[indice]);return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(lista.hidden)sugerir();if(opcoes.length)destacar(e.key==='ArrowDown'?Math.min(indice+1,opcoes.length-1):Math.max(indice-1,0));}});
 limpar.addEventListener('click',()=>{if(!desabilitado){reset();aoAlterar('');campo.focus();}});
 raiz.addEventListener('focusout',e=>{if(e.relatedTarget&&!raiz.contains(e.relatedTarget))fechar();});
 document.addEventListener('pointerdown',e=>{if(!raiz.contains(e.target))fechar();});
 function setDisabled(v){desabilitado=Boolean(v);campo.disabled=desabilitado;limpar.disabled=desabilitado;if(desabilitado)fechar();}
 reset();return {setItems,reset,setDisabled,fechar,sincronizar};
}

// Adaptador para selects obrigatórios existentes: mantém o nome e o ID enviados ao modelo.
export function adaptarSelectAutocomplete(select,{id,rotulo,placeholder='Pesquisar...',minimo=0}){
 const label=select.parentElement;
 const raiz=document.createElement('div');raiz.className='cm-combobox cm-combo-select';
 const titulo=document.createElement('label');titulo.htmlFor=id;titulo.textContent=rotulo;
 const linha=document.createElement('div');linha.className='cm-combo-field';
 const campo=document.createElement('input');campo.id=id;campo.type='text';campo.required=select.required;campo.autocomplete='off';campo.placeholder=placeholder;
 campo.setAttribute('role','combobox');campo.setAttribute('aria-autocomplete','list');campo.setAttribute('aria-expanded','false');campo.setAttribute('aria-controls',id+'-opcoes');
 const clear=document.createElement('button');clear.type='button';clear.className='cm-combo-clear';clear.textContent='×';clear.setAttribute('aria-label','Limpar '+rotulo);
 const lista=document.createElement('div');lista.id=id+'-opcoes';lista.className='cm-combo-options';lista.setAttribute('role','listbox');lista.setAttribute('aria-label',rotulo);lista.hidden=true;
 const status=document.createElement('small');status.className='cm-combo-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 campo.setAttribute('aria-describedby',id+'-status');status.id=id+'-status';
 // O select permanece como fonte do valor do formulário, mas a validação visível fica no campo pesquisável.
 const anterior=select.value;select.required=false;select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.classList.add('cm-combo-native');
 label.replaceWith(raiz);linha.append(campo,clear);raiz.append(titulo,linha,lista,status,select);select.value=anterior;
 const combo=criarAutocomplete({raiz,campo,valor:select,minimo,aoAlterar:()=>select.dispatchEvent(new Event('change',{bubbles:true}))});
 select.value=anterior;
 function sincronizar(){combo.setItems([...select.options].filter(o=>o.value&&!o.disabled).map(o=>({id:o.value,nome:o.textContent})));combo.setDisabled(select.disabled);}
 sincronizar();
 return {sincronizar,reset:combo.reset,setDisabled:combo.setDisabled,focar:()=>campo.focus({preventScroll:true})};
}
