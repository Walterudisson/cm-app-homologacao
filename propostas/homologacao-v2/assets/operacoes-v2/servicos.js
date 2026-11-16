// Adaptador sem SDK: permite testar paginação e cancelamento com os contratos das callables.
export function criarServicosDsipsV2({api,obterUid,maxPaginas=100}) {
  let geracao=0, eventos=[], cursorEventos=null, historicoIniciado=false;
  const validar=(epoca,uid)=>{if(epoca!==geracao||!uid||uid!==obterUid())throw Error('Consulta cancelada: sessão ou página alterada.');};
  async function todos(chamar,dados={}) {
    const epoca=geracao,uid=obterUid();let cursor,lista=[];const vistos=new Set();
    for(let n=0;n<maxPaginas;n++) {
      validar(epoca,uid);const r=await chamar({...dados,limite:50,...(cursor?{cursor}:{})});validar(epoca,uid);
      lista.push(...r.registros);if(!r.proximoCursor)return lista;
      if(vistos.has(r.proximoCursor))throw Error('Paginação inconsistente. Atualize a consulta.');
      vistos.add(r.proximoCursor);cursor=r.proximoCursor;
    }
    throw Error('Consulta excedeu o limite de carregamento. Solicite à TI filtros adicionais; nenhum resultado parcial foi apresentado.');
  }
  async function buscarEventos(mais=false) {
    const epoca=geracao,uid=obterUid();validar(epoca,uid);
    const r=await api.listarEventosDsipsV2({limite:30,...(mais&&cursorEventos?{cursor:cursorEventos}:{})});validar(epoca,uid);
    eventos=mais?[...eventos,...r.registros.filter(e=>!eventos.some(a=>a.id===e.id))]:r.registros;cursorEventos=r.proximoCursor;historicoIniciado=true;return eventos;
  }
  return {
    listar:tipo=>tipo==='responsaveis'?todos(api.listarResponsaveisDsipsV2):todos(api.listarDsipsV2,{tipo}),
    listarUnidades:materialId=>todos(api.listarDsipsV2,{tipo:'unidades',materialId}),
    listarEventos:()=>historicoIniciado?Promise.resolve(eventos):buscarEventos(),
    carregarMaisHistorico:()=>cursorEventos?buscarEventos(true):Promise.resolve(eventos),
    temMaisHistorico:()=>Boolean(cursorEventos),
    salvar:api.salvarCadastroDsipsV2,saldoInicial:api.registrarSaldoInicialDsipsV2,
    registrarCautela:api.registrarCautelaDsipsV2,registrarDevolucao:api.registrarDevolucaoDsipsV2,
    invalidar(){++geracao;eventos=[];cursorEventos=null;historicoIniciado=false;}
  };
}
