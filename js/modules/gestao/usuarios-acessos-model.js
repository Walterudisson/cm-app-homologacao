import {CATALOGO_PERMISSOES,FUNCOES_NATIVAS} from '../../core/permissoes.js';

// GEST-03: projeção explicativa do cadastro existente. NÃO calcula direitos de servidor.
// Um ID de função personalizada não equivale a herdar suas permissões.
export const PERFIS_ACESSO_ROTULOS=Object.freeze({
  admin:'Administrador',gestor:'Gestor',conferente:'Conferente',usuario:'Usuário'
});
const unicos=lista=>Array.isArray(lista)
  ?[...new Set(lista.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean))]
  :[];
const nomeModulo=modulo=>typeof modulo==='string'?modulo:String(modulo?.nome||modulo?.id||'').trim();
export function resumirVinculoUsuario(usuario,{funcoes=[],modulos=[]}={}){
  if(!usuario||typeof usuario!=='object')return null;
  const perfil=String(usuario.perfil||'');
  const perfilRotulo=PERFIS_ACESSO_ROTULOS[perfil]||'Perfil não reconhecido';
  const funcaoId=String(usuario.funcaoId||'').trim();
  const funcoesDisponiveis=Array.isArray(funcoes)?funcoes:[];
  const funcao=funcaoId?funcoesDisponiveis.find(x=>x?.id===funcaoId):null;
  const funcaoSituacao=!funcaoId?'nativa':!funcao?'nao-verificada'
    :funcao.ativo===false?'inativa':'cadastrada';
  const funcaoRotulo=!funcaoId?'Somente perfil nativo'
    :String(funcao?.nome||usuario.funcaoNome||'Função personalizada vinculada');
  const divisaoOrigem=usuario.divisoesAtribuidas??usuario.divisaoAtribuidas;
  const divisoes=unicos(divisaoOrigem);
  const divisaoResumo=perfil==='conferente'
    ?(divisoes.length?divisoes.join(' · '):'Nenhuma divisão atribuída')
    :'Abrangência por divisão não definida neste resumo legado';
  const modulosNavegacao=unicos((Array.isArray(modulos)?modulos:[]).map(nomeModulo));
  const declaradasNativas=unicos(FUNCOES_NATIVAS[perfil]||[]);
  const declaradasAdicionais=unicos(usuario.permissoes);
  const declaradas=new Set([...declaradasNativas,...declaradasAdicionais]);
  const permissoes=CATALOGO_PERMISSOES.filter(item=>declaradas.has(item.id))
    .map(item=>Object.freeze({
      id:item.id,rotulo:item.modulo+' · '+item.acao,
      origem:declaradasNativas.includes(item.id)?'perfil':'adicional'
    }));
  const chavesDesconhecidas=declaradasAdicionais.filter(id=>!CATALOGO_PERMISSOES.some(item=>item.id===id));
  return Object.freeze({
    perfil,perfilRotulo,ativo:usuario.ativo!==false,funcaoId,funcaoRotulo,funcaoSituacao,
    divisaoResumo,divisoes:Object.freeze(divisoes),
    modulosNavegacao:Object.freeze(modulosNavegacao),
    permissoesDeclaradas:Object.freeze(permissoes),
    chavesDesconhecidas:Object.freeze(chavesDesconhecidas),
    nota:'Resumo dos campos e regras de navegação legados. Não certifica acesso no Firebase. '+
      'A vinculação de função personalizada não é automaticamente aplicada pelo helper de permissões atual.'
  });
}
export function filtrarUsuariosPorFuncao(usuarios,filtro='todos'){
  const itens=Array.isArray(usuarios)?usuarios:[];
  if(filtro==='com-funcao')return itens.filter(u=>typeof u?.funcaoId==='string'&&u.funcaoId.trim());
  if(filtro==='sem-funcao')return itens.filter(u=>!u?.funcaoId||!String(u.funcaoId).trim());
  return [...itens];
}
export function resumirPreviaAtribuicao({perfil='',funcaoId='',divisoesAtribuidas=[],funcoes=[]}={}){
  const dados=resumirVinculoUsuario({perfil,funcaoId,divisoesAtribuidas},{funcoes});
  if(!dados)return null;
  const avisos=[];
  if(dados.funcaoId){
    if(dados.funcaoSituacao==='nao-verificada')avisos.push('Função não confirmada no catálogo carregado. Verifique antes de salvar.');
    if(dados.funcaoSituacao==='inativa')avisos.push('Função inativa. A atribuição precisa ser revisada.');
    avisos.push('A seleção registra o vínculo da função e o perfil-base, sem garantir aplicação das permissões da função no backend.');
  }
  if(dados.perfil==='conferente'&&!dados.divisoes.length)
    avisos.push('Conferente sem divisão atribuída: confirme a abrangência antes de salvar.');
  if(dados.perfil!=='conferente'&&unicos(divisoesAtribuidas).length)
    avisos.push('Divisões foram selecionadas, mas o fluxo legado só envia divisões para Conferentes.');
  if(dados.perfil==='admin')avisos.push('Perfil administrativo exige verificação adicional antes de conceder ou alterar.');
  avisos.push('Nenhuma nova permissão por módulo ou campo privado é concedida por esta prévia.');
  return Object.freeze({
    perfilRotulo:dados.perfilRotulo,funcaoRotulo:dados.funcaoRotulo,
    funcaoSituacao:dados.funcaoSituacao,divisaoResumo:dados.divisaoResumo,
    avisos:Object.freeze(avisos)
  });
}
