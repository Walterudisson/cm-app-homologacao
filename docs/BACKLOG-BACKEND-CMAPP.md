# CMAPP | Pendências de backend (backlog controlado)

**Referência:** 21/11/2026. **Última revisão frontend:** GEST-05 (`v1.13.48-H.1`). **Estado:** planejamento; nenhum item deste documento autoriza publicação.

## Regra de execução
As Cloud Functions, Firestore Rules, indexes e dados reais existentes continuam operacionais onde já foram implantados. O bloqueio atual vale para **novas mudanças estruturais e de backend**. Não modificar HML backend, PRD ou dados reais sem aprovação específica e roteiro de rollback.

## Backlog priorizado

| ID | Frente | Pendência objetiva | Dependência | Gate |
|---|---|---|---|---|
| **BE-01** | **Gestão / GEST-06** | Aplicar matriz granular módulo + ação + escopo em Rules/Functions; associação de função personalizada, concessões e revogação; auditoria do administrador por módulo | Validar GEST-01/02/03/04/05 e revisão de autorização existente | Aprovação de backend HML, testes negativos e roles |
| **BE-02** | **Identidade / GEST-07** | Criar `pessoas/{pessoaId}` e vínculo opcional `usuarios/{uid}.pessoaId`, inclusive para pessoa sem login; migração/reconciliação por identificação confiável | Modelo DP-GEST-002, inventário de dados e BE-01 | Aprovação da coleção, backup, migração reversível e aprovação humana |
| **BE-03** | **Gabinete / persistência** | Agenda, ramais, contatos e órgãos externos com CRUD seguro, referência única às pessoas/divisões e revisão cadastral a cada 90 dias | BE-01 e BE-02, perfis do Gabinete | Rules por campo, acesso expresso, trilha de auditoria |
| **BE-04** | **Gabinete / privacidade** | Visualização de telefones particulares apenas para perfis expressamente autorizados, foto institucional de outros usuários sob proteção de Storage, auditoria de consulta | BE-01/03 | Testes negativos de leitura e exportação |
| **BE-05** | **DSIPS / gestão** | Ajustes de backend acumulados para indicadores gerenciais aprovados, gestão de cautelas/materiais, consultas e consistência de responsáveis; preservar eventos históricos | Validar UX DSIPS e BE-02 para novos vínculos | Escopo fechado por indicador; testar devoluções/estoque |
| **BE-06** | **RH / módulo** | Criar dados funcionais e painel real do efetivo vinculados a `pessoaId`; importação autorizada da planilha do RH e posterior férias | BE-01/02, mapeamento funcional RH-00/01 | Governança por campo, LGPD, auditoria, conferência de amostra |
| **BE-07** | **Segurança / sessões** | Sessões e dispositivos, último acesso, revogação segura pelo próprio usuário, auditoria e tratamento de tokens no backend | BE-01 e definição de política | Functions/Admin SDK + Rules, testes de logout/revogação |
| **BE-08** | **Gabinete / notificações** | Push configurável de aniversários, preferências, política de consentimento e isolamento de dados | BE-01/03 | Privacidade + backend FCM |
| **BE-09** | **Gabinete GAB-08 (adiada)** | Exportação PDF/vCard conforme escopo, com revisão de privacidade e direito de exportação | BE-01/03/04 | **Adiada por decisão do projeto**; não antecipar |
| **BE-10** | **Plataforma transversal** | Auditoria de acesso, concessão, atualização, migração, inativação e reversibilidade; observabilidade e testes de segurança | BE-01/02 | Integrar a cada frente de backend, não deixar para depois |

### Esclarecimentos de escopo

- GEST-01 relaciona **35 operações** (seis chaves legadas e 29 propostas), mas **não aplica direitos no Firebase**.
- GEST-02 registra/edita funções personalizadas por serviço existente. O helper `usuarioPode()` **não aplica automaticamente** a lista de direitos da função `funcaoId`.
- GEST-03 expõe vínculos existentes como informação; não altera permissões efetivas.
- GEST-04 projeta `usuarios` e `divisoes`; **não criou `pessoaId` nem migrou registros**. O RH não dispõe de cadastro duplicado por decisão de arquitetura.
- O Gabinete permanece com **CRUD demonstrativo em memória**, sem persistência real da Agenda. GAB-08 não é pré-requisito para estabilizar a GEST-05.
- A DSIPS possui serviços reais já implantados; BE-05 aborda as **mudanças adicionais** que ficaram pendentes, não a criação de uma infraestrutura nova.
- Segurança e controles de leitura privada exigem **verificações reais de backend**; esconder botões no frontend é insuficiente.

## Ordem para liberar backend

1. **GEST-05:** estabilização do frontend, regressões automatizadas e homologação autenticada Android/desktop/PWA.
2. **BE-01 + BE-10:** revisão das Rules/Functions existentes, matriz granular e auditoria em HML, com autorização específica.
3. **BE-02:** contrato central de `pessoaId`, levantamento/conciliacão, migração reversível em HML, sem alterar UID.
4. **BE-03/04 + BE-05:** persistência e privacidade do Gabinete, ajustes gerenciais DSIPS, preservando históricos.
5. **BE-06/07/08:** RH funcional, sessões e notificações.
6. **BE-09:** somente quando a exportação GAB-08 voltar a ser priorizada.
7. Para cada frente: **HML → testes funcionais/negativos → aceite explícito → autorização separada para PRD**.

## Guardrails de segurança e privacidade

Não publicar dados reais, CPF, matrículas, telefones particulares ou listas do efetivo no GitHub Pages nem em exemplos de CI. Não unir pessoas por coincidência de nome, e-mail ou matrícula. Pessoas sem Auth devem poder existir como identidade institucional sem acesso ao sistema. Controle de acesso à Agenda é por concessão expressa; telefones particulares têm autorização mais restrita que consulta da Agenda.

**Referências:** [ROADMAP-CMAPP.md](./ROADMAP-CMAPP.md), [DP-GEST-001](./DP-GEST-001-MATRIZ-GRANULAR.md), [DP-GEST-002](./DP-GEST-002-IDENTIDADE-UNICA.md), [DP-RH-001](./DP-RH-001-CONTROLE-EFETIVO.md).
