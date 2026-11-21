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
export function criarDiretorioGabinete({cadastro,obterUsuario,obterFotoPropria=()=>''}){
  const obterSelf=()=>cadastro.usuarioAtual()===obterUsuario()?.uid?contatoProprioAutorizado(obterUsuario()):null;
  const enriquecer=c=>{
    if(!c)return null;
    if(c.tipo==='pessoa')return Object.freeze({...c,origem:'usuarios-referencia-demo',somenteLeitura:true});
    return Object.freeze({...c,origem:'gabinete',somenteLeitura:false});
  };
  function obter(id){
    const self=obterSelf();
    if(self?.id===id)return self;
    return enriquecer(cadastro.obter(id));
  }
  function listar(opcoes={}){
    const dados=cadastro.listar(opcoes).map(enriquecer);
    const self=obterSelf();
    return self?[self,...dados]:dados;
  }
  // Todas as mutações de pessoas ficam com Gestão, inclusive os registros fictícios.
  function mutacaoPermitida(id){
    const contato=obter(id);
    if(!contato||contato.somenteLeitura)throw new Error('Pessoas são gerenciadas pela Gestão, sem cadastro duplicado no Gabinete.');
    return contato;
  }
  function criar(dados){
    if(dados?.tipo==='pessoa')throw new Error('Pessoas internas devem ser cadastradas pela Gestão.');
    return cadastro.criar(dados);
  }
  function editar(id,dados){mutacaoPermitida(id);return cadastro.editar(id,dados);}
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
    assinar:cadastro.assinar,iniciar:cadastro.iniciar,limpar:cadastro.limpar,usuarioAtual:cadastro.usuarioAtual
  });
}
