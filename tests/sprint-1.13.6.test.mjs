import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chaveInventarioDivisao } from '../js/core/inventario-id.js';

const ler = arquivo => readFile(new URL(`../${arquivo}`, import.meta.url), 'utf8');

test('gera IDs estáveis e sem barras para nomes institucionais de divisão', () => {
  assert.equal(
    chaveInventarioDivisao('SEAP/GS/DG/DETO/REMANEJAMENTOVEICULO'),
    'SEAP%2FGS%2FDG%2FDETO%2FREMANEJAMENTOVEICULO'
  );
  assert.equal(chaveInventarioDivisao('CM - DTA'), 'CM - DTA');
  assert.equal(chaveInventarioDivisao('A%2FB/C'), 'A%252FB%2FC');
  assert.throws(() => chaveInventarioDivisao('  '), /Nome da divisão inválido/);
});

test('mantém o percentual dentro do card e sinaliza inventários encerrados', async () => {
  const [app, css] = await Promise.all([ler('app.js'), ler('app.css')]);
  assert.match(app, /inventario-card-header/);
  assert.match(app, /inventario-ribbon hidden/);
  assert.match(app, /estado\.estado === 'encerrado'/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /\.inventario-nome[^}]+overflow-wrap: anywhere/);
  assert.match(css, /\.inventario-ribbon[^}]+linear-gradient\(180deg, #10b981, #047857\)/);
  assert.match(css, /\.inventario-ribbon svg/);
});

test('move a manutenção do próprio usuário para Meu perfil', async () => {
  const [html, app] = await Promise.all([ler('index.html'), ler('app.js')]);
  assert.match(html, /id="form-meu-nome"/);
  assert.match(app, /if \(u\.uid === usuarioLogado\.uid\) return false/);
  assert.match(app, /Altere seus próprios dados na tela Meu perfil/);
});

test('oferece alternância acessível em todos os campos de senha', async () => {
  const [app, css] = await Promise.all([ler('app.js'), ler('app.css')]);
  assert.match(app, /querySelectorAll\('input\[type="password"\]'\)/);
  assert.match(app, /aria-pressed/);
  assert.match(css, /\.password-toggle/);
});
