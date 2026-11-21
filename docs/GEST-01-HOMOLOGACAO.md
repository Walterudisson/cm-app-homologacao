# GEST-01 | Homologação da matriz de funções, permissões e abrangências

**Candidata:** `v1.13.44-H.1` · **Ambiente:** apenas HML · **Estado:** testes de código concluídos, homologação visual autenticada pendente.

## Entrega

Na tela **Gestão > Funções e permissões**, foi incorporado o **Mapa de operações por módulo**, independente do CRUD de funções existente. O mapa permite filtrar por módulo, situação (legado/proposto), pesquisar e consultar abrangência/justificativa de cada operação.

- **35 operações:** **6** declaradas no catálogo do frontend legado e **29** propostas para evolução futura.
- **Módulos:** Gestão, Patrimônios, DSIPS, Gabinete, RH e Segurança.
- **Perfis nativos comparados:** Administrador, Gestor e Conferente, mostrando apenas o que o helper do frontend declara. **Não confirma acesso real ao servidor.**
- **Nenhuma mudança no catálogo `PERMISSOES` ou `FUNCOES_NATIVAS` existente.** Nem em autorização, backend, dados ou PRD.
- **Editor de funções legado permanece funcional como estava** e apresenta aviso de que seu cadastro não equivale a direitos granulares no backend. Não criar funções com dados sensíveis para testes.
- Filtros, busca, quadro responsivo para celular e detalhes acessíveis por operação.

## Testes de homologação manual

| ID | Ação no HML | Esperado |
|---|---|---|
| GEST-01-01 | Login de admin | Central de Trabalho, sem prévia do Painel Patrimônios |
| 02 | Abrir Gestão > Funções e permissões | Mapa de operações aparece antes da lista de funções |
| 03 | Conferir versão | `v1.13.44-H.1` |
| 04 | Abrir módulo Gestão (padrão) | 13 operações, misturando legado e propostas, sem cadastros reais |
| 05 | Selecionar Todos os módulos | 35 operações em seis módulos |
| 06 | Filtrar Declaradas no legado | Exibe seis chaves existentes |
| 07 | Filtrar Propostas futuras | Exibe 29 operações, todas como A definir nos perfis |
| 08 | Selecionar DSIPS | Separação consulta/entrega/devolução/ajuste/cadastros |
| 09 | Selecionar Gabinete | Agenda geral vs telefone particular, ramais, órgãos e exportação futura |
| 10 | Selecionar RH | Visualizar efetivo, gerir dados, férias futuras |
| 11 | Selecionar Patrimônios | Consultar, conferir, transferir, aprovar e inventários separados |
| 12 | Selecionar Segurança | Sessões próprias/revogação identificadas como futuras |
| 13 | Buscar `telefone_privado` | Apenas `gabinete.agenda.telefone_privado` |
| 14 | Buscar `férias` (com módulo Todos) | Operações de RH, com busca tolerante a acento |
| 15 | Abrir Detalhes e critérios | Abrangência e notas de autorização legíveis |
| 16 | Conferir perfis nativos na operação legada | Apenas declarações codificadas, sem inferir Rules |
| 17 | Conferir proposta de permissão | Todos os perfis mostram A definir |
| 18 | Selecionar filtro sem resultados | Mensagem vazia clara, sem erro |
| 19 | Alterar filtros no Android | Sem rolagem horizontal da página; cartões empilhados |
| 20 | Navegar com teclado | Inputs e detalhes acessíveis, foco visível |
| 21 | Alternar temas claro/escuro/automático | Contraste suficiente, sem esconder avisos |
| 22 | Abrir editor de função legado | Somente seis chaves anteriores, nota de compatibilidade |
| 23 | Consultar função nativa | Continua protegida contra edição |
| 24 | Consultar função personalizada existente | Edição e situação preservadas (não alterar dados reais) |
| 25 | Login com usuário sem acesso à Gestão | Nenhum acesso à tela de Funções nem ao mapa |
| 26 | Alternar conta | A matriz não traz identidade ou dados pessoais de outra sessão |
| 27 | Atualizar PWA | Novo cache e página sem tela branca |
| 28 | Regressão Gabinete | Agenda e Cadastros continuam funcionando |
| 29 | Regressão DSIPS | Materiais e cautelas continuam com fluxo anterior |
| 30 | Regressão Patrimônios | Painel, inventários e fila preservados |

## Verificações de desenvolvimento

- Modelo puro validado com **5 testes e 199 asserções**, aprovados.
- Interface em DOM simulado: **9 verificações**, aprovadas.
- Arquivo de testes de integração em jsdom incluído como suite Node; **não confundir com execução real em CI**.
- Revisão estática de HTML, JS, PWA e permissões antes da integração da branch.
- Browser autenticado Android/desktop/PWA e regras de backend **ainda não foram testados**.

## Próximos gates

1. **GEST-02:** melhorar UX do CRUD de funções, visibilidade do impacto e das atribuições, sem mudar enforcement.
2. **GEST-03:** usuários, papéis, módulos e escopos propostos, com simplificação de atribuição por área.
3. **GEST-04/05:** divisões, vínculo de pessoas e QA integrado.
4. **GEST-06/07:** somente após autorização específica para Rules, Functions, migrações, auditoria e publicação segura.

**Fonte:** [DP-GEST-001](./DP-GEST-001-MATRIZ-GRANULAR.md). **Não promover PRD automaticamente.**
