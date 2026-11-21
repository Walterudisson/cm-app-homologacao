# GEST-03 | Usuários, funções e abrangência de acesso

**Candidata HML:** `v1.13.46-H.1` · **Data:** 21/11/2026. **Escopo:** frontend, visualização e organização do fluxo legado de Gestão de usuários.

## Referência visual utilizada

O arquivo **AppDashboard-pro(1).zip**, já fornecido, foi aberto e consultado diretamente. Componentes observados:

- `roles.html`: cards para papéis/funções e matriz visual por módulo com colunas **View, Create, Edit, Delete, Admin**.
- `users.html`: diretório de usuários, status, papéis, filtros e ações.
- `users-edit.html`: separação visual entre dados pessoais, informações profissionais, papéis/equipes e segurança.

A GEST-03 adapta a organização em **cards, filtros e informações de acesso** à identidade existente do CMAPP. **Nenhum script ou dado do template foi copiado para o projeto**. O mapa GEST-01 mantém operações específicas (como cautela, devolução, aprovação e consulta privada), em vez de reduzir todas as permissões a CRUD.

## Entrega nesta candidata

1. **Gestão > Usuários e acessos:** três cards explicativos (Identidade, Perfil/Função, Abrangência), seguindo a separação do template.
2. **Filtro de função vinculada:** Todas / Com função vinculada / Somente perfil-base, combinável com busca, perfil e status existentes. Mantém o filtro por permissão de consulta já aplicado pelo app, sem ampliar o conjunto de usuários.
3. **Ficha de usuário ampliada:** nome/status, perfil-base, função de acesso vinculada, situação do vínculo (nativo, cadastrado, inativo, não verificado), módulos visíveis conforme a função `modulosDoUsuario` de navegação legada, e permissões declaradas por perfil ou adicional individual.
4. **Rótulos honestos:** “Acesso global” foi substituído por “Por perfil/módulo” (lista) e explicação da abrangência legada (ficha), pois não há autorização global demonstrada para todos os recursos.
5. **Prévia nos formulários existentes de criação/edição:** mostra perfil-base, função de acesso, divisões selecionadas e avisos de vínculo não verificado/inativo, ausência de divisões do Conferente e divergência entre perfil escolhido e perfil-base da função. **Nenhuma nova coluna ou operação é enviada aos serviços existentes.**
6. **Proteção de vínculo legado:** editar um usuário com função inativa ou removida da lista de opções não apaga silenciosamente o identificador armazenado. A opção é preservada como vínculo anterior e não é ofertada na criação.
7. **Privacidade e segurança:** a projeção não grava, consulta ou exporta dados de terceiros; somente usa os registros já carregados e autorizados pela tela. Não interpreta permissões da função personalizada como direitos concedidos. Dados do RH e telefones particulares do Gabinete não foram integrados.

**Atenção:** os direitos declarados em `FUNCOES_NATIVAS` e `usuario.permissoes` são apenas o catálogo de frontend legado. **Não atestam Rules/Functions nem se aplicam automaticamente às funções personalizadas.** A leitura de módulos se refere à navegação, não ao direito de consultar dados privados.

## Cenários de homologação manual (Android e desktop)

| ID | Teste | Critério |
|---|---|---|
| GEST-03-01 | Entrar no HML como superadmin | Login funcional e versão `v1.13.46-H.1` |
| 02 | Abrir Gestão > Usuários e acessos | Cards Identidade / Perfil e função / Abrangência |
| 03 | Filtrar Todos os usuários | Mesma listagem permitida antes da GEST-03 |
| 04 | Filtrar Com função vinculada | Somente contas com `funcaoId` preenchido |
| 05 | Filtrar Somente perfil-base | Somente contas sem função personalizada vinculada |
| 06 | Combinar função, perfil e status | Interseção dos filtros sem mostrar contas não autorizadas |
| 07 | Buscar nome ou e-mail | Busca e paginação antigas preservadas |
| 08 | Abrir usuário Conferente | Perfil, divisões, módulos da navegação e chaves legadas |
| 09 | Abrir usuário Gestor | Rótulo por perfil/módulo, sem declarar acesso global irrestrito |
| 10 | Abrir usuário Administrador | Declarações nativas sem confundir com backend autorizado |
| 11 | Abrir usuário com função personalizada ativa | Vínculo explicado; não somar automaticamente direitos da função |
| 12 | Abrir usuário com `funcaoId` não consultado | Estado não verificado, sem prometer que função foi aplicada |
| 13 | Abrir função inativa ainda vinculada | Estado de vínculo inativo |
| 14 | Abrir usuário com `usuario.permissoes` adicionais | Origem diferenciada das chaves legadas declaradas |
| 15 | Abrir usuário desativado | Aviso claro; nenhuma concessão presumida |
| 16 | Abrir modal de novo usuário | Prévia de vínculo e avisos, sem duplicar pessoa existente |
| 17 | Selecionar perfil Conferente sem divisão | Aviso informativo de abrangência |
| 18 | Atribuir divisões a Conferente | Prévia mostra as divisões selecionadas |
| 19 | Selecionar função personalizada | Perfil-base é ajustado como no fluxo atual, com aviso |
| 20 | Alterar perfil após selecionar função | Aviso de divergência com perfil-base da função |
| 21 | Selecionar perfil Administrador | Aviso de revisão adicional |
| 22 | Cancelar novo usuário | Nenhuma conta criada |
| 23 | Editar usuário de teste com função ativa | Prévia corresponde ao vínculo existente |
| 24 | Editar usuário de teste com função inativa ou ausente | Referência antiga preservada na seleção, sem troca silenciosa |
| 25 | Cancelar edição | Nenhuma escrita no serviço de usuários |
| 26 | Gestão > Funções e permissões | Matriz GEST-01 e prévia de impacto GEST-02 preservadas |
| 27 | Android Chrome, teclado aberto | Cards e modais sem cortes, filtro acessível |
| 28 | PWA Android após atualizar | Versão correta, cache `v1.13.46-h.1-gest03`, login habilitado |
| 29 | Alternar tema claro/escuro/automático | Contraste, foco e badges legíveis |
| 30 | Regressão Gabinete | Agenda, Ramais e Cadastros continuam íntegros |
| 31 | Regressão DSIPS | Cautelas, materiais, responsáveis e devolução íntegros |
| 32 | Regressão Patrimônios | Consulta, Painel e inventários íntegros |
| 33 | Logout e outra conta | Não exibir informações da sessão anterior |
| 34 | Login Gestor sem privilégios admin | Mesmas restrições de consulta/edição de usuários de antes |
| 35 | Login sem acesso à Gestão | Rota e detalhes não ficam disponíveis |

**Não fazer alterações reais de concessões sem autorização.** Utilizar contas de teste, sem senhas ou dados pessoais no GitHub.

## Validação técnica realizada

- Modelo puro de vínculo de usuários, filtros e prévias em `js/modules/gestao/usuarios-acessos-model.js`.
- Testes de unidade em `tests/gestao-usuarios-acessos.test.mjs`, cobrindo perfis nativos, função personalizada, função inativa, chaves adicionais, divisão, status e divergência de perfil.
- Simulações locais de renderização da ficha e prévia, sem login real.
- Regressão de bootstrap em `tests/gestao-login-bootstrap.test.mjs`, para impedir novo erro de inicialização.
- O HTML continua sendo uma página do CMAPP, não uma aplicação paralela do AppDashboard Pro.

## Gates mantidos

- Não alterar `js/core/permissoes.js`, `js/platform/modules.js`, `js/services/usuarios.service.js`, `js/services/funcoes.service.js`, Firestore Rules, Functions ou PRD nesta sprint.
- Não declarar que o vínculo `funcaoId` já aplica permissões no backend.
- Não adicionar exportação de dados pessoais, importação do efetivo ou criação automática de pessoas.
- HML integrado **não equivale** a homologação Android/desktop/PWA autenticada.

**Próxima frente:** GEST-04: contrato do cadastro institucional único de pessoas/divisões/responsáveis; alterações estruturais só após autorização de backend.
