# GEST-02 | Prévia de impacto e edição segura de funções

**Candidata HML:** `v1.13.45-H.1` (21/11/2026). **Escopo:** apenas frontend no HML; não mudar regras ou dados de produção.

## Objetivo

Aprimorar o CRUD de funções personalizadas já existente, sem modificar sua persistência ou a semântica atual das permissões. Uma tela de função deve permitir distinguir **o que está configurado no cadastro** de **o que é efetivamente autorizado pelo backend**.

## Entregas GEST-02

1. **Prévia dinâmica de alterações** no modal de função:
   - Reconhece nova função, edição sem mudanças, mudança de nome/descrição, alteração de perfil-base, permissões adicionadas e retiradas.
   - Apresenta diferenças de configuração de forma legível antes de salvar, inclusive no celular.
   - Explica que o número de usuários vinculados e o efeito de autorizações no backend **não são calculados**. Nenhuma consulta extra de usuários é feita pela prévia.
2. **Confirmação antes da gravação no serviço legado**:
   - O botão **Salvar função** abre a confirmação do sistema com as diferenças; cancelamento não grava.
   - Alteração de perfil-base ou retirada de permissões usa confirmação de maior destaque.
   - Operações sem alterações não são reenviadas.
   - Após confirmar, revalida usuário/UID administrativo e se o editor continua aberto, para não enviar gravação iniciada em contexto diferente.
   - **A função existente continua sendo salva pelo mesmo serviço `funcoes.service.js`**, sem novas APIs ou permissões.
3. **Proteção dos dados legados**:
   - Somente as seis permissões **declaradas no catálogo atual** são selecionáveis.
   - Chaves históricas desconhecidas não são apresentadas como direitos validados nem descartadas silenciosamente ao editar outra informação.
   - Impede que a UI envie uma **nova** chave fora do catálogo vigente.
   - **Funções nativas continuam protegidas** e agora permitem inspecionar os nomes das permissões declaradas em detalhe, sem edição.
4. **Mobile e acessibilidade**: painel de diferenças acessível e adaptativo; foco de teclado nos detalhes; confirmação com quebras de linha legíveis, rolagem no diálogo e áreas de toque adequadas.
5. **Compatibilidade**: preservar fluxo do login corrigido na `v1.13.44-H.2`; aumentar versão do HML e cache PWA para `v1.13.45-h.1-gest02`.

## Testes de homologação manual

| ID | Procedimento | Esperado |
|---|---|---|
| GEST-02-01 | Abrir HML no Chrome com a conta administradora | Login habilitado, versão `v1.13.45-H.1` |
| 02 | Abrir Central > Gestão > Funções e permissões | Lista existente preservada, sem tela branca |
| 03 | Usar a matriz GEST-01 | Filtros e operações consultivas continuam funcionando |
| 04 | Abrir função nativa | **Ver permissões declaradas** exibe lista; edição protegida |
| 05 | Abrir função personalizada | Campos anteriores preenchidos e prévia diz sem alterações |
| 06 | Mudar somente descrição | Prévia indica alteração textual, sem diferenças de permissões |
| 07 | Selecionar nova permissão legada | Prévia mostra permissão incluída |
| 08 | Desmarcar uma permissão | Prévia mostra permissão removida |
| 09 | Alterar perfil-base | Prévia identifica perfil anterior e novo |
| 10 | Voltar campos aos valores originais | Prévia informa ausência de alterações |
| 11 | Tentar salvar sem mudanças | Nenhuma nova gravação; aviso informativo |
| 12 | Tentar salvar com zero permissões | Exibe validação; nenhum salvamento |
| 13 | Alterar função e clicar Salvar | Modal de confirmação resume as diferenças |
| 14 | Cancelar confirmação | Editor permanece aberto, dados inalterados no servidor |
| 15 | Confirmar edição válida | Usa serviço legado; função recarrega com os novos dados |
| 16 | Abrir Nova função | Prévia de nova função, campos limpos |
| 17 | Cancelar criação | Nenhuma função criada |
| 18 | Abrir função com chave histórica não reconhecida, caso exista | Aparece aviso e a referência é preservada em edição |
| 19 | Trocar de conta ou sair durante confirmação | Nenhuma gravação iniciada em conta posterior |
| 20 | Confirmar visualização Android no Chrome | Prévia, botões e diálogos cabem na tela com teclado aberto |
| 21 | Testar PWA Android após atualização | Cache `v1.13.45-h.1-gest02`, botão Entrar habilitado |
| 22 | Testar desktop e tema claro/escuro | Legibilidade, detalhes e foco |
| 23 | Login usuário sem acesso à Gestão | Não alcança lista nem editor de funções |
| 24 | Regressão Gabinete | Agenda, Ramais, Cadastros e fichas intactos |
| 25 | Regressão DSIPS | Painel, cautelas e consulta de materiais intactos |
| 26 | Regressão Patrimônios | Painel, relação e inventários intactos |
| 27 | Regressão Segurança | Login, logout e alteração de conta sem falhas |
| 28 | Regressão após refresh | PWA carrega sem tela branca; versão correta |

**Importante:** não editar funções reais sensíveis durante homologação de UX. Usar somente função de teste previamente autorizada. A prévia não valida Rules/Functions nem significa que direitos foram aplicados em usuários vinculados.

## Critérios técnicos de aceite

- Modelo puro `js/modules/gestao/funcoes-impacto-model.js` sem Firestore, Firebase Auth, escrita ou acesso a dados pessoais.
- Suite `tests/gestao-funcoes-impacto.test.mjs` cobre diferença, mudança de base, no-op, preservação de chaves desconhecidas e rejeição de chaves novas.
- Teste `tests/gestao-login-bootstrap.test.mjs` permanece e deve verificar que o controlador GEST-01 existe antes de ser usado na inicialização.
- Arquivos **`js/core/permissoes.js`**, **`js/services/funcoes.service.js`**, **`js/platform/modules.js`** e backend não devem ser modificados.
- **HML → testes autenticados → homologação explícita → somente então eventual promoção PRD**.
- Sem backend novo, sem mudança de matriz efetiva, sem alteração de conta, sem migração e sem dados pessoais em shell estático.

## Próxima frente

GEST-03, melhoria da visualização de usuários, funções, módulos e abrangência de acessos, preservando o cadastro institucional único. Implementação real de permissões por ação permanece bloqueada até GEST-06 e autorização específica.
