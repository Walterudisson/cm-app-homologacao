import {conferirVersaoAtual} from './contrato-versao.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {podeNavegarLegado,decidirMudancaAcesso} from '../js/platform/acesso-sessao.js';
test('SAN-01: conta versionada é encerrada antes de carregar privilégios legados',async()=>{
 const src=await readFile(new URL('../app.js',import.meta.url),'utf8');
 const start=src.indexOf("if (Object.hasOwn(userDoc.data(), 'autorizacaoVersao'))");
 const end=src.indexOf("usuarioLogado = { uid: user.uid",start);
 assert.ok(start>=0&&end>start);
 assert.match(src.slice(start,end),/await signOut\(auth\)/);
 assert.match(src.slice(start,end),/return;/);
 assert.doesNotMatch(src,/location\.replace.*homologacao\/gestao-acessos/);
 for(const v of [2,3,null,0]){const u={perfil:'admin',autorizacaoVersao:v};assert.equal(podeNavegarLegado(u,'usuarios'),false);assert.equal(decidirMudancaAcesso({perfil:'admin'},u),'encerrar');}
});
test('cache da PWA e script principal incluem nova versão',async()=>{await conferirVersaoAtual();});
