import {CATALOGO_PERMISSOES} from '../../core/permissoes.js';

// GEST-02: análise local de configuração. Não é autorização nem avalia Rules/Functions.
// Não inventar direitos de funções personalizadas para usuários que apontam funcaoId.
const CONHECIDAS=new Map(CATALOGO_PERMISSOES.map(item=>[item.id,Object.freeze({
  id:item.id,rotulo:item.modulo+' · '+item.acao
})]));
const texto=valor=>String(valor??'').trim();
export function descreverPermissaoLegada(id){
  return CONHECIDAS.get(id)?.rotulo||'Chave legada não reconhecida';
}
export function permissoesDesconhecidas(funcao){
  return Object.freeze([...new Set((Array.isArray(funcao?.permissoes)?funcao.permissoes:[])
    .filter(id=>typeof id==='string'&&!CONHECIDAS.has(id)))].sort());
}
export function prepararPermissoesFuncao({selecionadas=[],original=null}={}){
  const ids=Array.isArray(selecionadas)?selecionadas:[];
  if(ids.some(id=>!CONHECIDAS.has(id)))throw new Error('A edição não aceita novas chaves fora do catálogo legado.');
  // Preserva referências históricas desconhecidas sem exibi-las como acesso concedido.
  return Object.freeze([...new Set([...ids,...permissoesDesconhecidas(original)])].sort());
}
export function analisarImpactoFuncao(original=null,proposta={}){
  const nova=!original;
  const antes=new Set(Array.isArray(original?.permissoes)?original.permissoes:[]);
  const depois=new Set(Array.isArray(proposta?.permissoes)?proposta.permissoes:[]);
  const adicionadas=[...depois].filter(id=>!antes.has(id)).sort();
  const removidas=[...antes].filter(id=>!depois.has(id)).sort();
  const baseAnterior=texto(original?.perfilBase);
  const baseNova=texto(proposta?.perfilBase);
  const perfilAlterado=!nova&&baseAnterior!==baseNova;
  const nomeAlterado=!nova&&texto(original.nome)!==texto(proposta.nome);
  const descricaoAlterada=!nova&&texto(original.descricao)!==texto(proposta.descricao);
  const mudou=nova||perfilAlterado||nomeAlterado||descricaoAlterada||adicionadas.length>0||removidas.length>0;
  const alteraConfiguracaoDeAcesso=nova||perfilAlterado||adicionadas.length>0||removidas.length>0;
  return Object.freeze({
    nova,mudou,perfilAlterado,nomeAlterado,descricaoAlterada,
    alteraConfiguracaoDeAcesso,
    baseAnterior,baseNova,
    adicionadas:Object.freeze(adicionadas),removidas:Object.freeze(removidas),
    desconhecidasPreservadas:permissoesDesconhecidas(original),
    totalSelecionadas:depois.size
  });
}
export function resumoImpactoFuncao(impacto){
  if(!impacto.mudou)return 'Nenhuma alteração detectada. Não é necessário salvar.';
  if(impacto.nova)return 'Nova função: '+impacto.totalSelecionadas+' chaves no cadastro legado. Nenhum acesso será concedido automaticamente por esta prévia.';
  const mudancas=[];
  if(impacto.perfilAlterado)mudancas.push('perfil-base alterado');
  if(impacto.adicionadas.length)mudancas.push('+'+impacto.adicionadas.length+' permissão(ões) na configuração');
  if(impacto.removidas.length)mudancas.push('−'+impacto.removidas.length+' permissão(ões) na configuração');
  if(impacto.nomeAlterado)mudancas.push('nome alterado');
  if(impacto.descricaoAlterada)mudancas.push('descrição alterada');
  return mudancas.join(' · ')+'. A validação efetiva no servidor e o impacto sobre usuários vinculados não são verificados aqui.';
}
export function mensagemConfirmacaoFuncao(impacto,nome){
  const partes=[
    (impacto.nova?'Criar função personalizada ':'Atualizar a função personalizada ')+texto(nome)+'?',
    resumoImpactoFuncao(impacto)
  ];
  if(impacto.perfilAlterado)partes.push('Perfil-base: '+impacto.baseAnterior+' → '+impacto.baseNova+'.');
  if(impacto.adicionadas.length)partes.push('Adicionadas: '+impacto.adicionadas.map(descreverPermissaoLegada).join('; ')+'.');
  if(impacto.removidas.length)partes.push('Removidas: '+impacto.removidas.map(descreverPermissaoLegada).join('; ')+'.');
  if(impacto.desconhecidasPreservadas.length)
    partes.push('Chaves antigas não reconhecidas serão preservadas sem alteração.');
  partes.push('O número de usuários vinculados não foi consultado. Esta confirmação salva somente na estrutura já existente; não certifica direitos efetivos no backend.');
  return partes.join('\n\n');
}
