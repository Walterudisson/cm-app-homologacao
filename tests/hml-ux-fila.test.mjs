import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const a=await readFile(new URL('../app.js',import.meta.url),'utf8');
test('fila inicia recolhida e não abre primeiro grupo automaticamente',()=>{assert.doesNotMatch(a,/indice === 0 \? 'open'/);assert.match(a,/abaAtual !== abaAtiva && abaAtiva === 'transferencias'/);assert.match(a,/grupo\.open = false/);});
test('atualizações preservam somente grupos abertos pela divisão, e logout limpa DOM',()=>{assert.match(a,/details\.transfer-group\[open\]/);assert.match(a,/gruposAbertos\.has\(divisao\) \? 'open'/);assert.match(a,/data-divisao="\$\{escaparHtml\(divisao\)\}"/);assert.match(a,/getElementById\('container-transferencias'\)\?\.replaceChildren\(\)/);});
