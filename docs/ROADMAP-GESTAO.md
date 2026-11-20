# Roadmap Gestão CMAPP
Decisão: evolução visual e operacional do módulo Gestão após saneamento e homologação integrada da base. Não alterar backend até segunda ordem. Gestão permanece área administrativa transversal, não concedendo acesso automático a módulos operacionais.
| Entrega | Escopo proposto | Restrição |
|---|---|---|
| GEST-01 | Revisar arquitetura de informação, Painel Gestão, atalhos e KPIs acionáveis, visibilidade por perfil; identidade visual consolidada | Frontend; dados autorizados existentes |
| GEST-02 | Gestão de usuários: pesquisa, filtros, paginação, cards compactos, detalhes, cadastro/edição e situação, clareza dos módulos atribuídos | Serviços existentes; sem ampliação de permissões |
| GEST-03 | Gestão de divisões: pesquisa, responsáveis principal/substituto com autocomplete, filtros, detalhes e estados | Serviços existentes |
| GEST-04 | Funções e permissões: matriz legível, agrupamento por módulo/funcionalidade, explicação de acessos efetivos e distinção gestão/operacional | Revisão UI com dados existentes; mudanças na política de autorização reservadas |
| GEST-05 | Padronizar tema claro/escuro/automático, acessibilidade, mobile, feedback, confirmação e auditoria consultável onde permitida | Tema e UI liberados; novos registros/consultas dependentes ficam suspensos |
| GEST-06 | Gestão de acessos granular, administradores por módulo, concessão/revogação, trilha de auditoria e revisão do modelo de autorização | Suspenso: backend/Rules; piloto V2 retirado pela SAN-01 |
| GEST-07 | Minha Conta: sessões/dispositivos e revogação remota | Suspenso: backend |
Primeiro revisar telas reais antes de definir cada sprint. Separar cadastro de pessoas de atribuição de acesso, aplicar menor privilégio, manter validação HML por perfil. Não promover PRD sem autorização.

SAN-01: interfaces experimentais Gestão V2/DSIPS V2 retiradas; seguir exclusivamente a estrutura operacional atual. A referência visual fictícia aprovada não é aplicativo nem autorização real.
