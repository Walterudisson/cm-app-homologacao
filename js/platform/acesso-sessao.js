import {podeAbrirPagina,modulosDoUsuario} from './modules.js';
import {usuarioPode,PERMISSOES} from '../core/permissoes.js';
const lista=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'))].sort():null;
// Campos que influenciam os fluxos legados. Alterações de nome/foto não reiniciam sessão.
export function assinaturaAcesso(u={}){
 return JSON.stringify([u.ativo!==false,u.perfil??null,Object.hasOwn(u,'modulos'),lista(u.modulos),lista(u.divisoesAtribuidas),lista(u.permissoes),u.funcaoId??null,Object.hasOwn(u,'autorizacaoVersao'),u.autorizacaoVersao??null]);
}
export function podeNavegarLegado(u,id){
 if(!u||Object.hasOwn(u,'autorizacaoVersao')||!podeAbrirPagina(u,id))return false;
 if(id==='modulos')return modulosDoUsuario(u).length>0;
 if(id==='divisoes')return usuarioPode(u,PERMISSOES.DIVISOES_VISUALIZAR);
 if(id==='usuarios')return usuarioPode(u,PERMISSOES.USUARIOS_VISUALIZAR);
 return true;
}
export function decidirMudancaAcesso(inicial,atual,{doCache=false}={}){
 if(doCache)return 'ignorar';
 if(!atual||atual.ativo===false)return 'encerrar';
 if(Object.hasOwn(atual,'autorizacaoVersao')&&atual.autorizacaoVersao!==2)return 'encerrar';
 return assinaturaAcesso(inicial)===assinaturaAcesso(atual)?'manter':'reiniciar';
}
