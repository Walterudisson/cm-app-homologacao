# DP-GEST-001 | Matriz de funções, permissões e abrangências

**Decisão de desenvolvimento:** 21/11/2026. **Status:** contrato preliminar + prévia consultiva HML `v1.13.44-H.1`; não homologado.

## 1. Separar conceitos que hoje aparecem misturados

| Conceito | Significado | Regra |
|---|---|---|
| Pessoa institucional | Identidade única: efetivo, contatos e responsáveis | Pode existir sem conta; não deve ser duplicada por módulo |
| Usuário / conta | UID Firebase Auth, habilitação de login, última sessão | Usuário não recebe direitos automaticamente ao ser cadastrado |
| Perfil-base | Base de compatibilidade `admin`, `gestor`, `conferente` | Preservar legado até migração validada, sem presumir direitos futuros |
| Função | Conjunto de responsabilidades institucionais, nativo ou personalizado | Deve associar permissões e eventualmente escopo de concessão; não é posto/graduação |
| Permissão | `modulo.recurso.acao` e requisitos associados | Deve ser verificada **no backend**, nunca apenas pelo botão oculto |
| Abrangência | Próprio titular, divisão, módulo, registros vinculados ou global autorizado | A mesma permissão pode ter abrangências diferentes; não inferir pela lotação |
| Lotação/divisão | Informação cadastral e, quando autorizado, filtro operacional | Lotação não deve criar concessão de acesso à Agenda ou RH |
| Administrador de módulo | Responsável por operações delegadas naquele módulo | Não altera papéis globais, contas e outras áreas fora de sua competência |

**Modelo escolhido para projetar:** papéis/funções (RBAC) + condições e abrangência por recurso (ABAC), com negativa por padrão, menor privilégio, auditoria e política contra elevação indevida.

## 2. Estado real do código analisado

- `js/core/permissoes.js` define **seis** chaves: `divisoes.visualizar`, `divisoes.gerenciar`, `usuarios.visualizar`, `usuarios.gerenciar`, `inventarios.gerenciar` e `patrimonios.conferir`.
- Três perfis têm matrizes nativas declaradas no frontend: `admin`, `gestor` e `conferente`. `usuarioPode()` considera perfil nativo + `usuario.permissoes` adicionais. Isso é **apenas lógica cliente**, não prova enforcement do servidor.
- `js/platform/modules.js` também restringe páginas por perfil e módulos. `js/platform/acesso-sessao.js` aplica controles de navegação legados e sessão. Essas verificações não substituem Rules e Functions.
- A tela de funções **já tem CRUD persistente no legado** em `js/services/funcoes.service.js`, via Firestore. Esta sprint **não altera** seu modelo, operações ou documentos. A coleção e as regras efetivas precisam de auditoria antes de ampliar esse fluxo.
- `usuario.funcaoId` é armazenado na atribuição legada, mas o helper `usuarioPode()` **não carrega nem aplica automaticamente as permissões da função personalizada**. Portanto **não declarar como concedido** um direito simplesmente por marcar um checkbox na função.
- Dados reais de `usuarios`, `divisoes`, `funcoes`, DSIPS e Agenda não devem integrar o bundle do PWA ou fixtures públicas.

## 3. Novo catálogo consultivo GEST-01

`js/modules/gestao/matriz-acessos-model.js` classifica **35 operações** em **6 declaradas no legado** e **29 propostas** para os módulos Gestão, Patrimônios, DSIPS, Gabinete, RH e Segurança.

A interface `Gestão > Funções e permissões > Mapa de operações por módulo` permite pesquisar, filtrar módulos/situação e comparar **declarações nativas de frontend** dos três perfis, com abrangência e nota de implementação.

**Essa interface é 100% consultiva:** não contém checkbox de concessão, ação de salvar, chamada a Firestore/Functions nem altera `PERMISSOES`, `FUNCOES_NATIVAS` ou direitos efetivos. O CRUD legado de funções permanece como estava, em painel distinto e identificado como compatibilidade.

## 4. Granularidades que orientarão a evolução

| Módulo | Exemplos de operações independentes | Abrangência |
|---|---|---|
| Gestão | Visualizar usuário; criar conta; editar dados; desativar; atribuir acessos | TI/institucional ou delegação expressa por módulo |
| Gestão | Consultar divisão; criar; editar responsáveis; consultar/criar/atribuir função | Institucional ou limites delegados |
| Patrimônios | Consultar bens; conferir; solicitar transferência; aprovar; administrar inventário | Divisão, vínculo com bens e fila de aprovação |
| DSIPS | Consultar estoque; registrar cautela; devolver; ajustar estoque; administrar cadastros | Operadores e gestores DSIPS designados |
| Gabinete | Consultar Agenda; consultar telefone particular; administrar ramais; administrar órgãos | Concessão expressa; dados privados por campo |
| RH | Consultar efetivo; editar dado funcional; consultar/gerenciar férias futuramente | RH designado; titular quando permitido |
| Segurança | Consultar sessões próprias; revogar sessões | Titular e administradores autorizados, em backend seguro |

A operação `gerenciar` legada não será reinterpretada silenciosamente como todas as novas ações. Uma migração deverá mapear cada papel e concessão explicitamente, mantendo históricos e negando operações sem autorização definida.

**Princípios mínimos:** usuário autorizado a consultar não deve obter automaticamente direito de criar, editar, aprovar, excluir, exportar ou visualizar dados privados; perfil não substitui escopo; atribuição de função não pode permitir elevar direitos acima da autoridade de quem concede.

## 5. Backlog de Gestão sugerido

| Sprint | Entrega | Dependências |
|---|---|---|
| **GEST-01** | Diagnóstico + mapa consultivo de permissões, nativas/propostas, busca e filtros mobile | Somente frontend HML; entregue como candidata |
| **GEST-02** | Melhorar CRUD de funções e prévia de diferença de direitos antes de editar; impedir semânticas enganosas | Revisar contrato; frontend sem alterar direitos |
| **GEST-03** | Gestão de usuários: visão clara de perfil, função, módulos e abrangências; concessões delegadas propostas | Mock/contrato antes do backend |
| **GEST-04** | Divisões, pessoas e responsáveis: referências únicas, sem recadastro entre Gabinete/DSIPS/RH | Auditoria de chaves e modelos |
| **GEST-05** | QA integrado, permissões negativas, mobile, acessibilidade, PWA e regressões | HML |
| **GEST-06** | Enforcement verdadeiro em Functions/Rules, regras granulares e auditoria | **Bloqueado** até autorização específica |
| **GEST-07** | Conciliação/migração segura de vínculos e funções, smoke tests | **Bloqueado** até autorização + backup/testes |

## 6. Gate antes de backend

1. Extrair do ambiente correto as Rules e Functions **efetivamente implantadas**; revisão do modelo `funcaoId`, `permissoes`, `modulos`, `divisoesAtribuidas` e `responsavelId` da DSIPS.
2. Aprovar matriz por ação, módulo, escopo, autoridade delegante, condições e trilha de auditoria.
3. Definir API segura para concessão/revogação, herança de funções e revogação de sessão.
4. Testar elevação de privilégios, violação horizontal de escopo, contas desativadas e funções inativas no Emulator Suite.
5. Autorizar explicitamente publicação no backend **HML**. PRD só após homologação e promoção separada.

**A GEST-01 não altera autenticação, Firestore, funções, regras, papéis reais ou PRD.**
