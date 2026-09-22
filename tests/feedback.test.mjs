import test from 'node:test';
import assert from 'node:assert/strict';

import { inferirTipoNotificacao } from '../js/ui/feedback.js';

test('prioriza sucesso quando a mensagem também menciona pendentes', () => {
  assert.equal(
    inferirTipoNotificacao('Sucesso! 12 itens foram retornados para pendentes.'),
    'sucesso'
  );
  assert.equal(
    inferirTipoNotificacao('Item retornado para pendente com sucesso.'),
    'sucesso'
  );
});

test('classifica conflitos e validações como aviso', () => {
  assert.equal(inferirTipoNotificacao('Este e-mail já está cadastrado no sistema.'), 'aviso');
  assert.equal(inferirTipoNotificacao('A senha deve conter pelo menos 6 caracteres.'), 'aviso');
  assert.equal(inferirTipoNotificacao('Mudança de localização enviada para aprovação.'), 'aviso');
  assert.equal(inferirTipoNotificacao('Patrimônio não encontrado.'), 'aviso');
});

test('mantém falhas e acessos negados como erro', () => {
  assert.equal(inferirTipoNotificacao('Erro ao salvar os dados.'), 'erro');
  assert.equal(inferirTipoNotificacao('Acesso negado para esta operação.'), 'erro');
});
