import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
export function conferirVersao(html, worker) {
  const versao = html.match(/v(\d+\.\d+\.\d+-H\.\d+) • HOMOLOGAÇÃO/)?.[1];
  assert.ok(versao, 'Identificação da release HML ausente');
  assert.ok(html.includes('v'+versao+' · HOMOLOGAÇÃO'));
  assert.ok(html.includes('<span>v'+versao+'</span>'));
  for (const arquivo of ['app.css','app.js']) assert.ok(html.includes(arquivo+'?v='+versao.toLowerCase()), arquivo);
  const sw = worker.match(/const VERSAO = '(v\d+\.\d+\.\d+-h\.\d+)(?:-[^']+)?';/)?.[1];
  assert.equal(sw, 'v'+versao.toLowerCase());
  return versao;
}
export async function conferirVersaoAtual() {
  const [html, worker] = await Promise.all(['index.html','service-worker.js'].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));
  return conferirVersao(html,worker);
}
