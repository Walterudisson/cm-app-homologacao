# GEST-04 | Homologação de Pessoas e vínculos

**Candidata:** `v1.13.47-H.1` · **Ambiente:** HML · **Estado:** testes de código em andamento; homologação autenticada pendente.

## Entrega

A tela **Gestão > Pessoas e vínculos** (somente administradores autorizados) consolida em memória as fontes legadas **`usuarios` e `divisoes`**, sem criar novos documentos.

- Cards de contas, divisões, responsabilidades identificadas por UID e referências para revisão.
- Abas **Contas / Divisões / Pendências** e filtros, busca e listagem incremental em blocos de 12.
- Contas mostram se possuem `pessoaId` explicitamente informado ou ainda usam apenas `uid`; qualquer `pessoaId` é **não validado** nesta fase.
- Divisões indicam responsável principal/substituto, UID encontrado ou pendências como referência somente por nome, conta inativa, UID ausente, nome histórico divergente ou mesma pessoa como principal/substituto.
- Pistas de possível duplicidade são apenas **alertas** para análise, sem vincular ou mesclar.
- Botões reaproveitam cadastros existentes de Usuários e Divisões, sem criar edição duplicada.
- A UI **não consulta RH, Agenda privada do Gabinete ou cautelas DSIPS**. A futura referência compartilhada foi especificada em [DP-GEST-002](./DP-GEST-002-IDENTIDADE-UNICA.md).

## Roteiro de homologação manual

| ID | Ação | Esperado |
|---|---|---|
| GEST-04-01 | Entrar no HML como administrador | Login normal; `v1.13.47-H.1` |
| 02 | Abrir menu Gestão | Entrada “Pessoas e vínculos” visível |
| 03 | Abrir Pessoas e vínculos | Rota própria do CMAPP, sem aplicativo paralelo |
| 04 | Conferir aviso de privacidade | Apenas contas e divisões, sem dados de outros módulos |
| 05 | Conferir indicador Contas | Contas realmente retornadas pela Gestão, não pessoas RH |
| 06 | Conferir indicador Divisões | Registros realmente retornados pelo serviço de divisões |
| 07 | Conferir indicador Responsáveis por UID | Soma de papéis principal/substituto identificados, não de nomes iguais |
| 08 | Conferir indicador Pendências | Apenas referências que requerem revisão no conjunto consultado |
| 09 | Abrir aba Contas | Nome, e-mail institucional e vínculos por UID em cards |
| 10 | Ver conta sem `pessoaId` | “Somente UID da conta”; não afirma que pessoaId existe |
| 11 | Ver conta com `pessoaId`, se houver | “Informado, não validado”, sem inferir vínculo de outros módulos |
| 12 | Ver conta inativa | Sinalização da conta inativa |
| 13 | Pesquisar por nome | Apenas itens do conjunto consultado e autorizado |
| 14 | Pesquisar por e-mail | Filtragem local, sem novo endpoint |
| 15 | Filtrar Sem pessoaId | Só contas ainda sem referência canônica |
| 16 | Filtrar Com pessoaId informado | Só contas com valor explícito, sem validar servidor |
| 17 | Abrir ficha de conta | Navega à tela Usuários existente e abre ficha, respeitando acesso |
| 18 | Voltar ao mapa | Navegação e filtros não exibem dados de outra sessão |
| 19 | Abrir aba Divisões | Divisões com principal e substituto |
| 20 | Divisão com responsável por UID | Mostra “UID identificado” |
| 21 | Divisão sem principal | Mostra situação pendente |
| 22 | Divisão com nome histórico sem UID, caso exista | Pendência de referência, não une por nome |
| 23 | Divisão com UID sem conta correspondente, caso exista | “UID não localizado” |
| 24 | Responsável com conta inativa, caso exista | Sinalização sem apagar vínculo |
| 25 | Principal e substituto iguais, caso exista | Pendência para revisão manual |
| 26 | Abrir divisão existente | Abre o CRUD atual de Divisões, sem cadastro paralelo |
| 27 | Abrir aba Pendências | Itens e justificativas coerentes com a lista |
| 28 | Pesquisar Pendências | Resultado filtrado em memória |
| 29 | Mais de 12 registros na visão | Botão “Mostrar mais” exibe próxima página local |
| 30 | Chrome Android | Cards empilhados e campos sem rolagem horizontal da página |
| 31 | Teclado Android e botões | Altura mínima de toque e foco visível |
| 32 | Tema claro/escuro/automático | Contraste e status legíveis |
| 33 | PWA Android após atualizar | Cache `v1.13.47-h.1-gest04` e login funcional |
| 34 | Login com Gestor (não admin) | Sem acesso à rota Pessoas e vínculos |
| 35 | Login Conferente | Sem acesso à rota e aos dados |
| 36 | Sair ou trocar a conta | Contas, divisões e pendências antigas limpas |
| 37 | Login com outro admin | Não reaproveita dados nem filtros da sessão anterior |
| 38 | Regressão Usuários | Busca, filtro, CRUD e detalhe preservados |
| 39 | Regressão Divisões | CRUD e responsáveis principal/substituto preservados |
| 40 | Regressão Funções | Matriz GEST-01 e prévia GEST-02 preservadas |
| 41 | Regressão Gabinete | Agenda, Ramais e Cadastros sem alteração de dados |
| 42 | Regressão DSIPS | Consulta de materiais e cautelas preservadas |
| 43 | Regressão Patrimônios | Painel, relação, inventários e fila preservados |

## Testes de implementação

- `tests/gestao-pessoas-vinculos.test.mjs`: modelo puro, vínculos confirmados por UID, referências legadas, pendências, pistas de duplicidade, contrato DSIPS/Gabinete sem junção por nome.
- `tests/gestao-pessoas-ui.test.mjs`: casos DOM/jsdom para filtros, cards, navegação aos cadastros e limpeza de sessão. É necessária execução Node com `jsdom` para teste real.
- `tests/gestao-login-bootstrap.test.mjs`: ordem de criação do controlador de funções antes da inicialização do login; versionamento atual.
- `tests/gestao-usuarios-ui-contract.test.mjs`: regressão da ficha de usuários anterior.
- Revisão de permissões de navegação em `js/platform/modules.js` + `js/platform/acesso-sessao.js`.
- Revisão do `service-worker.js`, HTML e importações de cache do app.

**Limite:** testes de modelo/simulação e checagens estáticas não são homologação autenticada no Android/PWA/desktop e não certificam segurança do Firestore. A entrega só estará homologada após os testes reais do usuário.

## Bloqueios mantidos

Não executar criação/alteração de `pessoas` no Firestore, migração de `pessoaId`, conciliação automática, alteração de `responsavelId` da DSIPS, cópia da base do RH, exportação de dados pessoais, Firebase Functions/Rules ou deploy em PRD.

**Gate futuro:** aprovação específica de arquitetura, auditoria de dados, backup, Rules/Functions em HML, testes negativos e homologação antes de qualquer promoção.
