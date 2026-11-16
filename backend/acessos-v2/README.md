# Backend de gestão de acessos v2

Preparado e testado localmente. Não publicado; não altera a operação HML/PRD.
A nova tela ainda não importa o cliente js/services/acessos-v2.service.js.

## Contrato e fonte de autorização

Autenticação Firebase fornece request.auth.uid. A conta em usuarios/{uid} precisa existir, estar ativa
para operar e possuir autorizacaoVersao=2. cmappAcessos/{uid} contém a política v2 (uid, versao, ativo,
papelPlataforma, permissoesPlataforma, atribuicoes, delegacoes e revisao). A conta e a política são lidas
do servidor em cada chamada; nenhuma autoridade vem do body ou de perfil legado.
Versão ausente/desconhecida e documento ausente não recorrem ao modelo anterior.

Recebimento de acesso exige conta e política ativas. Revogação pode atingir conta inativa sem reativá-la.
Gestores consultam somente os acessos abrangidos pelos limites atuais. A lista de pessoas é paginada,
retorna ativos para gestores e não expõe e-mail, perfil ou concessões de outras pessoas. Administradores
com contas.consultar recebem e-mail e situação das contas, inclusive inativas; conteúdo operacional não
é consultado por esses endpoints. Gestão de dados cadastrais/Authentication ainda usa adaptadores legados
e precisará ser migrada antes de ativar o modelo novo.

## Endpoints preparados

| Endpoint | Entrada específica | Resultado |
| --- | --- | --- |
| cmappMeusAcessos | nenhuma | Política atual do próprio usuário |
| cmappConsultarAcessos | uid | Acessos do alvo, filtrados conforme autoridade |
| cmappListarUsuariosAcesso | limite (1–50), cursor opcional | Projeção de pessoas e proximoCursor |
| cmappConsultarAuditoriaAcesso | uid opcional | Eventos visíveis na janela dos 100 mais recentes |
| cmappConcederAcesso | uid, operacaoId, atribuicao | Identificador e revisão |
| cmappRevogarAcesso | uid, operacaoId, id | Identificador e revisão |
| cmappDesignarDelegacao | uid, operacaoId, delegacao | Identificador e revisão |
| cmappRemoverDelegacao | uid, operacaoId, id | Identificador e revisão |

Auditoria consultada é de concessões/delegações, não de dados de negócio. O resultado indica
janelaConsultada=100; filtros podem resultar em menos eventos ou nenhum. Não equivale a pesquisa
completa de todo o histórico. Paginação ampla desse histórico fica para a integração da tela.

## Transações e reenvio

Concessão/revogação e designação/remoção de delegação atualizam cmappAcessos, incrementam a revisão,
atualizam usuarios.autorizacaoRevisao e criam evento e recibo na mesma transação. O front futuro deverá
acompanhar autorizacaoVersao e autorizacaoRevisao para atualizar a sessão. Os adaptadores de operação
precisarão validar a autorização vigente mesmo se o cliente ainda mostrar botões antigos.

cmappAcessosEventos preserva operador, alvo, objeto, antes/depois, data de servidor e revisão.
cmappAcessosOperacoes guarda fingerprint, resultado e objeto para reenvio idempotente. Mesmo após
receber um recibo, a autoridade atual é verificada novamente; um gestor revogado não reutiliza pedidos.
Concorrência no alvo é resolvida pela transação, sem sobrescrever atribuições de outra operação.
OperacaoId deve ser estável no reenvio do mesmo formulário. Outro conteúdo com o mesmo ID é recusado.
Atribuição duplicada é recusada inclusive quando o identificador anterior difere. Há limite de 100
atribuições/delegações por conta para manter documentos limitados.

As Rules HML atuais já negam leitura/escrita direta dessas três coleções. Testes verificam isso também
para admin legado. As consultas são via callable; futuras Rules de negócio precisam consultar a política
autoritativa e impedir fallback quando a conta estiver em v2.

## Preparação de pacote local

Requer Node 22. O código de política é único: js/platform/access/catalogo.js e politica.js.
O preparador copia a política para .mjs dentro do pacote Functions e registra os oito endpoints:

```bash
node scripts/preparar-backend-acessos-v2.mjs /caminho/para/pacote/functions
```

O destino precisa ser um pacote Functions CMAPP compatível. A operação modifica arquivos locais do
destino e é repetível: atualiza o módulo e não duplica o registro no index.js. Não faz deploy nem acessa
credenciais. Os testes usam diretório temporário, verificam importação da política compilada e registro.
Não é necessário executar esse comando no ambiente do usuário nesta etapa.

## Testes

CMAPP_INTERNAL_ROOT deve apontar ao pacote interno de teste com dependências e Rules legadas.
Firestore Emulator local em 127.0.0.1:8088, projeto exclusivo demo-cmapp-acessos-v2; o teste recusa rodar
sem esse emulador. Java é necessário. Rodar o arquivo servico.integration.test.cjs por emulators:exec.
22 cenários de integração incluem autenticação, campos forjados, escopos, perfil TI, revogação em sessão,
conta inativa, idempotência, duplicidade, concorrência, projeções, paginação, auditoria filtrada e Rules.
191 verificações frontend/política/preparação de pacote continuam aprovadas.

## Bloqueios de ativação — obrigatórios antes de migrar qualquer usuário real

1. Identificar explicitamente o UID do Superadmin inicial por ambiente. Nenhuma API deste serviço
   promove admin legado a Superadmin ou se habilita por conta própria.
2. Gerar simulação de equivalências com usuários reais e revisar divergências. Preparar backup,
   aplicação idempotente e reversão versionada. O analisador legado não é um script de aplicação.
3. Substituir/guardar também os endpoints administrativos antigos (criarUsuario, atualizarUsuario,
   alterarEstadoUsuario e definirModulosUsuario): eles hoje verificam perfil legado. Não ativar marca v2
   enquanto caminhos antigos ainda puderem conceder poder ou alterar contas fora da nova autoridade.
4. Aplicar política às operações de Patrimônios/DSIPS, consultas/Rules e projeções de auditoria. Separar
   histórico de movimentações de auditoria de cadastros/saldo para o Operador DSIPS.
5. Integrar telas e sessão, manter fontes antigas e novas separadas por versão, testar em HML e só então
   aplicar marcadores e documentos v2 reais. Conta marcada v2 nunca deve usar união com perfil legado.
6. Preparar deploy rastreável sem credenciais permanentes expostas. Este código não fornece deploy
   automático nem substitui a autorização de produção.

Enquanto esses itens não forem concluídos, frontend, Functions e Rules publicados permanecem intactos.
