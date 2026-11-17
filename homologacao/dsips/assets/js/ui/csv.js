export const celulaCsv=valor=>'"'+String(valor??'').replace(/^[\s]*[=+@-]/,"'$&").replaceAll('"','""')+'"';
export function criarCsv(cabecalho,linhas){return'\ufeff'+[cabecalho,...linhas].map(l=>l.map(celulaCsv).join(';')).join('\r\n');}
export function baixarCsv(nome,conteudo){const url=URL.createObjectURL(new Blob([conteudo],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=nome;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
