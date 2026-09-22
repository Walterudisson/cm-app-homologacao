import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarPaginaIntercalada } from '../js/core/paginacao.js';

function prepararFontes(idsPorFonte) {
  return idsPorFonte.map(ids => ({
    ids,
    cursor: null,
    buffer: [],
    esgotada: false
  }));
}

async function proximaPagina(fontes, tamanhoPagina, incluirItem) {
  return carregarPaginaIntercalada({
    fontes,
    tamanhoPagina,
    incluirItem,
    carregarLote: async fonte => {
      const inicio = fonte.cursor === null ? 0 : fonte.ids.indexOf(fonte.cursor.id) + 1;
      const itens = fonte.ids.slice(inicio, inicio + Math.ceil(tamanhoPagina / fontes.length)).map(id => ({ id }));
      return {
        itens,
        cursor: itens.at(-1) || fonte.cursor,
        esgotada: inicio + itens.length >= fonte.ids.length
      };
    }
  });
}

test('intercala divisões sem repetir documentos compartilhados e mantém páginas de 50', async () => {
  const fonteA = Array.from({ length: 70 }, (_, i) => String(i * 2).padStart(3, '0'));
  const fonteB = Array.from({ length: 70 }, (_, i) => String(i * 2 + 1).padStart(3, '0'));
  const fontes = prepararFontes([fonteA, fonteB, ['005', '050', '100', '150']]);
  const primeira = await proximaPagina(fontes, 50);
  const segunda = await proximaPagina(fontes, 50);
  assert.equal(primeira.pagina.length, 50);
  assert.equal(segunda.pagina.length, 50);
  assert.equal(primeira.pagina[0].id, '000');
  assert.equal(primeira.pagina.at(-1).id, '049');
  assert.equal(segunda.pagina[0].id, '050');
  assert.equal(new Set([...primeira.pagina, ...segunda.pagina].map(item => item.id)).size, 100);
  assert.equal(segunda.temMais, true);
});

test('continua consultando até preencher a página quando o status descarta resultados', async () => {
  const fontes = prepararFontes([
    Array.from({ length: 90 }, (_, i) => String(i).padStart(3, '0')),
    Array.from({ length: 90 }, (_, i) => String(i + 90).padStart(3, '0'))
  ]);
  const resultado = await proximaPagina(fontes, 50, item => Number(item.id) % 2 === 0);
  assert.equal(resultado.pagina.length, 50);
  assert.equal(resultado.pagina[0].id, '000');
  assert.equal(resultado.pagina.at(-1).id, '098');
});

test('última página esgota as fontes sem criar documentos extras', async () => {
  const fontes = prepararFontes([['001', '003'], ['002', '003']]);
  const resultado = await proximaPagina(fontes, 50);
  assert.deepEqual(resultado.pagina.map(item => item.id), ['001', '002', '003']);
  assert.equal(resultado.temMais, false);
});

test('origens históricas fora do escopo não criam página vazia nem escondem o destino', async () => {
  const fontes = prepararFontes([
    Array.from({ length: 120 }, (_, i) => String(i).padStart(3, '0'))
  ]);
  const itemNoDestino = item => Number(item.id) >= 60;
  const primeira = await proximaPagina(fontes, 50, itemNoDestino);
  const segunda = await proximaPagina(fontes, 50, itemNoDestino);
  assert.equal(primeira.pagina.length, 50);
  assert.equal(primeira.pagina[0].id, '060');
  assert.equal(primeira.pagina.at(-1).id, '109');
  assert.deepEqual(segunda.pagina.map(item => item.id),
    Array.from({ length: 10 }, (_, i) => String(i + 110)));
  assert.equal(segunda.temMais, false);
});
