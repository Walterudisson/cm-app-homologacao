import assert from 'node:assert/strict';
import { CONTATOS_DEMONSTRACAO, normalizarBusca, filtrarContatosGabinete } from '../js/modules/gabinete/agenda-model.js';

const todos=CONTATOS_DEMONSTRACAO;
assert.equal(todos.length,7,'sete registros fictícios na versão demonstrativa');
assert.ok(todos.every(c=>c.id.startsWith('demo-')),'IDs de demonstração');
assert.ok(todos.every(c=>!Object.keys(c).some(k=>/particular|pessoal/i.test(k))),'sem dados particulares');
assert.equal(normalizarBusca('ÓRGÃO'),'orgao','normalização sem acentos');
assert.equal(filtrarContatosGabinete(todos,{tipo:'pessoa'}).length,2);
assert.equal(filtrarContatosGabinete(todos,{tipo:'ramal'}).length,4);
assert.equal(filtrarContatosGabinete(todos,{termo:'0002'}).length,3);
assert.equal(filtrarContatosGabinete(todos,{termo:'orgao'}).length,1);
assert.equal(filtrarContatosGabinete(todos,{termo:'Unidade Beta'}).length,4);
assert.equal(filtrarContatosGabinete(todos,{termo:'não encontrado'}).length,0);
assert.equal(filtrarContatosGabinete(todos,{apenasFavoritos:true,favoritos:new Set(['demo-pessoa-001'])}).length,1);
assert.equal(filtrarContatosGabinete(todos,{apenasFavoritos:true}).length,0);
console.log('GAB-05: 12 asserções aprovadas (modelo e filtros).');
