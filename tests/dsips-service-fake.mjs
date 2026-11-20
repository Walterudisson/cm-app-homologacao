// Exclusivo de testes; sem Firebase ou requisições reais.
let servicos;
export function configurarServicos(s){servicos=s;}
function chamar(nome,...args){if(!servicos?.[nome])throw Error('Serviço fictício não configurado: '+nome);return servicos[nome](...args);}
export const listarCadastroDsips=(...a)=>chamar('listar',...a);
export const listarUnidadesDsips=(...a)=>chamar('listarUnidades',...a);
export const salvarCadastroDsips=(...a)=>chamar('salvar',...a);
export const registrarSaldoInicialDsips=(...a)=>chamar('saldoInicial',...a);
export const registrarCautelaDsips=(...a)=>chamar('registrarCautela',...a);
export const registrarDevolucaoDsips=(...a)=>chamar('registrarDevolucao',...a);
export const registrarAjusteEstoqueDsips=(...a)=>chamar('ajuste',...a);
export const listarCautelasPendentesDsips=()=>chamar('listar','cautelas');
export const invalidarCacheDsips=()=>{};
