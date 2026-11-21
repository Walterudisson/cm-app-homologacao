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
| Gestão | Catálogo legado de seis permissões, GEST-01 com 35 operações consultivas e GEST-02 com prévia de edição de funções | **HML v1.13.45-H.1: GEST-02 integrada ao código, homologação funcional pendente**; GEST-03 a GEST-05 frontend; GEST-06/07 backend bloqueado |
| Gabinete | Painel, Agenda, Ramais e CRUD demonstrativo de qualidade | Persistência e concessões seguras mediante autorização do backend |
| Segurança | PWA e mitigação de versões | Sessões/dispositivos e revogação via backend seguro no futuro |

## Gestão: matriz de funções e granularidades

A frente de Gestão está aberta pela **GEST-01**. O objetivo é consolidar o cadastro institucional de pessoas, contas, divisões e funções, compartilhado por Gabinete, DSIPS e RH, preservando direitos e identificadores existentes. **Função, perfil-base, vínculo de lotação e permissão não são a mesma coisa.** Uma operação deverá considerar módulo, recurso, ação e abrangência; autorização final dependerá de verificação no backend.

**Diagnóstico:** `js/core/permissoes.js` tem **seis permissões declaradas** e três perfis nativos no frontend. O cadastro legado de funções personalizadas já grava no Firestore, mas `usuarioPode()` não aplica diretamente as permissões de `funcaoId`. Por isso, a nova matriz de operações é **somente consultiva** até a futura implantação segura.

| Marco | Escopo | Estado |
|---|---|---|
| **GEST-01** | **Diagnóstico das permissões, matriz consultiva, perfis nativos, filtros e abrangências** | **HML v1.13.44-H.1 integrada no código; teste autenticado pendente** |
| **GEST-02** | **Prévia dinâmica de mudanças, comparação de permissões, confirmação e proteção de chaves históricas** | **HML v1.13.45-H.1 integrada ao código; testes reais pendentes** |
| GEST-03 | Melhorar Gestão de usuários, função, módulos, permissões e escopos de concessão | Próxima frente proposta, frontend/contrato |
| GEST-04 | Divisões, responsáveis e cadastro institucional de pessoas com referência única | Planejada, contrato e UI |
| GEST-05 | QA integrado, mobile-first, PWA, testes negativos e regressões | Planejada |
| GEST-06 | Enforcement verdadeiro nas Rules/Functions, auditoria e revogação | **Bloqueado até autorização de backend** |
| GEST-07 | Conciliação/migração, concessões reais e promoção controlada | **Bloqueado até autorização + testes** |

**Matriz GEST-01:** seis chaves de frontend preservadas e **29 operações propostas** em Gestão, Patrimônios, DSIPS, Gabinete, RH e Segurança, sem ampliar direitos. O mapa em `Gestão > Funções e permissões` permite selecionar módulo, consultar operações/escopos e comparar perfis nativos, com aviso sobre os limites das permissões legadas.

**Documentação:** [decisão técnica DP-GEST-001](./DP-GEST-001-MATRIZ-GRANULAR.md), [roteiro GEST-01](./GEST-01-HOMOLOGACAO.md) e [roteiro GEST-02](./GEST-02-HOMOLOGACAO.md). A matriz é um contrato proposto e **não equivale a acesso concedido**. A GEST-02 conserva o serviço de funções legado, acrescentando prévia de configuração e confirmação antes da gravação existente. Nenhuma alteração de permissões efetivas, Rules, Functions, migração ou PRD foi publicada pela GEST-01/GEST-02.

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
| **GAB-07.1** | **Referências unificadas de Pessoas/Divisões, órgãos externos e avatar nos cards/fichas** | **HML v1.13.42-H.1, código integrado; homologação visual pendente** |
| **GAB-09** | **Qualidade integrada: acessibilidade, isolamento de sessão, CRUD, Android/PWA e regressões** | **HML v1.13.43-H.1, código integrado; homologação visual pendente** |
| GAB-08 | Exportação PDF conforme perfis, vCard, revisão de privacidade | **Adiada por decisão do produto (21/11/2026); backlog futuro, sem bloquear GAB-09 ou Gestão** |

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

### Decisão arquitetural: fonte cadastral única (GAB-07.1)

**Pessoas não serão recadastradas no Gabinete.** Usuários já cadastrados são exibidos na Agenda como projeção autorizada; o vínculo entre pessoa/UID precisa permanecer o mesmo utilizado por responsáveis nas cautelas DSIPS. Divisões são consultadas do cadastro de Gestão já existente, sem recadastro paralelo. Pessoas sem login poderão integrar um cadastro institucional único com vínculo opcional à conta.

O Gabinete terá CRUD próprio principalmente para **órgãos externos, contatos externos e ramais**, referenciando divisões e pessoas por identificadores estáveis. Alteração de identidade de usuário ou divisão permanece no módulo responsável. Cadastro de órgãos externos não cria contas Firebase Auth.

**Foto da Agenda:** reutilizar a imagem já cadastrada em Meu Perfil (`usuarios/{uid}/perfil/avatar`), com avatar pequeno no card e maior na ficha, fallback por iniciais e controle de acesso à imagem. A versão atual ainda **não exibe** foto nos cards e fichas. Revisar mecanismo `getDownloadURL`/Storage antes de fornecer imagens reais a outros usuários.

A GAB-07 continua um protótipo CRUD **em memória** e a GAB-07.1 agora oferece **abas de Pessoas e ramais / Órgãos externos**, com órgãos e contatos vinculados por `orgaoId`, ramais vinculados a `unidadeId` e pessoas internas somente consulta. O administrador com permissão usa a leitura já existente de divisões para selecionar uma referência sem recadastrá-la. Na indisponibilidade da leitura, usa divisões fictícias de exemplo.

**Entrega de avatar:** foto no card e na ficha para o **próprio usuário autenticado**, a partir da foto já carregada em Meu Perfil; os demais contatos usam iniciais/ícones. A projeção de todas as pessoas reais e o compartilhamento de fotos dos outros usuários ficam bloqueados até backend seguro. Na prévia, nenhuma operação cria contas Auth, altera cautelas ou salva contatos em Firestore/Storage.

**QA:** [roteiro GAB-07.1](./GAB-07.1-HOMOLOGACAO.md) com 25 testes manuais de Android, desktop e PWA; execução visual autenticada permanece pendente. Nenhuma publicação PRD foi autorizada.

**Decisão integral:** [DP-GAB-UNICIDADE-CADASTRAL-FOTOS.md](./DP-GAB-UNICIDADE-CADASTRAL-FOTOS.md).

### Repriorização aprovada em 21/11/2026

- **Agora:** homologação funcional da GAB-07.1 na versão HML `v1.13.42-H.1`, incluindo CRUD de órgãos externos, referências, fotos do próprio perfil, Android/desktop e PWA.
- **GAB-09 integrada ao HML:** consistência entre Agenda e Cadastros, tratamento de referências ao trocar de conta, formulários acessíveis, teclado nas abas, fichas atualizadas, layout mobile e cache PWA. Ver [roteiro de homologação GAB-09](./GAB-09-HOMOLOGACAO.md). **Ainda exige teste autenticado Android/desktop/PWA**.
- **Gestão GEST-01 + GEST-02 integradas no HML:** matriz de operações consultiva e prévia das alterações do CRUD legado, sem ampliar direitos. A GEST-02 incorpora salvaguarda de login da `v1.13.44-H.2`; próxima frente GEST-03 (gestão de usuários e escopos). Homologação visual de GAB-09 e GEST-01/02 segue pendente. Backend somente após autorização específica.
- **GAB-08:** exportações PDF/vCard permanecem no backlog **futuro, sem data definida**. Não implementar nem tratar como requisito de aceite de GAB-09 ou do avanço para Gestão. Quando retomada, respeitar a projeção de dados autorizados, inclusive telefones particulares.
- **Gate de backend:** novas Rules, Functions, migrações, dados reais e persistência continuam suspensos até autorização específica. Sem promoção automática PRD.

### Próximas frentes após Gabinete

1. **Gestão:** GEST-01/02 integradas ao HML; continuar com GEST-03 (usuários, perfis por módulo, escopos e aprovações), transformando o cadastro institucional na referência única para Gabinete/DSIPS/RH, sem migrar backend até aprovação.
2. **DSIPS:** indicadores realmente acionáveis e telas de gestão/posse/cautela, preservando fluxo do PDV e histórico.
3. **Patrimônios:** acompanhar Painel V2, filas, gestão de inventários e consultas.
4. **Segurança/PWA:** Minha Conta > Segurança > Sessões e Dispositivos, auditoria e revogação segura (backend futuro).
5. **RH:** planejamento funcional da versão moderna da planilha Controle Geral do Efetivo, originada no RH; utilizar cadastro institucional único de pessoas/usuários e divisões sem duplicidade. Primeiro painel, relação geral e ficha funcional; férias em fase futura. Preparar após consolidação de Gestão, sem antecipar integração real de dados.
6. **Novos módulos:** Academia (atestados de aptidão), AT (inquéritos) e demais áreas previstas.

### RH: definição funcional aprovada (21/11/2026)

**RH não é um cadastro paralelo de servidores.** Sua primeira versão será uma visualização moderna, filtrável e responsiva da planilha **Controle Geral do Efetivo**, oriunda do RH, aproveitando a identidade institucional e os usuários existentes como referência. Pessoas que constam na planilha podem não ter login, portanto cadastro de pessoa e conta de acesso devem permanecer distintos.

**Responsabilidades:** RH é o setor de origem e validação das informações funcionais do efetivo; Gestão mantém contas, acessos, permissões e a referência institucional única. A autoria/edição de cada campo será definida em matriz de governança antes da persistência. Agenda e DSIPS também utilizarão vínculos estáveis para a mesma pessoa.

**Roadmap RH proposto:** RH-00 (mapeamento de colunas, indicadores, filtros, política de acesso e protótipo fictício); RH-01 (painel, relação geral do efetivo e ficha funcional mobile-first); RH-02 (conciliação/importação autorizada dos dados reais, somente após aprovação de backend); RH-03+ (controle de férias e outras funcionalidades próprias do RH).

O MVP **não** inclui férias, folha de pagamento nem importação automática. A planilha original deverá ser examinada antes de definir os indicadores e regras de contagem. Nenhuma planilha real deverá ir para GitHub Pages ou para o repositório.

**Documento de decisão:** [DP-RH-001-CONTROLE-EFETIVO.md](./DP-RH-001-CONTROLE-EFETIVO.md).

A ordem de execução está em **homologação da GAB-07.1/GAB-09 → Gestão**; o RH segue planejado após a estrutura de cadastro único. GAB-08 permanece adiada.

## Regra de publicação

**HML → testes/regressão no Android, desktop e PWA → homologação explícita → promoção PRD.** 
Nenhuma versão HML ou alteração em código representa homologação do usuário.
