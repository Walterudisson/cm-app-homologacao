# DP-GAB-UNICIDADE | Fonte cadastral única, referências entre módulos e foto de perfil

**Decisão:** 21/11/2026. **Estado:** diretriz aprovada para evolução do Gabinete; não equivale à implementação de persistência ou permissões. **Escopo:** CMAPP HML, sem alterações no backend e sem promoção para PRD.

## Regra central
**Uma pessoa institucional, uma identidade cadastral e vários módulos consumidores.** É proibido criar cadastro paralelo da mesma pessoa no Gabinete, DSIPS, Gestão ou qualquer outro módulo. O cadastro da Agenda é uma **projeção autorizada** de registros institucionais já existentes, não uma segunda tabela de pessoas.

## Donos dos dados e relacionamentos

| Recurso | Dono do dado / fonte | Uso no Gabinete | Regras |
|---|---|---|---|
| Pessoas e usuários existentes | Gestão: `usuarios/{uid}`; evolução futura para cadastro institucional de pessoas com `pessoaId` estável e vínculo `uid` opcional | Pessoa na Agenda, ficha de contato, foto e aniversariante, conforme autorização | Não recriar identidade para alguém já cadastrado; manter UID, permissões, histórico e status |
| Pessoas institucionais sem conta | Cadastro institucional único proposto na GAB-01, sob responsabilidade da Gestão | Podem aparecer na Agenda sem conta de login | Cadastrar pessoa **não** cria conta Firebase Auth automaticamente |
| Responsáveis DSIPS | Identificadores atuais, inclusive `responsavelId`, fornecidos por `dsipsListarResponsaveis` | São a mesma pessoa/usuário da instituição quando houver vínculo; sem duplicar em cautelas | Verificar mapeamento real `responsavelId`↔UID/pessoaId antes de alterar; preservar cautelas e histórico |
| Divisões | Coleção atual `divisoes`, gerida pela Gestão de Divisões | Aparecem como unidade/setor e agrupamento do diretório | Selecionar divisão existente por identificador, não digitar cópia de nome nem recriar divisão no Gabinete |
| Organograma mais amplo | Evolução proposta `unidadesOrganizacionais` vinculada à divisão existente, quando necessária | Exibir hierarquia validada | Não substituir, duplicar ou renomear IDs e escopos atuais; validar divergências GCM/GAB/SCCM/DCRI |
| Ramais | Cadastro funcional do Gabinete (futuro `agendaRamais`) | Ações Copiar/Ligar, vínculo com setor e opcionalmente com pessoas | Ramal pode ser compartilhado, pode pertencer ao setor sem pessoa e admite múltiplos vínculos |
| Órgãos externos | Cadastro próprio do Gabinete (modelo proposto `agendaOrgaosExternos`, nome a aprovar) | Diretório de órgãos, endereços e formas de contato; contatos vinculados ao órgão | Não criar `usuarios`/Firebase Auth ou pessoa institucional para órgão externo |
| Contatos externos | Cadastro próprio, referenciado pelo órgão externo | Telefones, responsáveis externos quando autorizados, e-mail, ramal externo | Evitar repetição do nome/endereço do órgão em cada contato; referências estáveis |
| Foto de usuário | Foto do próprio usuário existente no Firebase Storage: `usuarios/{uid}/perfil/avatar` | Mesmo retrato no Meu Perfil, cards e fichas da Agenda, se autorizado | Uma única imagem, sem novo upload no Gabinete nem cópia da URL em cada ficha |

## Fotografia nos cards e fichas

- **Card da Agenda:** avatar circular/rounded compacto ao lado do nome, posto/graduação, nome de guerra e unidade. Sem foto cadastrada: iniciais como fallback.
- **Ficha do contato:** a mesma foto de perfil, em destaque maior. Alterações no Meu Perfil refletem na Agenda; Gabinete não mantém segunda fotografia.
- **Sem conta de acesso:** utilizar iniciais na prévia; eventual foto da pessoa sem login exigirá política de cadastro institucional própria, sem duplicidade.
- **Órgãos externos:** ícone institucional e, futuramente, logomarca controlada, sem confundir com foto pessoal.
- **Privacidade:** a função atual `obterUrlFotoPerfil(uid)` usa `getDownloadURL`; não é autorização para enviar URL permanente ou token de download a usuários sem permissão. Antes da integração real, rever regras do Storage, mecanismo de entrega privada/temporária e escopo de leitura. Não usar arquivo do GitHub Pages, cache público ou logs para fotos.
- Miniatura otimizada, carregamento sob demanda, fallback, estados de carregamento e remoção/atualização de cache quando a foto muda.

## Tela de Cadastros do Gabinete

A GAB-07 atual é **uma simulação de UI em memória com 10 contatos sintéticos**, sem uso de `usuarios` ou `divisoes` reais. Ela valida a interação, não a arquitetura persistente final.

Estrutura recomendada para o CRUD definitivo:

1. **Pessoas internas (consulta/vínculo):** lista usa o cadastro institucional único e permite ir à Gestão para alterar identidade, posto, unidade, situação e permissões. Campos de contato específicos podem ser editados pelo titular ou Gestor/Gabinete conforme concessão expressa e Rules/Functions.
2. **Divisões/unidades (seleção e consulta):** reutiliza a gestão atual e seus IDs; edição da divisão permanece com o módulo Gestão.
3. **Órgãos externos (CRUD próprio):** criação, edição, arquivamento/restauração, detecção de duplicidade, unidade hierárquica opcional, múltiplos meios de contato.
4. **Ramais (CRUD próprio):** referenciam divisão/unidade, órgão/serviço e pessoas quando aplicável, sem criar uma pessoa nem divisão.
5. **Qualidade e revisão:** acompanhamento de 90 dias, pendências e auditoria por registro com autorização administrativa.

### Identidade, situação e conta
O vínculo `pessoaId ↔ uid` deve ser **único**, sem sobrescrever um `uid` existente. Situação funcional da pessoa e habilitação do login são conceitos separados. Nem a ausência em uma planilha nem a exclusão/arquivamento do contato podem revogar conta, apagar foto, cancelar cautela ou excluir histórico.

### Autorização e privacidade
- Consulta à Agenda e gestão de cadastros mediante **concessão expressa** e checagem no backend, inclusive para administradores.
- Telefone particular só na projeção autorizada para Gabinete ou administradores explicitamente habilitados; não carregar dados privados no navegador para filtrar no cliente.
- CPF e nascimento completo não são dados da Agenda. Aniversário somente dia e mês, quando autorizado.
- O histórico de cautelas permanece íntegro ao mudar nome, unidade, status de login ou vínculo da pessoa.
- Não publicar dados reais, imagens ou tokens em JavaScript estático, GitHub Pages, precache, arquivos de teste ou repositório.

## Sequência aprovada para o roadmap

**GAB-07.1 / integração de fontes cadastrais (frontend e contrato):** adequar a navegação e UX dos cadastros a Pessoas, Divisões, Órgãos Externos e Ramais; avatar/iniciais no card e ficha; demonstrar referência única em mock, sem backend. Registrar matriz de campos e IDs estáveis.

**Gate de backend futuro:** inspecionar Rules/Functions efetivas, comprovar identidade dos responsáveis DSIPS, definir projeções e endpoints, Storage de foto, papéis, auditoria, migração e conciliação de dados antes de autorizar qualquer gravação.

**GAB-08:** PDF e vCard gerados a partir da mesma projeção autorizada, nunca de uma cópia ou coleção privada.

**GAB-09:** regressão integrada nos módulos e PWA, Android/desktop, privacidade, navegação e auditoria.

## Critérios de aceite
- Uma edição de nome/foto da pessoa repercute na Agenda, e os vínculos DSIPS permanecem válidos sem regravar cautelas.
- A alteração do nome da divisão aparece onde ela é referenciada, sem duplicação de divisão.
- O Gabinete pode manter órgãos externos, contatos externos e ramais sem criar usuário interno fictício.
- Nenhum usuário recebe acesso a dado ou foto particular por ser administrador, responsável DSIPS ou integrante de uma unidade; concessões são explícitas.
- A GAB-07 demonstrativa não deve ser promovida como solução persistente enquanto não cumprir esses critérios.
