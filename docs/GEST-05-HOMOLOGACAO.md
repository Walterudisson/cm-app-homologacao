# GEST-05 | QA integrado e estabilização HML

**Candidata:** `v1.13.48-H.1` · **Data:** 21/11/2026. **Escopo:** frontend HML, correções de segurança de sessão, suíte automatizada Node e roteiro manual.

## Objetivo

Estabilizar as funcionalidades já integradas (GEST-01 a GEST-04, Gabinete GAB-09, DSIPS e Patrimônios) antes de pedir autorização específica de backend. Esta sprint **não habilita novas permissões** e não publica em PRD.

## Correções e infraestrutura entregues

1. **Identidade confiável:** `usuarioLogado` é composto de dados do documento e, por último, `uid` e `email` realmente informados por Firebase Auth. Dados legados de `usuarios/{uid}` não podem sobrescrever o identificador autenticado no objeto da sessão.
2. **Fim de sessão GEST-04:** ao sair ou perder acesso, limpar os quatro KPIs, a lista, busca/filtros, abas e o texto agregado de `pessoaId`. Os textos da sessão anterior não permanecem no DOM.
3. **Fotos de perfil:** após a espera pelo avatar, só alterar a ficha se UID autenticado, época da sessão, usuário detalhado e modal aberto ainda forem os mesmos. Resposta tardia de outra sessão não repovoa a ficha.
4. **Teste integrado:** `tests/gestao-qa-integrada.test.mjs` verifica identidade, permissão negativa, assinatura de acesso, rotação de sessão, versão do shell/PWA, HTML único, arquivos do precache e ausência de chamadas remotas nas projeções.
5. **Testes DOM:** `tests/gestao-pessoas-ui.test.mjs` foi reforçado para limpar totalmente os agregados e impedir interpretação de HTML nos nomes.
6. **Rotina reproduzível:** `npm run check:gestao` roda verificação de parsing do app e a suite `tests/gestao-*.test.mjs` em Node 22. `package.json` de teste contém `jsdom` como dependência de desenvolvimento, sem efeito no GitHub Pages.
7. **GitHub Actions:** `.github/workflows/qa-gestao-hml.yml` roda em PR/main e manualmente. Permissão somente de leitura, sem acesso a credenciais, sem execução de Functions e sem deploy. **Uma execução verde no CI só pode ser afirmada após conferir o resultado do workflow.**

## Verificações manuais priorizadas

| ID | Procedimento | Resultado esperado |
|---|---|---|
| GEST-05-01 | Abrir HML pelo Chrome fora do PWA | Versão `v1.13.48-H.1`, sem erro inicial |
| 02 | Login com superadmin | ENTRAR habilitado e Central de Trabalho carregada |
| 03 | Recarregar com sessão ativa | Login/rotas intactos |
| 04 | Gestão > Pessoas e vínculos | KPIs, filtros, divisões e pendências funcionando |
| 05 | Abrir usuário pela ficha de vínculos | Cadastro original do usuário, sem formulário duplicado |
| 06 | Abrir divisão pela ficha de vínculos | Cadastro original, responsáveis e status mantidos |
| 07 | Sair após abrir Pessoas e vínculos | Nenhum registro, texto estatístico ou avatar permanece |
| 08 | Entrar com outro usuário após sair | Exibe somente dados permitidos à nova sessão |
| 09 | Login Gestor | Nova rota Pessoas e vínculos não aparece |
| 10 | Login Conferente | Nova rota Pessoas e vínculos inacessível |
| 11 | Conta desativada (caso de teste controlado) | Acesso rejeitado conforme lógica legada |
| 12 | Matriz de funções GEST-01 | Consultiva, filtros sem alterar concessões |
| 13 | Editor GEST-02 | Prévia de diferenças, confirmação cancelável sem gravação |
| 14 | Gestão de usuários GEST-03 | Filtro de função e prévia do perfil/divisões funcionando |
| 15 | Divisão com responsável apenas por nome | Pendência, sem vinculação por coincidência |
| 16 | Dados de pessoa sem `pessoaId` | “Somente UID”, sem geração de identificador |
| 17 | Gabinete > Agenda | Pesquisa e ficha demonstrativa intactas; acesso expresso preservado |
| 18 | Gabinete > Cadastros | CRUD em memória, sem gravação real; dados fictícios apenas |
| 19 | Gabinete > Ramais e aniversários | Filtros, retorno Android e preferências preservados |
| 20 | DSIPS > Painel | KPIs, opções e navegação operacional intactos |
| 21 | DSIPS > Cautelas/Devolução/Posse | Responsáveis por UID, status e ações existentes intactas |
| 22 | Patrimônios > Painel/Fila/Inventários | Regressões principais intactas |
| 23 | PWA Android após aceitar atualização | Cache `v1.13.48-h.1-gest05` ativo e login funcional |
| 24 | Android com teclado aberto | Busca, cards, confirmação e modais acessíveis |
| 25 | Tema claro/escuro/automático | Informações legíveis sem sobreposição |
| 26 | Perdendo rede e voltando no PWA | Sem tela branca ou fallback inconsistente |
| 27 | GitHub Actions no PR | Suite de Gestão verde, sem deploy |
| 28 | Regressão no login durante navegação entre módulos | Nenhum JS `ReferenceError` bloqueia a tela |

**Não usar credenciais, nomes verdadeiros, dados do efetivo nem telefones particulares em evidências públicas.** Usar contas e dados de teste e registrar apenas IDs de cenários e status.

## Aceite e limites

- CI verde é condição necessária, mas **não substitui homologação autenticada** de Android/desktop/PWA nem revisão do Firebase Rules.
- Qualquer falha de login, vazamento de sessão ou permissão negativa bloqueia a promoção.
- HML integrado à branch principal não significa que a publicação do GitHub Pages já foi verificada.
- Só declarar uma versão homologada após conferência do usuário. Só promover para PRD mediante ordem específica.
- A sprint não implementa `pessoas/{pessoaId}`, novos escopos de permissão, regras Firebase, Functions, migração, importação RH ou persistência real do Gabinete.

## Após a GEST-05

A próxima decisão técnica é a **autorização específica de backend HML**, com prioridade em BE-01 (enforcement da matriz) e BE-02 (identidade institucional), seguindo [BACKLOG-BACKEND-CMAPP.md](./BACKLOG-BACKEND-CMAPP.md).

**Status de homologação:** PENDENTE até execução da interface real e aceite expresso.
