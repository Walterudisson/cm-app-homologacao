import {podeConsultarMateriaisDsips} from './consulta-materiais-model.js';
import {podeConsultarHistoricoDsips} from './historico-model.js';
import {consolidarPosseDsips} from './posse-model.js';
export function resumirPainelDsips(materiais,estoque,cautelas,categorias=[]){
 const ativos=new Set(materiais.filter(m=>m.ativo!==false).map(m=>m.id));
 return {materiais:ativos.size,categorias:categorias.length,cautelas:cautelas.filter(c=>['aberta','parcial'].includes(c.status)).length,responsaveis:consolidarPosseDsips(cautelas).length};
}
export function acoesPainelDsips(usuario){
 if(!podeConsultarMateriaisDsips(usuario))return [];
 const a=[['dsips-cautelas','Cautelas','Entregar, devolver e consultar materiais','clipboard'],['dsips-materiais','Cadastros','Materiais, categorias e locais','folder'],['dsips-estoque','Estoque','Consultar saldos e posições','warehouse'],['dsips-posse','Quem está com o quê?','Localizar materiais em posse','users']];
 if(podeConsultarHistoricoDsips(usuario))a.push(['dsips-historico','Histórico','Consultar auditoria','history']);
 return a;
}