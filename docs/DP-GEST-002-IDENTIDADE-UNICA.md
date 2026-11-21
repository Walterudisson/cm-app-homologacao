# DP-GEST-002 | Identidade institucional única e conciliação segura

**Decisão de arquitetura:** 21/11/2026. **Estado:** modelo proposto e visão de referências em HML `v1.13.47-H.1`. **Não autoriza criação de coleções nem migração de dados.**

## 1. O problema a resolver

O CMAPP já possui `usuarios/{uid}` (contas e acesso), `divisoes/{id}` (unidades e UIDs de responsáveis), cautelas da DSIPS (responsáveis com UID ou referências legadas), uma demonstração em memória de contatos do Gabinete e um futuro painel de RH baseado na informação funcional daquele setor.

**Uma pessoa não deve ser recadastrada cada vez que aparecer em uma unidade ou módulo.** Isso exige separar identidade, conta e dados de domínio, sem sacrificar autorização por módulo, retenção, auditoria ou a compatibilidade do legado.

## 2. Contrato proposto

| Entidade | Identificador durável | Responsável pela informação | Regra |
|---|---|---|---|
| Pessoa institucional | `pessoaId` (futuro) | Gestão para identidade institucional | Registro único de pessoa, inclusive sem conta Firebase Auth; sem dados sensíveis no frontend público |
| Conta de acesso | `uid` existente do Firebase Auth, documento `usuarios/{uid}` | TI/Gestão | Referenciar `pessoaId` quando existir; **UID não é pessoaId** e desativar conta não exclui pessoa |
| Divisão | `divisaoId` / ID do documento `divisoes/{id}` já existente | Gestão institucional | Preservar IDs e vínculos históricos; nome é atributo, não chave de junção |
| Responsabilidade por divisão | Atualmente `responsavelPrincipalUid` / `responsavelSubstitutoUid` | Gestão institucional | Identificar por UID explícito; no futuro adicionar referência a `pessoaId` após conciliação autorizada |
| Cautela DSIPS | Hoje `responsavelUid`, ou `responsavelId` se `responsavelOrigem='usuarios'` | DSIPS, com identidade referenciada em Gestão | Não criar pessoa separada; manter dados históricos e responsável original |
| Agenda Gabinete | Hoje projeção do próprio titular via `origem='usuarios'` e `uid`; demais registros da GAB-07 são **demonstração em memória** | Gabinete para contato/ramais/órgãos | Pessoa real deve referenciar identidade institucional autorizada; não promover exemplos fictícios a identidades reais |
| Órgão externo / contato externo | `orgaoId` e futuro identificador próprio de contato externo | Gabinete | Não converter órgão ou pessoa externa automaticamente em usuário ou efetivo |
| Efetivo e férias RH | **`pessoaId` futuro**, sem importação ainda | RH para dados funcionais e gestão de férias | RH lê identidade; **não cria outra pessoa** nem gerencia login |
| Responsáveis Academia / AT futuros | Referência a `pessoaId` após autorização | Cada domínio | Reutilizar identidade institucional sem replicar dados sensíveis |

### Relações futuras

`pessoas/{pessoaId}` será a entidade canônica **somente após projeto, autorização e implementação de backend**. A conta `usuarios/{uid}` poderá receber `pessoaId`, mas isso não autoriza automaticamente outros módulos. O cadastro de pessoa pode existir sem conta de login.

As divisões manterão seus IDs atuais até uma migração formal. As referências atuais de responsáveis por UID permanecem válidas durante a transição.

## 3. Regra estrita de conciliação

- Apenas **identificadores explícitos confiáveis** permitem marcar um vínculo como identificado na tela.
- Coincidência de nome, e-mail, matrícula ou cargo é **pista para revisão**, jamais junção automática de registros.
- Nome histórico diferente do nome atual gera pendência, mas não muda a referência por UID.
- Conta inativa, UID ausente na lista autorizada, responsável sem UID e principal/substituto com mesmo UID são sinalizados.
- Referência de DSIPS sem `responsavelUid` e sem origem `usuarios` é **legado**, ainda que o nome coincida com conta.
- Referência do Gabinete só aponta para a conta quando a origem declarada for `usuarios` e contiver UID; os `demo-*` não entram no cadastro real.
- Nenhuma decisão de mesclagem ou migração deve ser acionada pelo navegador; só poderá ocorrer num backend seguro, com trilha de auditoria, revisão humana, backup e possibilidade de reversão.

## 4. Implementação GEST-04 (frontend HML)

Nova rota **Gestão > Pessoas e vínculos**, consultiva e **restrita a administrador que possua simultaneamente os direitos legados de visualizar usuários e divisões**.

Painel responsivo com:
- Indicadores de **contas consultadas, divisões consultadas, referências de responsáveis reconhecidas por UID e pendências**.
- Visões **Contas / Divisões / Pendências**, busca, filtros contextuais e paginação incremental de 12 cards.
- Cada conta é apresentada como **projeção do cadastro atual de usuários**, e não como pessoa cadastrada numa nova coleção.
- Cada divisão exibe principal/substituto, status da referência e aviso para revisão manual.
- Candidatos a duplicidade por nome/e-mail são apenas sinalizados, sem expor ou mesclar IDs.
- Botões para **abrir o cadastro já existente**, sem nenhuma operação de escrita nova.
- Aviso persistente de que nenhuma leitura de RH, Agenda privada do Gabinete, cautelas DSIPS ou fonte externa compõe essa visão.
- Dados montados somente **na memória da sessão autorizada**, sem persistir em localStorage, Firebase, IndexedDB, cache do PWA, arquivos estáticos ou exportações.

**Estado do registro `pessoaId`:** a tela pode mostrar um `pessoaId` se ele já estiver explicitamente informado numa conta, mas isso **não certifica sua existência** nem implica ligação com outra coleção. Na ausência, informa “somente UID” e registra pendência de criação futura do identificador canônico.

### Segurança de sessão

A nova rota usa `PAGINAS_COMUNS.pessoas` com perfil admin e `podeNavegarLegado` exige também `USUARIOS_VISUALIZAR` e `DIVISOES_VISUALIZAR`. Esse bloqueio é **apenas da interface**, não substitui Rules/Functions.

Consultas de `usuarios` e `divisoes` preservam a API antiga. Antes de atribuir o resultado à tela, conferem a sessão e UID que originaram a consulta. O painel e os catálogos de Gestão são limpos ao trocar/desconectar conta. Avatares carregados em segundo plano também respeitam a sessão corrente.

## 5. Backend futuro: contrato e gate obrigatório

**Nenhuma etapa abaixo é autorizada pela GEST-04.** Proposta para GEST-06/07 ou sprint específica de dados cadastrais:

1. Auditar Rules, Functions e documentos reais já existentes no projeto **HML**, incluindo dados e UIDs das divisões, DSIPS, contas e situação das pessoas sem login.
2. Formalizar governança por campo: Gestão mantém identidade/cadastro; TI, autenticação e privilégios; RH, dados funcionais; Gabinete, contatos/agenda; DSIPS, cautelas e responsáveis.
3. Aprovar contrato `pessoas/{pessoaId}`, `usuarios/{uid}.pessoaId` e referências opcionais por módulo. Definir formato, mutabilidade, unicidade, auditoria, inativação e reconciliação.
4. Preparar relatório de conciliação em ambiente protegido e critérios de aprovação humana, sem CPF ou dados pessoais em repositório público.
5. Backup do HML, migração idempotente e reversível; rodar Emulator Suite com testes de acesso horizontal, elevação de privilégios, soft-delete e versões legadas.
6. Autorização explícita do usuário **para backend HML** antes de Functions/Rules/Firestore.
7. Homologação funcional e aprovação separada para PRD. Não promover automaticamente.

## 6. Riscos de migração a evitar

- Usar UID da conta como chave universal para pessoas sem login.
- Tornar nome, CPF ou matrícula um identificador técnico visível ao frontend.
- Alterar `responsavelId` em cautelas antigas ou recriar eventos de custódia.
- Misturar `pessoaId`, `uid`, `orgaoId` e IDs de contatos externos.
- Reaproveitar a lista de contatos fictícios do Gabinete como cadastro institucional.
- Permitir a um administrador de módulo editar registros de identidade de outros módulos.
- Conceder acesso a RH, telefone particular ou inventário por mera lotação ou vínculo de identidade.
- Contar “pessoaId informado” como identidade validada sem consulta segura.

**Roteiro de QA:** [GEST-04-HOMOLOGACAO.md](./GEST-04-HOMOLOGACAO.md). **Roadmap geral:** [ROADMAP-CMAPP.md](./ROADMAP-CMAPP.md).
