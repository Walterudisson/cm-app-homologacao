# Operações de negócio com autorização v2

Implementação preparada no PR de desenvolvimento; sem deploy, migração ou conexão às telas
operacionais publicadas. A gestão v2 continua isolada até a conclusão das dependências abaixo.

## Entrega

Oito endpoints adicionados ao registro local de Functions (21 no total):

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

O cliente js/services/operacoes-v2.service.js não faz fallback para endpoints legados. Ainda não é
importado pelas telas operacionais. As leituras são via callable; as Rules de transição continuam
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

Consultas usam limites de 1–50 registros e cursor por ID, ordenadas por ID. A página de responsáveis
pode retornar menos registros ao remover contas inativas; proximoCursor deve ser respeitado até null.
O histórico paginado por ID não equivale à lista cronológica recente da tela anterior. Essa apresentação
será ajustada ao conectar os controladores. Operador não lê eventos de cadastro/saldo; a leitura completa
desses eventos requer a ação alterar, hoje presente somente no papel gestor ou Superadmin.
As consultas e a autorização também compartilham transação.

A consulta patrimonial determina a divisão por localizacaoAtual, depois divisaoOrigem e divisao.
Não usa lotação do usuário, parâmetros de divisão ou o perfil antigo. A localização histórica de origem
não dá visibilidade sobre um bem hoje situado fora da abrangência. Ainda não há consulta de listagem,
conferência, aprovação, sugestão ou gestão de inventários v2; essas operações permanecem bloqueadas.

## Validação e pendências de ativação

Validação: 196 testes frontend/política/pacote e 44 cenários de contas, concessões e operação DSIPS
no Firestore Emulator. Novos cenários
cobrem estoque e unidades individualizadas, concorrência de saídas, retornos parciais, revogação antes
da autorização transacional, reenvio, contas inativas, projeções, histórico filtrado e alçada patrimonial.
O SDK Admin não obedece a Rules: são esses adaptadores que impõem autorização no servidor.

Antes de ativar contas reais: concluir operações patrimoniais e inventários; conectar módulos e navegação
v2 aos controladores com paginação, histórico cronológico e botões por ação; homologar DSIPS/PDV;
resolver reconciliação de Authentication; preparar migração, backup e reversão. O bloqueio/drenagem dos
endpoints antigos, a marca explícita de versão e a identificação do Superadmin permanecem necessários.
Não aplicar união de privilégios v2 e legado. Não habilitar usuários enquanto o módulo necessário a eles
não estiver implementado integralmente e homologado. Ver ../acessos-v2/README.md.
