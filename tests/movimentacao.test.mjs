import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararAtualizacaoPatrimonio, prepararResolucaoTransferencia } from '../js/core/movimentacao.js';

const perfis = ['conferente', 'gestor', 'admin'];
const item = {
  plaqueta: '12345',
  divisaoOrigem: 'SALA VIP',
  localizacaoAtual: 'SALA VIP',
  statusTransferencia: 'concluido',
  historico: []
};

function usuario(perfil) {
  return { perfil, nome: 'Pessoa Teste', email: 'pessoa@example.com' };
}

function leitura(perfil, origem = item, destino = 'DA') {
  return prepararAtualizacaoPatrimonio({
    item: origem,
    localizacaoDestino: destino,
    usuario: usuario(perfil),
    metodoLocalizacao: 'digitacao',
    dataHora: '21/09/2026 12:00:00'
  });
}

for (const perfil of perfis) {
  test(`mudança de divisão por ${perfil} aguarda aprovação sem alterar o local atual`, () => {
    const resultado = leitura(perfil);
    assert.equal(resultado.houveMudanca, true);
    assert.equal(resultado.dadosAtualizacao.statusTransferencia, 'pendente');
    assert.equal(resultado.dadosAtualizacao.divisaoDestinoSugerida, 'DA');
    assert.equal(resultado.dadosAtualizacao.localizacaoAtual, undefined);
    assert.equal(resultado.dadosAtualizacao.historico.at(-1).acao, 'transferencia_solicitada');
  });

  test(`leitura na mesma divisão por ${perfil} conclui a conferência`, () => {
    const resultado = leitura(perfil, item, 'SALA VIP');
    assert.equal(resultado.houveMudanca, false);
    assert.equal(resultado.dadosAtualizacao.localizacaoAtual, 'SALA VIP');
    assert.equal(resultado.dadosAtualizacao.statusTransferencia, 'concluido');
    assert.equal(resultado.dadosAtualizacao.divisaoDestinoSugerida, '');
    assert.equal(resultado.dadosAtualizacao.historico.at(-1).acao, 'conferencia');
  });

  test(`transferência já pendente bloqueia nova leitura por ${perfil}`, () => {
    const pendente = { ...item, statusTransferencia: 'pendente', divisaoDestinoSugerida: 'DA' };
    assert.throws(() => leitura(perfil, pendente), /aguardando aprovação/);
  });
}

test('aprovação na Fila promove o destino e rejeição mantém o local anterior', () => {
  const solicitacao = leitura('gestor').dadosAtualizacao;
  const pendente = { ...item, ...solicitacao };
  const dados = { item: pendente, usuario: usuario('admin'), dataHora: '21/09/2026 12:01:00' };
  const aprovacao = prepararResolucaoTransferencia({ ...dados, decisao: 'aprovar' }).dadosAtualizacao;
  const rejeicao = prepararResolucaoTransferencia({ ...dados, decisao: 'rejeitar' }).dadosAtualizacao;
  assert.equal(aprovacao.localizacaoAtual, 'DA');
  assert.equal(aprovacao.statusTransferencia, 'aprovado');
  assert.equal(rejeicao.localizacaoAtual, 'SALA VIP');
  assert.equal(rejeicao.statusTransferencia, 'rejeitado');
  assert.equal(aprovacao.divisaoDestinoSugerida, '');
  assert.equal(rejeicao.divisaoDestinoSugerida, '');
  assert.equal(pendente.localizacaoAtual, 'SALA VIP');
});

test('resolução exige pendência e perfil validador', () => {
  const dados = { item, usuario: usuario('gestor'), decisao: 'aprovar', dataHora: '21/09/2026 12:01:00' };
  assert.throws(() => prepararResolucaoTransferencia(dados), /não está mais pendente/);
  const pendente = { ...item, ...leitura('conferente').dadosAtualizacao };
  assert.throws(() => prepararResolucaoTransferencia({ ...dados, item: pendente, usuario: usuario('conferente') }), /Somente perfis validadores/);
});

test('documento legado sem localizacaoAtual usa a origem até a aprovação', () => {
  const legado = { divisao: 'SALA VIP', historico: [] };
  const solicitacao = leitura('admin', legado);
  assert.equal(solicitacao.localizacaoAnterior, 'SALA VIP');
  assert.equal(Object.hasOwn(solicitacao.dadosAtualizacao, 'localizacaoAtual'), false);
  const aprovacao = prepararResolucaoTransferencia({
    item: { ...legado, ...solicitacao.dadosAtualizacao },
    usuario: usuario('gestor'),
    decisao: 'aprovar',
    dataHora: '21/09/2026 12:01:00'
  });
  assert.equal(aprovacao.dadosAtualizacao.localizacaoAtual, 'DA');
});

test('a origem da leitura é preservada junto ao responsável, inclusive em transferência pendente', () => {
  for (const [metodo, destino] of [
    ['codigo_barras', 'SALA VIP'], ['ocr', 'DA'], ['digitacao', 'DA']
  ]) {
    const dados = prepararAtualizacaoPatrimonio({
      item,
      localizacaoDestino: destino,
      usuario: usuario('conferente'),
      metodoLocalizacao: metodo,
      dataHora: '21/09/2026 12:00:00'
    }).dadosAtualizacao;
    assert.equal(dados.historico.at(-1).metodoLocalizacao, metodo);
    assert.equal(dados.historico.at(-1).responsavel, 'Pessoa Teste (pessoa@example.com)');
    assert.equal(dados.statusTransferencia, destino === 'DA' ? 'pendente' : 'concluido');
  }
  assert.throws(() => prepararAtualizacaoPatrimonio({
    item, localizacaoDestino: 'DA', usuario: usuario('gestor'),
    metodoLocalizacao: 'desconhecido', dataHora: '21/09/2026 12:00:00'
  }), /como a plaqueta foi localizada/);
});
