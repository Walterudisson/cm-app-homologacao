import test from 'node:test';import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
test('SAN-01: as duas interfaces experimentais não existem no projeto ativo',async()=>{
 for(const p of ['homologacao/gestao-acessos','homologacao/dsips'])await assert.rejects(access(new URL('../'+p,import.meta.url)),{code:'ENOENT'});
});
test('SAN-01: DSIPS operacional e Gestão permanecem na raiz do aplicativo',async()=>{
 const h=await readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const id of ['sec-usuarios','sec-divisoes','sec-funcoes','sec-dsips-inicio','sec-dsips-cautelas','sec-dsips-estoque'])assert.ok(h.includes('id="'+id+'"'),id);
 for(const p of ['js/modules/dsips/service.js','js/modules/dsips/registro-cautelas-ui.js'])await access(new URL('../'+p,import.meta.url));
 assert.doesNotMatch(h,/href=["'][^"']*homologacao\/(?:gestao-acessos|dsips)/);
});
