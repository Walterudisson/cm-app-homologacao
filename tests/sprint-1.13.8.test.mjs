import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const [app, html, css, worker, regras] = await Promise.all([
  readFile(new URL('app.js', raiz), 'utf8'),
  readFile(new URL('index.html', raiz), 'utf8'),
  readFile(new URL('app.css', raiz), 'utf8'),
  readFile(new URL('service-worker.js', raiz), 'utf8'),
  readFile(new URL('../../cm-app-v1.13.9-internal/firestore.rules', import.meta.url), 'utf8')
]);

test('integra Driver.js de forma versionada e disponível no PWA', () => {
  assert.match(html, /driver\.js@1\.5\.0\/dist\/driver\.css/);
  assert.match(html, /driver\.js@1\.5\.0\/dist\/driver\.js\.iife\.js/);
  assert.match(worker, /cdn\.jsdelivr\.net/);
  assert.match(css, /\.driver-popover\.cmapp-tutorial/);
});

test('tutorial é exclusivo do Conferente e não executa gravações patrimoniais', () => {
  assert.match(app, /usuarioLogado\?\.perfil !== 'conferente'/);
  assert.match(app, /disableActiveInteraction: true/);
  assert.match(app, /Nenhum patrimônio será alterado durante o tutorial/);
  assert.doesNotMatch(app.match(/function passosTutorialConferente\(\)[\s\S]*?\n    }\n\n    async function iniciarTutorialConferente/)?.[0] || '', /updateDoc|writeBatch|btn-salvar\.click/);
});

test('tutorial inicia, pausa, retoma, conclui e pode ser revisto', () => {
  ['tutorialConferenteV1Etapa', 'tutorialConferenteV1Concluido', 'tutorialConferenteV1Adiado']
    .forEach(campo => assert.match(app, new RegExp(campo)));
  assert.match(app, /botao\.textContent = 'Pular'/);
  assert.match(app, /filaSalvamentoTutorial = filaSalvamentoTutorial/);
  assert.match(app, /const etapaSalva = usuarioLogado\.tutorialConferenteV1Adiado === true/);
  assert.match(app, /REVER TUTORIAL/);
  assert.match(app, /CONTINUAR TUTORIAL/);
  assert.match(html, /id="btn-iniciar-tutorial"/);
  assert.match(regras, /atualizacaoProprioUsuarioValida/);
});

test('cards de usuários funcionam como filtros sincronizados', () => {
  ['todos', 'ativos', 'inativos', 'conferentes'].forEach(card => {
    assert.match(html, new RegExp(`data-users-card=["']${card}["']`));
  });
  assert.match(app, /aplicarFiltroCardUsuarios/);
  assert.match(app, /sincronizarFiltrosUsuarios/);
  assert.match(app, /cardUsuarioCorrespondente/);
  assert.match(css, /\.users-stats button\.is-selected/);
});
