import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  prepararSugestaoDestino,
  prepararResolucaoSugestaoDestino
} from '../js/core/movimentacao.js';

const raiz = new URL('../', import.meta.url);
const [app, html, regras] = await Promise.all([
  readFile(new URL('app.js', raiz), 'utf8'),
  readFile(new URL('index.html', raiz), 'utf8'),
  readFile(new URL('../../cm-app-v1.13.9-internal/firestore.rules', import.meta.url), 'utf8')
]);

const item = {
  plaqueta: '990000001',
  divisaoOrigem: 'CM - ORIGEM',
  localizacaoAtual: 'CM - ORIGEM',
  localizado: false,
  statusTransferencia: 'concluido',
  historico: []
};
const conferente = { uid: 'conf-1', perfil: 'conferente', nome: 'Conferente HML', email: 'conf@teste.gov.br' };
const gestor = { uid: 'gest-1', perfil: 'gestor', nome: 'Gestor HML', email: 'gestor@teste.gov.br' };
const dataHora = '23/09/2026 10:00:00';

test('Conferente sugere destino sem localizar nem mover o patrimônio', () => {
  const atualizacao = prepararSugestaoDestino({ item, destino: 'CM - DESTINO', usuario: conferente, dataHora });
  assert.equal(atualizacao.sugestaoDestinoStatus, 'pendente');
  assert.equal(atualizacao.sugestaoDestinoDivisao, 'CM - DESTINO');
  assert.equal(atualizacao.sugestaoDestinoPor.uid, conferente.uid);
  assert.equal(Object.hasOwn(atualizacao, 'localizado'), false);
  assert.equal(Object.hasOwn(atualizacao, 'localizacaoAtual'), false);
  assert.equal(atualizacao.historico.at(-1).acao, 'destino_sugerido');
});

test('aprovação muda o destino administrativo mas mantém a conferência pendente', () => {
  const sugestao = prepararSugestaoDestino({ item, destino: 'CM - DESTINO', usuario: conferente, dataHora });
  const atualizacao = prepararResolucaoSugestaoDestino({
    item: { ...item, ...sugestao }, usuario: gestor, decisao: 'aprovar', dataHora
  });
  assert.equal(atualizacao.localizacaoAtual, 'CM - DESTINO');
  assert.equal(atualizacao.localizado, false);
  assert.equal(atualizacao.sugestaoDestinoStatus, 'aprovada');
});

test('rejeição mantém a localização anterior', () => {
  const sugestao = prepararSugestaoDestino({ item, destino: 'CM - DESTINO', usuario: conferente, dataHora });
  const atualizacao = prepararResolucaoSugestaoDestino({
    item: { ...item, ...sugestao }, usuario: gestor, decisao: 'rejeitar', dataHora
  });
  assert.equal(Object.hasOwn(atualizacao, 'localizacaoAtual'), false);
  assert.equal(atualizacao.localizado, false);
  assert.equal(atualizacao.sugestaoDestinoStatus, 'rejeitada');
});

test('interface e fila distinguem sugestão de transferência física', () => {
  assert.match(html, /id="btn-sugerir-destino"/);
  assert.match(html, /id="modal-sugerir-destino"/);
  assert.match(html, /Fila de Aprovação de Movimentações/);
  assert.match(app, /tipoSolicitacaoFila: 'sugestao_destino'/);
  assert.match(app, /aprovarSugestaoDestino/);
  assert.match(app, /sem conferência física/);
});

test('regras autorizam criação e resolução estritas da sugestão', () => {
  assert.match(regras, /function sugestaoDestinoValida\(\)/);
  assert.match(regras, /function resolucaoSugestaoDestinoValida\(\)/);
  assert.match(regras, /sugestaoDestinoPor\.uid == request\.auth\.uid/);
  assert.match(regras, /request\.resource\.data\.localizado == false/);
});
