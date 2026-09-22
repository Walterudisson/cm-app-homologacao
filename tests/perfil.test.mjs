import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FOTO_PERFIL_DIMENSAO,
  calcularRecorteQuadrado,
  validarArquivoFoto,
  validarNovaSenha
} from '../js/core/perfil.js';

test('valida formato e tamanho da foto antes do processamento', () => {
  assert.equal(validarArquivoFoto(null).valido, false);
  assert.equal(validarArquivoFoto({ type: 'application/pdf', size: 100 }).valido, false);
  assert.equal(validarArquivoFoto({ type: 'image/jpeg', size: 11 * 1024 * 1024 }).valido, false);
  assert.equal(validarArquivoFoto({ type: 'image/webp', size: 500_000 }).valido, true);
});

test('calcula recorte central quadrado para retrato e paisagem', () => {
  assert.deepEqual(calcularRecorteQuadrado(1200, 800), { origemX: 200, origemY: 0, lado: 800 });
  assert.deepEqual(calcularRecorteQuadrado(600, 1000), { origemX: 0, origemY: 200, lado: 600 });
  assert.equal(FOTO_PERFIL_DIMENSAO, 512);
});

test('exige senha atual, oito caracteres e confirmação correspondente', () => {
  assert.equal(validarNovaSenha('', '12345678', '12345678').valido, false);
  assert.equal(validarNovaSenha('antiga', '1234567', '1234567').valido, false);
  assert.equal(validarNovaSenha('antiga', 'novaSenha8', 'outraSenha8').valido, false);
  assert.equal(validarNovaSenha('mesmaSenha8', 'mesmaSenha8', 'mesmaSenha8').valido, false);
  assert.equal(validarNovaSenha('antigaSenha', 'novaSenha8', 'novaSenha8').valido, true);
});
