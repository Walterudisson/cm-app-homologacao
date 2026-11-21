# CMAPP | Roadmap de desenvolvimento

**Referência:** 21/11/2026. **Ambiente:** HML [cm-app-homologacao](https://walterudisson.github.io/cm-app-homologacao/).
Esta é a referência única de planejamento para as sprints de frontend do CMAPP.

## Restrições atuais

- Somente alterações incrementais no frontend do HML, sem promoção automática para produção.
- Backend, Firebase Rules, Cloud Functions, índices, migrações e alterações estruturais de dados ficam **suspensos até nova autorização**.
- Não publicar dados pessoais reais em arquivos públicos do GitHub Pages nem na prévia de demonstração.
- Sem liberar acesso amplo à Agenda: consulta depende de permissão concedida. Telefones particulares somente para Gabinete e administradores expressamente autorizados, quando houver proteção pelo backend.
- PDF deve respeitar a abrangência do usuário; revisão cadastral a cada **90 dias**; aniversários em painel e push configurável quando houver backend autorizado.
- Preservar identidade CMAPP, mobile-first/PWA, homologação regressiva e centralização em um único aplicativo.

## Estado verificado

| Frente | Estado em 21/11/2026 | Pendência |
|---|---|---|
| Central de Trabalho | HML v1.13.38-H.4 integrada, Gabinete como módulo e login direto na Central | Teste funcional Android/desktop |
| Patrimônios | Telas existentes e Painel V2 | Evolução de gestão sem regressões |
| DSIPS | Estoque, cautelas, devoluções, posse, histórico e indicadores no frontend | Ajustes de gestão; mudanças de backend em espera |
| Gestão | Usuários, divisões e matriz de permissões legadas | GEST-01 a GEST-05: UI/UX; GEST-06/07 bloqueadas por backend |
| Gabinete | Painel, Agenda, Ramais e CRUD demonstrativo de qualidade | Persistência e concessões seguras mediante autorização do backend |
| Segurança | PWA e mitigação de versões | Sessões/dispositivos e revogação via backend seguro no futuro |

## Gabinete: cronologia, entregas e próximas sprints

| Marco | Escopo | Estado |
|---|---|---|
| GAB-00 | Prévia navegável, identidade e requisitos | Protótipo criado |
| GAB-01 | Contrato de fundação cadastral, regras de autorização e testes | Contrato preparado, sem deploy de backend |
| GAB-02 | Busca e exportação PDF por impressão do navegador | Prévia estática, **não confundir com integração na Agenda** |
| GAB-03 | Painel + Agenda Telefônica no CMAPP | HML, dados demonstrativos |
| GAB-04 | Ramais institucionais e pesquisa/cópia | HML, dados demonstrativos |
| Integração H.4 | Gabinete na Central e login com rota inicial correta | Código HML integrado; homologação funcional pendente |
| **GAB-05** | **Fichas, favoritos locais, ações rápidas e responsividade** | **HML v1.13.39-H.1, aguardando homologação funcional** |
| **GAB-06** | **Aniversariantes fictícios, filtros, contadores e preferências locais; sem push** | **HML v1.13.40-H.1, aguardando homologação funcional** |
| **GAB-07** | **CRUD demonstrativo completo, qualidade e revisão a cada 90 dias** | **HML v1.13.41-H.1; homologação funcional pendente** |
| GAB-08 | Exportação PDF conforme perfis, vCard, revisão de privacidade | Planejada; exige proteção por campo na fonte |
| GAB-09 | QA integrada, auditoria, acessibilidade, PWA e regressões | Planejada |

### Entregáveis e critérios da GAB-05

- Ficha de contato institucional, sem campos particulares na demonstração.
- Cards responsivos, busca por nome, unidade e ramal.
- Filtro de favoritos com persistência **somente de IDs fictícios**, local por dispositivo e por usuário.
- Ações contextuais para copiar ramal e e-mail; chamada/e-mail externo somente se o dado institucional estiver disponível e válido.
- Rotas existentes preservadas; nada publicado em produção.

### Entregáveis e critérios da GAB-06

- O Painel do Gabinete exibe indicadores Hoje, próximos 7 dias e próximos 30 dias, além de filtro de período.
- A lista usa exclusivamente **dia/mês de contatos fictícios** da mesma fonte da Agenda, sem idade ou ano de nascimento.
- Preferências locais por usuário e dispositivo: exibir/ocultar avisos no Painel e selecionar período; somente configurações são armazenadas localmente.
- Botão **Ver ficha** em cada aniversariante abre a Agenda, desde que o usuário esteja autorizado.
- Na prévia, aniversariantes em 29/02 aparecem em 01/03 em anos não bissextos. Regra a confirmar institucionalmente antes de dados reais.
- **Push não disponível:** requer backend seguro, consentimento e controles de autorização; nenhum envio foi implementado.
- Correção incidental GAB-05: foco da busca rápida da Agenda, antes referenciando variável indefinida.
- Sem alteração em produção, Firestore Rules, Cloud Functions, índices ou dados pessoais.

### Entregáveis GAB-07 e próximos gates

- CRUD **de demonstração** em tela exclusiva **Gabinete > Cadastros e revisão**, com inserção, consulta, edição, exclusão reversível, restauração e revisão de dados.
- Nesta etapa, **somente o perfil admin** pode operar o CRUD de homologação. A versão definitiva seguirá concessões administrativas **expressas** da política GAB-01, inclusive para admin, conferidas no servidor; não presumir acesso por perfil.
- Fonte única em memória por sessão: Agenda, aniversariantes e Ramais refletem alterações do cadastro sem duplicar bases. Sem gravação em Firebase, browser storage, IndexedDB, cache PWA de dados digitados ou produção.
- Validação de nomes, unidades, ramal como texto, e-mail, telefone institucional, dia/mês e limite de caracteres. Rejeição explícita de campos privados, CPF, nascimento completo, permissões e campos inesperados.
- Deduplicação por nome normalizado + unidade + tipo; **ramais compartilhados são permitidos**.
- Lista com busca, filtros por tipo, ativos, excluídos, pendências e situação da revisão; métricas de qualidade, revisão vencida a partir de 90 dias, e alertas não bloqueantes.
- Exclusão reversível dentro da sessão, após diálogo de confirmação; restauração impede conflito com novo registro. Revisão declarada por botão com confirmação.
- Alterações em memória são apagadas ao encerrar sessão, trocar de conta ou recarregar página. **Não digitar dados reais no formulário de homologação.**
- Backend e migração de dados reais, papéis de edição, auditoria oficial e persistência continuam **bloqueados** até revisão de Rules/Functions e autorização específica.
- Regressão HML deve conferir CRUD, acessos, UI Android/desktop e PWA; nenhuma promoção automática a PRD.

### Próximas frentes após Gabinete

1. **Gestão:** simplificar tela de usuários e acessos, perfis por módulo, aprovações e usabilidade mobile, sem migrar modelo até aprovação do backend.
2. **DSIPS:** indicadores realmente acionáveis e telas de gestão/posse/cautela, preservando fluxo do PDV e histórico.
3. **Patrimônios:** acompanhar Painel V2, filas, gestão de inventários e consultas.
4. **Segurança/PWA:** Minha Conta > Segurança > Sessões e Dispositivos, auditoria e revogação segura (backend futuro).
5. **Novos módulos:** RH (efetivo), Academia (atestados de aptidão), AT (inquéritos) e demais áreas previstas.

## Regra de publicação

**HML → testes/regressão no Android, desktop e PWA → homologação explícita → promoção PRD.** 
Nenhuma versão HML ou alteração em código representa homologação do usuário.
