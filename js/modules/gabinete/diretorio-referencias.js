// GAB-07.1: projeções de referência, sem leitura de coleções privadas.
// Em HML, só o próprio usuário é projetado a partir da sessão autenticada.
// Outros usuários e divisões só poderão ser enumerados por endpoint autorizado.
const ID_SELF_PREFIX='self:';
export function iniciaisInstitucionais(nome){
  const palavras=String(nome||'').trim().split(/\s+/).filter(Boolean);
  return palavras.length?(palavras[0][0]+(palavras.length>1?palavras[palavras.length-1][0]:'')).toLocaleUpperCase('pt-BR'):'CM';
}
export function contatoProprioAutorizado(usuario){
  if(!usuario||typeof usuario.uid!=='string'||!usuario.uid.trim()||usuario.ativo===false)return null;
  const nome=String(usuario.nome||usuario.displayName||'Meu perfil').trim().slice(0,100)||'Meu perfil';
  const unidades=Array.isArray(usuario.divisoesAtribuidas)?usuario.divisoesAtribuidas.filter(x=>typeof x==='string'&&x.trim()):[];
  return Object.freeze({
    id:ID_SELF_PREFIX+usuario.uid,uid:usuario.uid,tipo:'pessoa',nome,
    unidade:unidades[0]||'Divisão não informada',
    email:String(usuario.email||'').trim().slice(0,150),
    funcao:'Perfil vinculado à conta atual',
    ramal:'',aniversario:'',telefoneInstitucional:'',
    ativo:true,origem:'usuarios',somenteLeitura:true
  });
}
// Não usa fotoURL do Auth para outras contas nem publica URLs recebidas da Gestão.
export function criarDiretorioGabinete({cadastro,orgaos,obterUsuario,obterFotoPropria=()=>''}){
  const demoDivisoes=Object.freeze([
    ['demo-div-alfa','Unidade Alfa'],['demo-div-beta','Unidade Beta'],
    ['demo-div-gama','Unidade Gama'],['demo-div-delta','Unidade Delta'],
    ['demo-div-epsilon','Unidade Épsilon']
  ]);
  let divisoes=new Map(demoDivisoes);
  let idsDivisoesReais=new Set();
  // Catálogo derivado da sessão: nenhum identificador de divisão real sobrevive à troca de conta.
  function limparReferencias(){
    divisoes=new Map(demoDivisoes);
    idsDivisoesReais=new Set();
  }
  const obterSelf=()=>cadastro.usuarioAtual()===obterUsuario()?.uid?contatoProprioAutorizado(obterUsuario()):null;
  const enriquecer=c=>{
    if(!c)return null;
    if(c.tipo==='pessoa')return Object.freeze({...c,origem:'usuarios-referencia-demo',somenteLeitura:true});
    const unidade=c.tipo==='externo'&&c.orgaoId
      ? (orgaos.obter(c.orgaoId)?.nome||'Órgão externo indisponível')
      :c.tipo==='ramal'&&c.unidadeId?(divisoes.get(c.unidadeId)||'Divisão indisponível'):c.unidade;
    return Object.freeze({...c,unidade,origem:'gabinete',somenteLeitura:false});
  };
  function contatoOrgao(org){
    if(!org)return null;
    return Object.freeze({
      id:'org:'+org.id,tipo:'externo',nome:org.nome,
      unidade:[org.categoria,org.cidade].filter(Boolean).join(' · ')||'Órgão externo',
      email:org.email,telefoneInstitucional:org.telefone,ramal:'',
      funcao:'Órgão externo · fonte Gabinete',ativo:org.ativo,
      revisadoEm:org.revisadoEm,origem:'orgaos',somenteLeitura:true
    });
  }
  function obter(id){
    const self=obterSelf();
    if(self?.id===id)return self;
    if(typeof id==='string'&&id.startsWith('org:')){
      const org=orgaos.obter(id.slice(4));
      return org?.ativo?contatoOrgao(org):null;
    }
    return enriquecer(cadastro.obter(id));
  }
  function listar(opcoes={}){
    const dados=cadastro.listar(opcoes).map(enriquecer);
    const externos=orgaos.listar(opcoes).map(contatoOrgao);
    const self=obterSelf();
    return self?[self,...dados,...externos]:[...dados,...externos];
  }
  // Todas as mutações de pessoas ficam com Gestão, inclusive os registros fictícios.
  function mutacaoPermitida(id){
    const contato=obter(id);
    if(!contato||contato.somenteLeitura)throw new Error('Pessoas são gerenciadas pela Gestão, sem cadastro duplicado no Gabinete.');
    return contato;
  }
  function normalizarVinculo(dados){
    if(dados?.tipo==='ramal'&&dados.unidadeId){
      const unidade=divisoes.get(dados.unidadeId);
      if(!unidade)throw new Error('Selecione uma divisão disponível para o ramal.');
      return {...dados,unidade};
    }
    if(dados?.tipo!=='externo')return dados;
    const org=orgaos.obter(dados.orgaoId);
    if(!org?.ativo)throw new Error('Selecione um órgão externo ativo antes de salvar o contato.');
    return {...dados,unidade:org.nome};
  }
  function criar(dados){
    if(dados?.tipo==='pessoa')throw new Error('Pessoas internas devem ser cadastradas pela Gestão.');
    return cadastro.criar(normalizarVinculo(dados));
  }
  function editar(id,dados){mutacaoPermitida(id);return cadastro.editar(id,normalizarVinculo(dados));}
  function excluir(id){mutacaoPermitida(id);return cadastro.excluir(id);}
  function restaurar(id){mutacaoPermitida(id);return cadastro.restaurar(id);}
  function revisar(id){mutacaoPermitida(id);return cadastro.revisar(id);}
  function fotoDoContato(contato){
    const self=obterSelf();
    // Foto exclusivamente do próprio titular autenticado, já carregada no Meu Perfil.
    if(self&&contato?.id===self.id){
      const url=obterFotoPropria();
      return typeof url==='string'&&/^https:\/\//.test(url)?url:'';
    }
    return '';
  }
  return Object.freeze({
    listar,obter,criar,editar,excluir,restaurar,revisar,
    fotoDoContato,
    definirDivisoes(lista){
      // Somente referências que a sessão já podia consultar. Não persistir a listagem.
      const itens=Array.isArray(lista)?lista:[];
      for(const item of itens){
        if(typeof item?.id!=='string'||!item.id.trim()||typeof item.nome!=='string'||!item.nome.trim())continue;
        if(item.id.startsWith('demo-div-'))continue;
        divisoes.set(item.id,item.nome);
        idsDivisoesReais.add(item.id);
      }
    },
    listarDivisoes:()=>[...divisoes].filter(([id])=>!idsDivisoesReais.size||idsDivisoesReais.has(id))
      .map(([id,nome])=>({id,nome,demonstracao:id.startsWith('demo-div-')})),
    assinar:cadastro.assinar,
    iniciar(uid){
      if(cadastro.usuarioAtual()!==uid)limparReferencias();
      cadastro.iniciar(uid);
    },
    limpar(){limparReferencias();cadastro.limpar();},
    usuarioAtual:cadastro.usuarioAtual
  });
}
