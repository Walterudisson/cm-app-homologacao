# Sprint 4 — Cautelas e devoluções DSIPS

Versão: v1.16.0-H.1. Destino exclusivo: HML. Base: Sprint 3 homologada.

## Entrega

Cautelas com até 20 materiais e 200 unidades identificadas por operação. Quantidades inteiras positivas,
responsável ativo e saldo disponível são validados no servidor. Identificações ficam vinculadas à cautela.
Devoluções parciais ou totais restauram o estoque de origem e encerram a cautela quando nada resta.
A inativação posterior de material, local ou responsável não impede devolver uma cautela existente.
Quem está com o quê agrupa somente saldos pendentes por responsável e material.

Administrador e Gestor DSIPS movimentam. Conferente consulta cautelas e posse; não acessa auditoria.
Escritas diretas do cliente permanecem bloqueadas. Transações validam concorrência, preservam saldos,
auditoria e recibos idempotentes. Leituras paralelas são concluídas antes de propagar falhas de validação,
evitando leituras pendentes no cancelamento de uma transação com vários itens.

## Backend e publicação

Publicar o pacote interno antes de integrar o frontend. O script compara as Rules de HML com a base
Sprint 3 ou a candidata, cria backup e testa com projeto demo antes de publicar apenas as duas novas
funções e firestore:rules. Mantém as funções existentes e todos os dados.

Novas coleções: dsipsCautelas (itens, responsável, identificações, quantidades devolvidas e situação)
e dsipsDevolucoes (lançamentos imutáveis). dsipsEventos registra responsável, materiais, operador,
data e observações. dsipsOperacoes impede duplicação em reenvios.

## Validação

148 verificações frontend; 30 cenários de integração com Rules e transações reais no emulador;
cinco testes de atribuição de módulos. Abrangem falta de saldo, unidades repetidas, devolução excessiva,
concorrência, autorização, reenvio, devolução de inativos e preservação dos nomes históricos.
Validação visual em dispositivo e Firebase HML depende da publicação e homologação abaixo.

## Homologação — quatro blocos

1. Retirada: criar cautela com material por quantidade e material identificado; conferir saldo,
   responsável e unidades. Tentar quantidade acima do saldo e unidade já entregue.
2. Devolução: devolver parte, conferir pendência e saldo; devolver tudo restante e conferir encerramento.
3. Consulta e perfis: conferir Quem está com o quê e filtros; Conferente consulta sem botões de gravação;
   usuário sem DSIPS não acessa o módulo.
4. Regressão e mobile: conferir cadastros, estoque, histórico, navegação e Patrimônios; testar no celular
   retirada com vários itens, seleção de identificações e devolução.

## Limites e reversão

Ajustes, estornos e conferência ficam para Sprint 5; relatórios e importação para Sprint 6.
Consultas ainda carregam os registros necessários integralmente; paginação será necessária com crescimento.
Reverter frontend mantém os dados e histórico. Não apagar recibos nem reabrir escritas diretas para corrigir
lançamentos. Reversão de Rules exige comparação do backup para preservar o isolamento por módulo.
