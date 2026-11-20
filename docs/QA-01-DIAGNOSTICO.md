# QA-01 — Diagnóstico das 16 falhas legadas
Base HML: 717a10755ea3cc6da4982fff667498d6a0b1575c (v1.13.34-H.1). Pages 44664969632 concluído com sucesso. Execução 44664924114: 247 registros na suíte geral, 231 aprovados, 16 falhas, 119/119 na rotina obrigatória. Sem novas falhas.
Não alterar backend, Rules, índices, dados persistidos ou PRD até autorização. QA-01 diagnostica; QA-02 corrige após avaliação, preservando cobertura e sem reduzir artificialmente os números.

## Inventário
| ID | Teste/arquivo | Diagnóstico estático | Encaminhamento |
|---|---|---|---|
| QA-01 | escopo: atualização PWA | Versão fixa 1.16.1-h.1, arquivo escopo presente no shell | Contrato de versão consistente entre HTML, SW e JS |
| QA-02 | estrutura: versão da interface | Espera 1.16.1-H.1, versão real 1.13.34-H.1 | Verificar versão atual coerente, sem remover identificação HML |
| QA-03 | hml-entrada-unica-v2: cache e script | Espera 1.16.1-h.2 | Contrato de versão consistente |
| QA-04 | hml-recuperacao-1.13.11: recuperação | Espera hash/versionamento histórico de recuperação; manter login, configuração HML e isolamento V2 | Atualizar invariantes válidas; preservar referência histórica |
| QA-05 | estrutura: toasts e sidebar | CSS usa --hml-banner-height + --topbar-height; hover/focus-within presente | Testar posição e navegação atuais e validar visual |
| QA-06 | sprint-2: faixa HML | Antiga classe hml-env e --env-banner-height substituídas por cmapp-hml-banner e --hml-banner-height; sidebar/topbar reservam altura | Teste do layout real; não afirmar PRD testado |
| QA-07 | dsips: seções/menu/PWA | Espera controller.js e model.js no shell, agora controllers por tela e materiais legado/unificação | Verificar imports efetivamente usados, todos os destinos e funcionalidades; preservar legado onde aplicável |
| QA-08 | modulos: arquivos shell/imports | pages.js da plataforma e Patrimônios existem, ausentes na lista de precache | Verificar se alcançáveis no grafo ativo; incluir dependências reais ou testar adaptadores como legado, sem fingir que precache existe |
| QA-09 | sprint-2: bootstrap/acessos | Condição antiga de listener mudou; login atual restringe inicialização da fila por perfil e módulo, mas não há listener de alterações no documento do usuário; alternarAba não aplica guarda central de todas as páginas | Prioridade alta: corrigir defensivamente frontend e testar remoção de acesso, rotas diretas e reset de sessão; autorização efetiva do servidor não verificada |
| QA-10 | cautelas-ui.test.mjs | JSDOM resolvido via functions/package.json interno; controller e IDs antigos | Porta de testes de DOM/serviços injetados para UI ativa, dependência dev controlada; preservar cenários |
| QA-11 | dsips-ui.test.mjs | Mesmo JSDOM externo e controller antigo | Porta de testes, preservar validações e XSS |
| QA-12 | proposta-acessos.test.mjs | Mesmo JSDOM externo; HTML de proposta presente | Dependência dev independente, testes da proposta sem confundir com produção |
| QA-13 | sprint-1.13.7-h1.test.mjs | Requer storage.rules e firebase.json externos | Separar asserções frontend de validações internas; últimas suspensas, sem mascarar falha |
| QA-14 | sprint-1.13.7.test.mjs | Requer firestore.rules e functions/index.js externos | Idem; manter teste de autorização backend bloqueado |
| QA-15 | sprint-1.13.8.test.mjs | Requer firestore.rules externo | Separar tutorial/cards de regras |
| QA-16 | sprint-1.13.9.test.mjs | Requer firestore.rules externo | Separar movimentações/fluxos de regras; revisar expectativa antiga de login |

Os 7 arquivos inteiros interrompidos contêm múltiplos testes. Portanto os 247 registros TAP não representam toda a cobertura pretendida. Não contar arquivo interrompido como caso unitário completo. Não criar Rules fictícias, não remover cenários nem converter indiscriminadamente para skip. Caso o material interno não esteja disponível, registrar separadamente como não executado, com autorização prévia para modificar a política de CI.
## Prioridades QA-02
1. Segurança de navegação e mudança de acesso (frontend): investigar e corrigir, teste de sessão/rotas e dados antigos. Nenhuma alegação de permissões indevidas efetivas sem Rules e testes HML.
2. Contratos de versão, shell/PWA e layout, com testes sem amarrar a releases obsoletas.
3. Restaurar execução dos testes de UI com DOM e serviços simulados, migrar cenários para componentes ativos; validar desktop/Android em HML.
4. Separar e conservar as verificações de backend que dependem da fonte interna (suspensas até autorização).
5. Reavaliar os 16 registros pela suíte geral e homologação integrada. Produção somente com autorização específica.
