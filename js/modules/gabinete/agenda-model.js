// GAB-05: somente dados fictícios. Não publicar o cadastro real no shell estático.
export const CONTATOS_DEMONSTRACAO = Object.freeze([
  {id:'demo-pessoa-001',tipo:'pessoa',nome:'SGT Exemplo A',unidade:'Unidade Alfa',funcao:'Contato institucional de demonstração',ramal:'0001',aniversario:'11-21'},
  {id:'demo-pessoa-002',tipo:'pessoa',nome:'Servidor Exemplo B',unidade:'Unidade Beta',funcao:'Contato institucional de demonstração',ramal:'0002',aniversario:'11-25'},
  {id:'demo-pessoa-003',tipo:'pessoa',nome:'SGT Exemplo C',unidade:'Unidade Gama',funcao:'Contato institucional de demonstração',ramal:'0003',aniversario:'12-03'},
  {id:'demo-pessoa-004',tipo:'pessoa',nome:'Servidor Exemplo D',unidade:'Unidade Delta',funcao:'Contato institucional de demonstração',ramal:'0004',aniversario:'02-29'},
  {id:'demo-pessoa-005',tipo:'pessoa',nome:'Militar Exemplo E',unidade:'Unidade Épsilon',funcao:'Contato institucional de demonstração',aniversario:'01-15'},
  {id:'demo-externo-001',tipo:'externo',nome:'Órgão externo exemplo',unidade:'Atendimento institucional',email:'externo@example.invalid'},
  {id:'demo-ramal-001',tipo:'ramal',nome:'Recepção exemplo',unidade:'Unidade Alfa',ramal:'0001'},
  {id:'demo-ramal-002',tipo:'ramal',nome:'Setor exemplo',unidade:'Unidade Beta',ramal:'0002'},
  {id:'demo-ramal-003',tipo:'ramal',nome:'Atendimento exemplo',unidade:'Unidade Beta',ramal:'0002'},
  {id:'demo-ramal-004',tipo:'ramal',nome:'Apoio exemplo',unidade:'Unidade Beta'}
].map(contato=>Object.freeze(contato)));

export function normalizarBusca(valor=''){
  return String(valor??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}

export function filtrarContatosGabinete(contatos,{termo='',tipo='',apenasFavoritos=false,favoritos=new Set()}={}){
  const busca=normalizarBusca(termo);
  return contatos.filter(c=>{
    if(tipo && c.tipo!==tipo) return false;
    if(apenasFavoritos && !favoritos.has(c.id)) return false;
    return normalizarBusca([c.nome,c.unidade,c.funcao,c.ramal,c.email].filter(Boolean).join(' ')).includes(busca);
  });
}
