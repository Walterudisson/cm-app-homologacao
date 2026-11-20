// Contrato de referência GAB-01. Não é uma autorização implantada.
const texto=v=>typeof v==='string'?v.trim().replace(/\s+/g,' '):'';
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v);
const tipos=new Set(['militar','bombeiro','civil','outro']);
const situacoes=new Set(['ativo','desligado']);
const niveis=new Set(['direcao','assessoramento','gerencia','divisao','secao','setor','servico']);
export function nomeInstitucional(p){
 const chamada=texto(p.nomeGuerra)||texto(p.nomeCompleto);
 return [texto(p.postoGraduacao),chamada].filter(Boolean).join(' ');
}
export function nascimentoValido(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const d=new Date(v+'T00:00:00Z');
 return Number.isFinite(+d)&&d.toISOString().slice(0,10)===v&&v>='1900-01-01';
}
export function validarPessoa(p){
 if(!id(p?.id)||!texto(p.nomeCompleto)||!tipos.has(p.tipo)||!situacoes.has(p.situacao)||!id(p.unidadeId))throw Error('Identidade institucional inválida.');
 if(p.dataNascimento!=null&&!nascimentoValido(p.dataNascimento))throw Error('Nascimento inválido.');
 return {id:p.id,nomeCompleto:texto(p.nomeCompleto),nomeGuerra:texto(p.nomeGuerra),postoGraduacao:texto(p.postoGraduacao),quadro:texto(p.quadro),tipo:p.tipo,situacao:p.situacao,unidadeId:p.unidadeId};
}
export function validarUnidades(unidades){
 const m=new Map();
 for(const u of unidades){
  if(!id(u?.id)||m.has(u.id)||!texto(u.nome)||!texto(u.sigla)||!niveis.has(u.tipo)||typeof u.ativo!=='boolean')throw Error('Unidade inválida ou duplicada.');
  m.set(u.id,u);
 }
 const siglas=new Set();
 for(const u of m.values()){
  const s=texto(u.sigla).toUpperCase();if(siglas.has(s))throw Error('Sigla duplicada.');siglas.add(s);
  const visitados=new Set([u.id]);let pai=u.unidadePaiId;
  while(pai!=null){if(!m.has(pai))throw Error('Unidade superior inexistente.');if(visitados.has(pai))throw Error('Ciclo organizacional.');visitados.add(pai);pai=m.get(pai).unidadePaiId;}
  if(u.ativo&&u.unidadePaiId!=null&&!m.get(u.unidadePaiId).ativo)throw Error('Unidade ativa subordinada a inativa.');
 }
 return true;
}
export function validarVinculos(vinculos,pessoas,contas){
 const p=new Set(pessoas.map(x=>x.id)),c=new Set(contas.map(x=>x.uid)),usadosP=new Set(),usadosC=new Set();
 for(const v of vinculos){if(!p.has(v.pessoaId)||!c.has(v.uid)||usadosP.has(v.pessoaId)||usadosC.has(v.uid))throw Error('Vínculo inválido ou duplicado.');usadosP.add(v.pessoaId);usadosC.add(v.uid);}
 return true;
}
// Contexto deve ser obtido pelo servidor de conta, identidade, concessão e revogação atuais.
// Jamais aceitar este objeto como alegação enviada pelo cliente.
export function capacidadesAgenda(ctx){
 const base=ctx?.contaAtiva===true&&ctx?.pessoaAtiva===true&&ctx?.agendaConcedida===true&&ctx?.revogada===false;
 return Object.freeze({consultar:base,exportar:base,privado:base&&ctx?.telefonePrivadoConcedido===true&&['gabinete','administracao'].includes(ctx?.papelPrivado),administrar:base&&ctx?.administracaoAgendaConcedida===true&&['gabinete','administracao'].includes(ctx?.papelPrivado)});
}
// Lista fechada de campos: jamais espalhar documento administrativo na resposta.
export function projetarContato(p,contato,ctx){
 const cap=capacidadesAgenda(ctx);
 if(!cap.consultar||p?.situacao!=='ativo'||contato?.visivel!==true)return null;
 const result={id:p.id,nome:nomeInstitucional(p),unidadeId:p.unidadeId,ramais:Array.isArray(contato.ramais)?contato.ramais.filter(r=>typeof r==='string'&&/^\d{2,8}$/.test(r)):[],emailInstitucional:texto(contato.emailInstitucional),telefoneInstitucional:texto(contato.telefoneInstitucional)};
 if(contato.aniversarioVisivel===true&&nascimentoValido(contato.dataNascimento))result.aniversario=contato.dataNascimento.slice(5);
 if(cap.privado)result.telefoneParticular=texto(contato.telefoneParticular);
 return result;
}
export function pesquisarAgenda(projecoes,termo){
 const n=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const q=n(texto(termo));return projecoes.filter(Boolean).filter(p=>n([p.nome,p.unidadeId,...p.ramais,p.emailInstitucional,p.telefoneInstitucional,p.telefoneParticular||''].join(' ')).includes(q));
}
export function revisaoPendente(ultima,hoje){
 if(!nascimentoValido(hoje))throw Error('Data de referência inválida.');
 if(!nascimentoValido(ultima))return true;
 return (Date.parse(hoje+'T00:00:00Z')-Date.parse(ultima+'T00:00:00Z'))/86400000>=90;
}
