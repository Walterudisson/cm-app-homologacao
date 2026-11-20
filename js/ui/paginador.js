// Paginação de apresentação: filtrar/ordenar a coleção completa antes de recortar.
export function recortarPagina(itens=[],pagina=1,tamanho=20){
 const n=Number.isSafeInteger(tamanho)&&tamanho>0?tamanho:20;
 const total=itens.length, paginas=Math.max(1,Math.ceil(total/n));
 const atual=Math.min(paginas,Math.max(1,Number.isSafeInteger(pagina)?pagina:1));
 const inicio=(atual-1)*n;
 return {itens:itens.slice(inicio,inicio+n),pagina:atual,paginas,total,inicio:total?inicio+1:0,fim:Math.min(inicio+n,total)};
}
export function criarPaginadorLocal({lista,tamanho=20,renderizar,podeNavegar=()=>true,rotulo='Paginação'}){
 let pagina=1,chave=null,dados=null;
 const nav=document.createElement('nav');nav.className='cm-list-pagination';nav.hidden=true;nav.setAttribute('aria-label',rotulo);
 const anterior=document.createElement('button'),proximo=document.createElement('button'),info=document.createElement('span');
 anterior.type=proximo.type='button';anterior.className=proximo.className='app-button app-button-secondary';
 anterior.textContent='Anterior';proximo.textContent='Próxima';info.className='cm-list-page-info';info.setAttribute('aria-live','polite');
 nav.append(anterior,info,proximo);lista.after(nav);
 function recortar(itens,novaChave=''){
  if(chave!==novaChave){pagina=1;chave=novaChave;}
  dados=recortarPagina(itens,pagina,tamanho);pagina=dados.pagina;
  nav.hidden=dados.paginas<=1;anterior.disabled=pagina<=1;proximo.disabled=pagina>=dados.paginas;
  info.textContent=dados.inicio+'–'+dados.fim+' de '+dados.total+' · '+pagina+'/'+dados.paginas;
  return dados.itens;
 }
 function mover(delta){if(!dados||nav.hidden||!podeNavegar())return;const alvo=pagina+delta;if(alvo<1||alvo>dados.paginas)return;pagina=alvo;renderizar();lista.scrollIntoView({block:'nearest',behavior:'smooth'});}
 anterior.addEventListener('click',()=>mover(-1));proximo.addEventListener('click',()=>mover(1));
 function ocultar(){nav.hidden=true;dados=null;}
 function reset(){pagina=1;chave=null;ocultar();}
 return {recortar,ocultar,reset};
}
