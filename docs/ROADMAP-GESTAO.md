# Roadmap Gestão CMAPP
Prioridade aprovada: Gabinete antes das evoluções de Gestão. As sete propostas de Gestão estão aprovadas; incorporar fundação cadastral e unidades em GAB-01, sem duplicar trabalho. Ver [GAB-00](ROADMAP-GABINETE.md).
| Entrega | Escopo |
|---|---|
| GEST-01 | Painel Gestão, atalhos e KPIs acionáveis |
| GEST-02 | Ficha administrativa de usuários, dados, acessos e histórico |
| GEST-03 | Divisões e responsáveis, integração com unidades organizacionais |
| GEST-04 | Matriz visual de funções e permissões |
| GEST-05 | Visão de módulos e acessos |
| GEST-06 | Padronização visual, temas, mobile, acessibilidade |
| GEST-07 | Organograma e estrutura hierárquica; aproveitar GAB-01 |
| GEST-08 | Gestão descentralizada de acessos |
| GEST-09 | Auditoria administrativa |
| GEST-10 | Segurança, sessões e dispositivos |
Gestão transversal não concede acesso automático a módulos. Alterações de backend/Rules, dados e autorização continuam condicionadas à autorização específica. Preservar menor privilégio, histórico e homologação por perfil. Não promover PRD sem autorização.
SAN-01: pilotos V2 retirados; uma única estrutura operacional. Proposta fictícia permanece referência. O roadmap anterior está preservado no histórico Git.


## GEST-06 | Diretório inspirado no AppDashboard Pro (v1.13.50-H.1)
**Status:** implementação frontend no HML; aguarda homologação autenticada em desktop, Android e PWA. Nenhuma promoção automática à PRD.

Referências examinadas do pacote licenciado: `users.html`, `users-view.html`, `users-edit.html` e `roles.html`. O código do template não foi transplantado, somente padrões visuais.

- Gestão > Usuários: alternar Lista/Cards, preservando filtros, paginação, perfil e divisão; cards responsivos e legíveis no celular.
- Ficha do usuário existente: duas abas funcionais, **Dados da conta** e **Acessos e vínculos**, reutilizando os dados já recuperados pela Gestão e o resumo consultivo legado.
- A alteração de visualização não tem persistência, gravação, autorização própria ou cadastros de pessoas adicionais. Padrões de acesso permanecem os mesmos.
- Fonte efetiva da listagem de usuários: consulta à coleção Firestore `usuarios` já existente, com UID do documento e filtros de permissão pré-existentes.
- Não importar registros demonstrativos do AppDashboard Pro para Firestore. Os dados de exemplo do Gabinete continuam explicitamente demonstrativos e serão substituídos somente depois de concluir contratos e controles de acesso.

### Transição planejada para backend e substituição dos placeholders
A retomada do backend exigirá autorização específica e uma sprint dedicada por contrato. Ordem recomendada:

1. **Inventário de fontes e campos:** mapear `usuarios/{uid}`, divisões, funções, vínculos, modelos de contato do Gabinete, referências DSIPS e futura estrutura RH. Identificar cada placeholder e fonte demonstrativa antes de migrar.
2. **Pessoa institucional única:** criar identidade estável (`pessoaId`) sob validação expressa. Contas e pessoas não são sinônimos. Nunca mesclar pessoas só por nome, e-mail ou matrícula. Estabelecer vínculo explícito entre `pessoaId` e UID.
3. **Autorização server-side:** definir matriz por módulo/recurso/ação/escopo, com regras no Firestore/Functions, concessão e revogação auditáveis. O painel consultivo atual não é autorizador.
4. **Integração Gabinete:** substituir exemplos por contatos derivados de pessoas, ramais, órgãos e divisões autorizados. Telefone particular deve ser resolvido pelo servidor apenas para quem possui permissão expressa. Não entregar campo privado e ocultá-lo só com CSS/JS.
5. **Integração DSIPS/RH:** cautelas e efetivo referenciam a pessoa existente, sem criar diretório paralelo. Campos de RH devem respeitar restrições específicas de acesso.
6. **Migração e homologação:** usar HML e dados institucionais permitidos, amostra validada, backup, regras de rollback, testes por perfil, busca, escopo, alteração de sessão e regressões existentes; somente após autorização promover para PRD.

**Condições de aceite do GEST-06:** login superadmin, dados atuais visíveis em lista e cards, filtros e paginação estáveis, abertura da ficha, alternância entre abas, ações administrativas existentes preservadas, nenhum usuário extra criado, troca de sessão sem vazamento, tema claro/escuro e smartphone sem rolagem horizontal.
