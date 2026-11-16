# Operações de negócio com autorização v2

Implementação preparada no PR de desenvolvimento; sem deploy ou migração. A nova rota operacoes-v2/ conecta os serviços
aos controladores compartilhados; as telas publicadas continuam na versão homologada. A gestão v2 continua isolada até a conclusão das dependências abaixo.

## Entrega

Os oito endpoints DSIPS/consulta individual abaixo permanecem no registro. A continuação de
Patrimônios acrescenta cinco operações, totalizando 26 endpoints de gestão e negócio:

| Endpoint | Ação exigida | Comportamento |
| --- | --- | --- |
| cmappDsipsSalvarCadastro | cadastrar ou alterar; inativar quando aplicável | Categoria, local e material |
| cmappDsipsRegistrarSaldoInicial | saldo_inicial | Estoque inicial, individualização e auditoria |
| cmappDsipsRegistrarCautela | cautelar | Saída e atualização de estoque/unidades |
| cmappDsipsRegistrarDevolucao | devolver | Retorno parcial/total e estoque |
| cmappDsipsListar | consultar; historico para devoluções | Coleções explicitamente permitidas |
| cmappDsipsListarResponsaveis | cautelar | Projeção de contas ativas, sem e-mail/política |
| cmappDsipsListarEventos | historico | Operador vê somente cautelas/devoluções |
| cmappConsultarPatrimonio | consultar, dentro do escopo | Consulta por ID com localização efetiva |

O cliente js/services/operacoes-v2.service.js não faz fallback para endpoints legados. É importado pela nova rota operacoes-v2/, sem integração à publicação atual. As leituras são via callable; as Rules de transição continuam
negando o acesso direto de contas versionadas aos dados de negócio.

## Fonte e transações

dsips-base.cjs e cautelas-base.cjs derivam das regras de negócio homologadas no pacote interno
CMAPP 1.16.1-H.1. São agora fontes versionadas deste adaptador. Não há chamada ao endpoint antigo
nem perfil fictício de admin: a autorização anterior foi substituída por hook obrigatório.
O responsável continua sendo uma conta ativa em usuarios, sem depender do perfil legado.

Autor, política, recibo e dados operacionais são lidos na mesma transação. A permissão é conferida
antes de aceitar recibo ou preparar gravações. Revogar uma atribuição bloqueia também reenvios.
Estoque, unidades, cautela/devolução, evento e recibo são gravados atomicamente. O evento registra
a versão e a revisão da autorização utilizada. Mantêm-se as
validações de saldo, duplicidade, vínculo de unidade, responsável ativo e devolução parcial.
O gestor de acessos delegado não ganha operação: precisa também de atribuição operacional.

Consultas usam limites de 1–50 registros e cursor por ID. Cadastros são ordenados por ID;
eventos são ordenados por registradoEm decrescente, com desempate por ID decrescente. A página de responsáveis
pode retornar menos registros ao remover contas inativas; proximoCursor deve ser respeitado até null.
O histórico usa o snapshot do cursor como posição cronológica e valida se o evento é visível ao ator.
A interface oferece carregamento de registros anteriores. Operador não lê eventos de cadastro/saldo; a leitura completa
desses eventos requer a ação alterar, hoje presente somente no papel gestor ou Superadmin.
As consultas e a autorização também compartilham transação.

A consulta patrimonial determina a divisão por localizacaoAtual, depois divisaoOrigem e divisao.
Não usa lotação do usuário, parâmetros de divisão ou o perfil antigo. A localização histórica de origem
não dá visibilidade sobre um bem hoje situado fora da abrangência. Listagem, conferência, sugestão e decisões estão preparadas na continuação descrita em PATRIMONIOS.md.
Gestão dos ciclos de inventário e conexão das telas patrimoniais ainda não foram concluídas.

## Validação e pendências de ativação

Validação: 227 testes frontend/política/pacote/DOM e 74 cenários de contas, concessões e operação DSIPS
no Firestore Emulator. Novos cenários
cobrem estoque e unidades individualizadas, concorrência de saídas, retornos parciais, revogação antes
da autorização transacional, reenvio, contas inativas, projeções, histórico filtrado e alçada patrimonial.
O SDK Admin não obedece a Rules: são esses adaptadores que impõem autorização no servidor.

Antes de ativar contas reais: concluir operações patrimoniais e inventários; homologar a navegação DSIPS v2 e os controladores
compartilhados com paginação, histórico cronológico e botões por ação; homologar DSIPS/PDV;
resolver reconciliação de Authentication; preparar migração, backup e reversão. O bloqueio/drenagem dos
endpoints antigos, a marca explícita de versão e a identificação do Superadmin permanecem necessários.
Não aplicar união de privilégios v2 e legado. Não habilitar usuários enquanto o módulo necessário a eles
não estiver implementado integralmente e homologado. Ver ../acessos-v2/README.md.

## Interface DSIPS v2 — continuação

operacoes-v2/ tem gate de sessão real, navegação própria e Claro/Escuro/Automático. O link da gestão
aparece somente para quem possui consulta operacional. O bootstrap lê marca/conta do servidor e a
política por callable; observa alteração de revisão/ativo e limpa a interface ao encerrar a sessão.
A consulta das pessoas para cautelas usa somente a projeção de responsáveis permitida pelo backend.

Os controladores js/modules/dsips/controller.js e cautelas-controller.js são compartilhados. Na rota v2,
recebem avaliação explícita por ação; a operação anterior mantém seu contrato legado. Não há promoção
fictícia de usuário para admin, nem fallback para endpoints antigos. Cards, cesta, unidades, devoluções,
posse e modo quiosque mantêm os fluxos anteriores. Sair do quiosque e Escape continuam disponíveis.
Os formulários, listas e opções de responsáveis são limpos ao encerrar a sessão; confirmações pendentes
não enviam operação após logout. Datas aceitam Timestamp do SDK e a representação JSON das callables.

O adaptador servicos.js percorre páginas de cadastros necessárias aos controladores, até 100 páginas
(5.000 registros por consulta); exceder o limite produz erro, sem indicadores baseados em total parcial.
Respostas tardias são canceladas logicamente por geração/sessão. Essa solução preserva os filtros atuais;
um acervo maior exige busca no servidor e paginação visível, em vez de aumentar o limite indefinidamente.
O histórico carrega 30 eventos de cada vez sob comando do usuário e possui atualização independente.

O índice composto em firestore.indexes.json precisa ser mesclado ao arquivo de índices do ambiente
com scripts/preparar-indices-operacoes-v2.mjs e implantado antes da homologação. O preparador Functions
copia uma referência desse índice; não altera firebase.json nem faz deploy. O emulador valida consulta,
ordenação e autoridade, mas não substitui a criação do índice no serviço real.

Permanecem: homologação visual Android/desktop, testes com Authentication real, cache/PWA e release,
reconciliação de contas e migração. Os testes de DOM não são verificação visual em navegador.

## Continuação patrimonial

Contratos, transações, alçadas, revisão e preparação do índice de localização estão em PATRIMONIOS.md.
As marcas de preparação/ativação não foram aplicadas. A mudança não altera a prévia pública.

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
