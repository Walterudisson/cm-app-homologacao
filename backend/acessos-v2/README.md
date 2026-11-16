# Backend de gestão de acessos v2

Preparado e testado localmente. Não publicado; não altera a operação HML/PRD.
A rota gestao-v2/ conecta o cliente js/services/acessos-v2.service.js aos endpoints preparados.
Ela exige conta explicitamente migrada; não contém pessoas fictícias nem habilita usuários reais.

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
é consultado por esses endpoints. Gestão de dados cadastrais/Authentication tem adaptador v2 separado em contas.cjs.
Conta nova nasce sem acessos operacionais, delegações ou papel administrativo.

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
| cmappListarDivisoesAcesso | nenhuma | Divisões ativas permitidas ao gestor |
| cmappCriarConta | nome, email, lotacao, operacaoId | UID e e-mail da conta básica |
| cmappAtualizarConta | uid, nome, lotacao, operacaoId | UID, revisão e sincronizado |
| cmappAlterarEstadoConta | uid, ativo, operacaoId | UID, revisão e sincronizado |
| cmappPrepararRecuperacao | uid | E-mail autorizado para recuperação padrão |

Auditoria consultada é de concessões/delegações, não de dados de negócio. O resultado indica
janelaConsultada=100; filtros podem resultar em menos eventos ou nenhum. Não equivale a pesquisa
completa de todo o histórico. Paginação ampla desse histórico fica para a integração da tela.

## Transações e reenvio

Concessão/revogação e designação/remoção de delegação atualizam cmappAcessos, incrementam a revisão,
atualizam usuarios.autorizacaoRevisao e criam evento e recibo na mesma transação. A nova tela acompanha autorizacaoVersao e autorizacaoRevisao para atualizar a sessão. Os adaptadores de operação
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
O preparador copia a política para .mjs dentro do pacote Functions e registra os 21 endpoints (13 de gestão e oito operacionais):

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
78 cenários de integração incluem autenticação, campos forjados, escopos, perfil TI, revogação em sessão,
conta inativa, idempotência, duplicidade, concorrência, projeções, paginação, auditoria filtrada e Rules.
230 verificações frontend/política/preparação de pacote continuam aprovadas.

## Bloqueios de ativação — obrigatórios antes de migrar qualquer usuário real

1. Identificar explicitamente o UID do Superadmin inicial por ambiente. Nenhuma API deste serviço
   promove admin legado a Superadmin ou se habilita por conta própria.
2. Gerar simulação de equivalências com usuários reais e revisar divergências. Preparar backup,
   aplicação idempotente e reversão versionada. O analisador legado não é um script de aplicação.
3. Publicar e verificar a proteção dos nove endpoints legados preparada em legado.cjs. O preparador
   local registra wrappers, que bloqueiam ator/alvo marcado e respeitam legadoBloqueado. As verificações
   dos wrappers ficam fora das transações antigas: bloquear manutenção e drenar chamadas em andamento
   antes de migrar, para impedir corrida com uma requisição iniciada sob a versão anterior.
4. Aplicar política às operações de Patrimônios/DSIPS, consultas/Rules e projeções de auditoria. Separar
   histórico de movimentações de auditoria de cadastros/saldo para o Operador DSIPS.
5. Homologar telas e sessão reais após resolver os itens anteriores. A rota gestao-v2/ já acompanha
   revisão e bloqueia sessão alterada, mas não substitui ainda as telas operacionais dos módulos.
   Conta marcada v2 nunca deve usar união com perfil legado.
6. Preparar deploy rastreável sem credenciais permanentes expostas. Este código não fornece deploy
   automático nem substitui a autorização de produção.

Enquanto esses itens não forem concluídos, frontend, Functions e Rules publicados permanecem intactos.

## Contas, Authentication e limites de consistência

contas.cjs separa identidade, dados da conta e autorização. Criação reserva operação e UID determinístico;
uma repetição não associa outra conta já existente pelo mesmo e-mail. Senha aleatória não é exposta.
A recuperação registra a intenção no servidor e a tela solicita ao Firebase Auth o e-mail padrão; não
registra token ou link. Desativação conserva concessões e histórico, bloqueia a conta no Firestore e tenta
bloquear Authentication/revogar tokens. Falha nessa sincronização nunca reativa a conta no aplicativo.
Reenvio confirmado não repete efeitos externos antigos, inclusive após uma reativação posterior.

Auth e Firestore não têm transação conjunta. Uma falha entre criação Auth e confirmação Firestore pode
produzir identidade Auth reservada sem conta no aplicativo; o mesmo operacaoId permite retomada. Falta
implementar reconciliação administrativa de reservas abandonadas. Sincronizações concorrentes de Auth
podem ficar divergentes: ainda falta outbox/serialização por UID e reconciliação antes de liberar ciclo de
vida de contas em produção. O sinal sincronizado=false é explícito na resposta e na interface.

## Transição local e interface

scripts/preparar-rules-transicao-v2.mjs prepara somente um arquivo local compatível de Rules. Ele bloqueia
privilégios legados de contas com qualquer autorizacaoVersao, preservando consulta do próprio perfil.
Não concede acesso direto aos dados de negócio. DSIPS v2 usa os adaptadores callable; Patrimônios
ainda depende da conclusão das operações e navegação. Não executar migração real antes de homologar
integralmente os módulos necessários à conta.

O bootstrap legado redireciona contas v2 para gestao-v2/ e não interpreta seu perfil antigo. A interface
consulta diretório paginado, escopos e histórico reais, distingue conta não migrada e mantém dados fora de
HTML interpolado. Seleção de divisões usa catálogo do servidor. Usuário básico recebe Meu perfil.
Tema Claro/Escuro/Automático está implementado na nova gestão e na rota DSIPS v2, com preferência local; a adaptação dos
estilos do restante do CMAPP permanece pendente. Testes de DOM não substituem homologação visual em
Android/desktop. A publicação final também requer revisão do cache/PWA e identificação de versão.

## Operações de negócio — continuação

Backend DSIPS v2 e consulta patrimonial por ID preparados em ../operacoes-v2/README.md. A política
é verificada dentro da transação de estoque, cautela, devolução e recibo; consultas são paginadas e
filtradas. Restam mutações/listagem patrimoniais, inventários e conexão das telas patrimoniais.

### Atendimento DSIPS integrado na rota v2 — 16/11/2026

A rota operacoes-v2/ está conectada ao cliente operacional e aos controladores compartilhados de
cadastros, estoque e PDV. Autorização é injetada por ação, sem perfil fictício de admin. Há paginação
com limite explícito para catálogos, histórico cronológico com carregamento anterior, cancelamento de
respostas tardias, limpeza na saída e temas Claro/Escuro/Automático. A gestão oferece link conforme
consulta operacional. Código no PR de desenvolvimento; ainda sem publicação ou migração real.
Detalhes, limites de volume e índice necessário em backend/operacoes-v2/README.md.

### Backend de operações patrimoniais — 16/11/2026

Cinco endpoints adicionais preparados: listagem por divisão, conferência, sugestão de destino e
aprovação/rejeição de transferência ou sugestão. Há 26 endpoints no empacotamento local. Fonte atual,
política e revisão do bem são lidas na transação, com histórico/evento/recibo atômicos. A listagem exige
preparação integral da localização efetiva; o corte do módulo bloqueia caminhos legados para impedir
escritores que não mantenham o índice. Não foram aplicadas marcas, migrados dados ou publicados serviços.
Ver backend/operacoes-v2/PATRIMONIOS.md. Restam controladores patrimoniais, ciclos de inventário e migração.

### Telas e ciclos patrimoniais preparados — 16/11/2026

A rota patrimonios-v2/ conecta o fluxo essencial por plaqueta digitada, consulta/relação, conferência,
sugestões e fila aos serviços v2. Inventários têm fechamento e reinício em lotes retomáveis, reabertura
justificada, consolidação de todas as divisões e fotografia/CSV conforme permissão. Há 31 endpoints.
DSIPS e Patrimônios compartilham o bootstrap de sessão. Ver backend/operacoes-v2/INVENTARIOS.md.
Restam paridade dos recursos patrimoniais legados (câmera/OCR, filtros/indicadores e relatórios completos),
reconciliação Auth, migração/backup/reversão e homologação real. Não há deploy ou ativação nesta etapa.

### Leitor, filtros e relação CSV preparados — 16/11/2026

A área patrimonios-v2 reutiliza o controlador homologado de câmera/barras/OCR, com invalidação de
capturas atrasadas por geração/contexto. Método de reconhecimento é preservado na conferência.
Busca e situação são filtradas na página autorizada; indicadores identificam os registros carregados.
A relação pode ser exportada em CSV com permissão verificada por página, limites explícitos e sem
arquivo parcial após erro ou troca de sessão. Ver backend/operacoes-v2/LEITURA-RELACAO.md.
Restam indicadores/ordenações/filtros avançados e relatórios oficiais, homologação de hardware e conta
real, reconciliação Auth e migração/backup/reversão. Não há deploy operacional nesta etapa.

### Indicadores e CSV da Relação comparados ao legado — 16/11/2026

O resumo da abrangência usa agregações no servidor, com autorização/preparação na mesma transação,
independentemente da paginação. Foram reproduzidos CSV geral, pendentes e filtrado, com os sete campos
legados. Busca numérica usa prefixo no banco; grupos da relação têm Expandir/Recolher. Há 32 endpoints
e oito índices preparados. A comparação não encontrou PDF/XLSX nesse fluxo legado; não criar uma
pendência de “relatórios oficiais” adicional sem formato confirmado. Ver PARIDADE-RELACAO.md.
Restam reconciliação Auth, migração/backup/reversão, conferência final de recursos de plataforma e
homologação real/desempenho/cache/PWA. Não houve deploy operacional ou migração nesta etapa.
