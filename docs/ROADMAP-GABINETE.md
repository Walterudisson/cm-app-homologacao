# GAB-00 | Decisões aprovadas e protótipo do Gabinete
## Decisões funcionais (20/11/2026)
- Cadastro institucional único de todo o efetivo; situação funcional e habilitação de login independentes. Preservar UID, permissões, histórico e vínculos existentes. Não converter lotação em autorização.
- Identificação principal por posto/graduação e nome de guerra; alternativa para civis. Campos propostos: C posto/graduação, D quadro, E nome completo, H CPF protegido, I nome de guerra, O nascimento, AC e-mail, AD telefone; B tipo e K/L unidade/sigla. Conferir cabeçalhos no Excel original antes de importação. Importar somente relação ativa aprovada, sem desligamentos automáticos. CPF e nascimento completo só em domínio administrativo restrito; não expor em Agenda nem usar CPF como senha.
- Unidades organizacionais com hierarquia, responsáveis/substitutos, ramais múltiplos, preservando identificadores e escopos de divisões existentes. Organograma e planilha divergem (GCM/GAB, Subchefia, DCRI); validar mapeamento antes de gravar.
- Agenda: pessoas, ramais e externos; pesquisa, filtros, lista/cards/unidades, ficha de contato, favoritos, ligação, WhatsApp, cópia, PDF, vCard. Compartilhamento respeita política de acesso.
- Acesso à Agenda exclusivamente por atribuição explícita, inclusive perfil básico; não conceder acesso global por pertencer ao efetivo. Gabinete administra ramais/externos; Gestão mantém identidade e contas.
- Telefones particulares somente Gabinete e administradores especificamente autorizados; titular pode consultar/alterar o próprio telefone. Usuário comum não recebe o campo privado, nem em busca, exportação, cache ou resposta de API. Não permitir inferência por busca. Separar dados privados do diretório consultável no Firestore; Rules/Functions devem autorizar por operação e campo/projeção. Ocultar no DOM nunca é controle de segurança. Gabinete não ganha acesso administrativo a CPF.
- Todos os usuários com Agenda podem exportar PDF respeitando os dados que podem consultar. vCard mesma política. Exportações geradas sob autorização; sem publicar dados em Pages, Git, arquivos estáticos ou precache.
- Revisão cadastral a cada 90 dias sem bloquear uso; titular edita telefone e foto, demais mudanças por Gestão autorizada. Lembrete de aniversário: painéis e push configurável (consentimento e preferências); somente dia/mês no diretório.
- Qualidade cadastral; importador permanente com prévia, validação, deduplicação, vínculo de contas, confirmação e auditoria. Nenhuma importação real na GAB-00. Proteger arquivos e logs; não subir a planilha ao repositório.
- Painel cotidiano, ramais, administração e aniversários. Tema claro/escuro/automático, mobile-first, uma única arquitetura CMAPP. Preferências e ações do protótipo são simulação local em memória; não persistem; nenhuma notificação externa.
## Roadmap
| Sprint | Entrega |
|---|---|
| GAB-00 | Decisões, protótipo visual e aprovação |
| GAB-01 | Cadastro institucional, unidades, política de acesso e desenho de backend; revisão e autorização antes de alterar |
| GAB-02 | Importação com simulação, conciliação e confirmação |
| GAB-03 | Painel Gabinete e Agenda |
| GAB-04 | Ramais, administração de externos |
| GAB-05 | Favoritos, ficha e ações rápidas |
| GAB-06 | Aniversários, painéis e push configurável |
| GAB-07 | Revisão cadastral e qualidade |
| GAB-07.1 | Fonte cadastral única, órgãos externos, ramais, divisões e foto do perfil no card/ficha; integração inicial demonstrativa sem backend |
| GAB-09 | **HML v1.13.43-H.1 integrado, pendente homologação visual**: qualidade, acessibilidade, isolamento de sessão, desempenho demonstrativo e PWA |
| GAB-08 | **Adiada para backlog futuro**: PDF e vCard autorizados, sem data; não bloqueia GAB-09 ou Gestão |
## Gate
GAB-00 é HTML independente, dados integralmente sintéticos, sem Firebase, acesso real, persistência ou integração operacional. Referência visual: identidade atual do CMAPP e padrões Users/Contacts; pacote original do template não inspecionado nesta entrega. Sem alterações no shell, backend, HML operacional ou PRD. Antes de GAB-01: homologar protótipo, validar SAN-01 em dispositivo real, revisar contrato atual de contas/Rules/Functions, confirmar mapeamentos e aprovar alterações específicas do backend. Não promover PRD.

## Atualização de decisão (21/11/2026): identidade única e fotografia

A GAB-07 de novembro é apenas um CRUD em memória para testes do frontend. A solução final **não** terá cadastros duplicados de uma pessoa em Agenda, DSIPS, RH ou Gestão. Usuários cadastrados compõem a Agenda, divisões são referenciadas do cadastro da Gestão, e responsáveis da DSIPS devem manter os identificadores atuais. O Gabinete será dono dos cadastros de órgãos externos, contatos externos e ramais. A fotografia já cadastrada pelo usuário em **Meu Perfil** deverá ser a mesma exibida no card e na ficha da Agenda, com fallback por iniciais e leitura autorizada. A integração da fotografia ainda não foi feita.

Fonte normativa detalhada: [DP-GAB-UNICIDADE-CADASTRAL-FOTOS](./DP-GAB-UNICIDADE-CADASTRAL-FOTOS.md). Implementação de backend, privacidade, vinculação e migração depende de autorização específica após revisão das regras e funções implantadas. Nenhuma alteração de dados reais foi feita.

## Repriorização aprovada (21/11/2026)

O usuário decidiu **adiar a GAB-08 (exportação PDF/vCard)** para implementação futura. Não implementá-la automaticamente na sequência da GAB-07.1. Próximos passos: homologar visualmente a GAB-07.1 em Android/desktop/PWA, realizar a **GAB-09** (qualidade integrada, acessibilidade, testes de acesso, regressões e ajustes UX/UI) e então avançar para **Gestão e o cadastro institucional único**, respeitando o bloqueio de alterações de backend até autorização específica. A GAB-08 não integra os critérios de aceite da GAB-09 nem bloqueia essa transição.

## GAB-09 | Integração ao frontend HML (21/11/2026)

Versão candidata `v1.13.43-H.1`: controles de foco/teclado, mensagens de validação, ficha de contato atualizada quando a fonte muda, isolamento da lista de divisões por sessão, correção do avatar, melhoria mobile e PWA. Testes em JavaScript e simulações de UI passaram, mas **Android, desktop e PWA autenticados não foram homologados**. [Roteiro GAB-09](./GAB-09-HOMOLOGACAO.md). Depois, avançar a Gestão, mantendo GAB-08 como backlog futuro e backend suspenso até autorização.
