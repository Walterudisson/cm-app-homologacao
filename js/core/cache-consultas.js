// Cache volátil, isolado por identidade e geração. Não persiste dados no navegador.
export function criarCacheConsultas({identidade,agora=()=>Date.now(),maximo=24}){
 let escopo=null,geracao=0;const entradas=new Map();
 function limpar(){geracao++;entradas.clear();}
 function sincronizar(){const uid=identidade()||null;if(uid!==escopo){limpar();escopo=uid;}return uid;}
 function consultar(chave,carregar,ttl=0){
  const uid=sincronizar();if(!uid)return Promise.reject(new Error('Sessão não autenticada.'));
  const existente=entradas.get(chave);
  if(existente&&(existente.pendente||existente.expira>agora()))return existente.promessa;
  entradas.delete(chave);
  const token=geracao,entrada={pendente:true,expira:0,promessa:null};
  entrada.promessa=Promise.resolve().then(carregar).then(valor=>{
    if(sincronizar()!==uid||geracao!==token)throw new Error('Consulta invalidada; atualize os dados.');
    entrada.pendente=false;entrada.expira=agora()+Math.max(0,ttl);
    if(!ttl&&entradas.get(chave)===entrada)entradas.delete(chave);
    return valor;
  }).catch(erro=>{if(entradas.get(chave)===entrada)entradas.delete(chave);throw erro;});
  // Limite de memória. Nunca remover consultas em andamento para liberar espaço.
  if(entradas.size>=maximo){for(const [k,e] of entradas){if(!e.pendente){entradas.delete(k);break;}}}
  if(entradas.size<maximo)entradas.set(chave,entrada);
  return entrada.promessa;
 }
 return {consultar,limpar};
}
