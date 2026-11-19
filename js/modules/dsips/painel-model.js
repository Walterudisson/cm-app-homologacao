import {podeConsultarMateriaisDsips} from './consulta-materiais-model.js';
import {podeConsultarHistoricoDsips} from './historico-model.js';
import {consolidarPosseDsips} from './posse-model.js';
export function resumirPainelDsips(materiais,estoque,cautelas){
 const ativos=new Set(materiais.filter(m=>m.ativo!==false).map(m=>m.id));
 return {materiais:ativos.size,disponiveis:new Set(estoque.filter(p=>ativos.has(p.materialId)&&Number.isSafeInteger(p.disponivel)&&p.disponivel>0).map(p=>p.materialId)).size,cautelas:cautelas.filter(c=>['aberta','parcial'].includes(c.status)).length,responsaveis:consolidarPosseDsips(cautelas).length};
}
export function acoesPainelDsips(usuario){
 if(!podeConsultarMateriaisDsips(usuario))return [];
 const a=[['dsips-cautelas','PDV / Quiosque','Entregar e receber materiais','clipboard'],['dsips-materiais','Cadastros','Materiais, categorias e locais','folder'],['dsips-estoque','Estoque','Consultar saldos e posições','warehouse'],['dsips-posse','Quem está com o quê?','Localizar materiais em posse','users']];
 if(podeConsultarHistoricoDsips(usuario))a.push(['dsips-historico','Histórico','Consultar auditoria','history']);
 return a;
}