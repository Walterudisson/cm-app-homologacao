import test from 'node:test';
import assert from 'node:assert/strict';
import {
  situacaoPatrimonio,
  divisoesVisiveisPatrimonio,
  patrimonioVisivelParaDivisoes,
  correspondeSituacaoPatrimonio,
  contarSituacoesPatrimonio,
  descontarItensForaDoEscopo,
  resumirProgressoDivisao
} from '../js/core/relacao.js';

const transferencia = {
  plaqueta: '1',
  divisaoOrigem: 'SALA VIP',
  localizacaoAtual: 'SALA VIP',
  divisaoDestinoSugerida: 'DA',
  localizado: true,
  statusTransferencia: 'pendente'
};

test('leitura em outra divisão fica aguardando aprovação mesmo com localizado true', () => {
  assert.equal(situacaoPatrimonio(transferencia), 'aguardando');
  assert.equal(correspondeSituacaoPatrimonio(transferencia, 'localizados'), false);
  assert.equal(correspondeSituacaoPatrimonio(transferencia, 'aguardando'), true);
  assert.deepEqual(contarSituacoesPatrimonio([transferencia]), {
    total: 1, localizados: 0, pendentes: 0, aguardando: 1
  });
});

test('conferente da origem ou do destino sugerido pode acompanhar a pendência', () => {
  assert.equal(patrimonioVisivelParaDivisoes(transferencia, ['SALA VIP']), true);
  assert.equal(patrimonioVisivelParaDivisoes(transferencia, ['DA']), true);
  assert.equal(patrimonioVisivelParaDivisoes(transferencia, ['TERCEIRA']), false);
  assert.equal(divisoesVisiveisPatrimonio(transferencia).filter(divisao => divisao === 'SALA VIP').length, 1);
});

test('destino rejeitado deixa de conceder visibilidade e retorno ao local mantém classificação', () => {
  const rejeitado = { ...transferencia, statusTransferencia: 'rejeitado', divisaoDestinoSugerida: '' };
  assert.equal(situacaoPatrimonio(rejeitado), 'localizados');
  assert.equal(patrimonioVisivelParaDivisoes(rejeitado, ['DA']), false);
  assert.equal(patrimonioVisivelParaDivisoes(rejeitado, ['SALA VIP']), true);
});

test('aprovação transfere o escopo atual ao destino sem duplicar o total', () => {
  const aprovado = { ...transferencia, statusTransferencia: 'aprovado', localizacaoAtual: 'DA', divisaoDestinoSugerida: '' };
  assert.equal(situacaoPatrimonio(aprovado), 'localizados');
  assert.equal(patrimonioVisivelParaDivisoes(aprovado, ['DA']), true);
  assert.equal(patrimonioVisivelParaDivisoes(aprovado, ['SALA VIP']), false);
  assert.deepEqual(divisoesVisiveisPatrimonio(aprovado), ['DA']);
  assert.deepEqual(contarSituacoesPatrimonio([transferencia, aprovado]), {
    total: 2, localizados: 1, pendentes: 0, aguardando: 1
  });
});

test('nova conferência no destino preserva somente o escopo efetivo, mesmo com origem histórica', () => {
  const reconferido = { ...transferencia, statusTransferencia: 'concluido',
    localizacaoAtual: 'DA', divisaoDestinoSugerida: '' };
  assert.equal(patrimonioVisivelParaDivisoes(reconferido, ['SALA VIP']), false);
  assert.equal(patrimonioVisivelParaDivisoes(reconferido, ['DA']), true);
});

test('itens legados sem local atual permanecem na divisão de origem', () => {
  assert.deepEqual(divisoesVisiveisPatrimonio({ divisaoOrigem: 'SALA VIP', divisao: 'DADOS' }), ['SALA VIP']);
  assert.deepEqual(divisoesVisiveisPatrimonio({ divisao: 'DADOS' }), ['DADOS']);
});

test('contagens por divisão removem transferidos sem mexer no total global', () => {
  const aprovado = { ...transferencia, statusTransferencia: 'aprovado',
    localizacaoAtual: 'DA', divisaoDestinoSugerida: '' };
  const origemComPendenciaETransferenciaAprovada =
    descontarItensForaDoEscopo({ total: 2, localizados: 1, pendentes: 0, aguardando: 1 }, [aprovado]);
  assert.deepEqual(origemComPendenciaETransferenciaAprovada,
    { total: 1, localizados: 0, pendentes: 0, aguardando: 1 });
});

test('destino aguardando aprovação informa entrada sem antecipar progresso', () => {
  assert.deepEqual(resumirProgressoDivisao({ total: 101, localizados: 76, aguardando: 6 }, 1), {
    total: 100, localizados: 76, pendentes: 19, aguardando: 5, entradas: 1, percentual: 76
  });
  assert.deepEqual(resumirProgressoDivisao({ total: 1, localizados: 0, aguardando: 1 }, 1), {
    total: 0, localizados: 0, pendentes: 0, aguardando: 0, entradas: 1, percentual: 0
  });
});
