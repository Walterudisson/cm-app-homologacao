import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const [html, manifestoTexto, serviceWorker, pwa, feedback] = await Promise.all([
  readFile(new URL('index.html', raiz), 'utf8'),
  readFile(new URL('manifest.webmanifest', raiz), 'utf8'),
  readFile(new URL('service-worker.js', raiz), 'utf8'),
  readFile(new URL('js/pwa.js', raiz), 'utf8'),
  readFile(new URL('js/ui/feedback.js', raiz), 'utf8')
]);
const manifesto = JSON.parse(manifestoTexto);

test('o manifesto identifica o CM APP em modo standalone', () => {
  assert.equal(manifesto.name, 'CM APP HOMOLOGAÇÃO');
  assert.equal(manifesto.short_name, 'CM HOMOLOG');
  assert.equal(manifesto.display, 'standalone');
  assert.equal(manifesto.start_url, './');
  assert.equal(manifesto.scope, './');
});

test('o manifesto fornece ícones comuns e maskable', async () => {
  const tamanhos = manifesto.icons.map(icone => icone.sizes);
  assert.ok(tamanhos.includes('192x192'));
  assert.ok(tamanhos.includes('512x512'));
  assert.ok(manifesto.icons.some(icone => icone.purpose === 'maskable'));
  await Promise.all(manifesto.icons.map(icone => access(new URL(icone.src, raiz))));
});

test('o shell declara manifesto, ícone Apple e estados de conexão', () => {
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /id="app-offline-banner"/);
  assert.match(html, /id="login-offline"/);
});

test('o service worker mantém cache versionado e não intercepta gravações', () => {
  assert.match(serviceWorker, /cmapp-shell-\$\{VERSAO\}/);
  assert.match(serviceWorker, /requisicao\.method !== 'GET'/);
  assert.match(serviceWorker, /requisicao\.mode === 'navigate'/);
  assert.doesNotMatch(serviceWorker, /firestore\.googleapis\.com|googleapis\.com/);
});

test('a instalação e a atualização dependem de decisão explícita do usuário', () => {
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /evento\.prompt\(\)/);
  assert.match(pwa, /ATIVAR_ATUALIZACAO/);
  assert.match(pwa, /controllerchange/);
  assert.match(feedback, /acaoTexto/);
  assert.match(feedback, /aoAcao/);
});

test('a Sprint 1.2 não solicita notificações push', () => {
  assert.doesNotMatch(pwa, /Notification\.requestPermission|getToken|getMessaging/);
  assert.doesNotMatch(serviceWorker, /firebase-messaging|onBackgroundMessage/);
});
