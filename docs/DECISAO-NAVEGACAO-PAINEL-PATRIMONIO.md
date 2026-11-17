# Decisão de navegação CMAPP | 17/11/2026

**Situação:** organizamos o Painel atual dentro do módulo Patrimônio.

- O Painel existente é **patrimonial**: cards de patrimônios, progresso de inventário e dicas operacionais. Seu conteúdo foi aprovado e não deve ser redesenhado nesta etapa.
- O menu **Patrimônio** contém: Painel, Leitura, Relação, Inventários e **Fila de aprovação**. A Fila é gestão do fluxo de movimentações patrimoniais, portanto pertence ao módulo Patrimônio; mantém as restrições de perfil e escopo já aplicadas, sem qualquer ampliação de acesso.
- Mantemos **Painel** como página inicial provisória após o login para preservar o comportamento homologado.
- DSIPS aparece como módulo separado, com Materiais nesta sprint.
- A futura **Central de Trabalho** será a página inicial da plataforma CMAPP, com módulos autorizados, pendências relevantes por permissão e atalhos, sem substituir o Painel de Patrimônio. Sua implementação fica para sprint própria após a consolidação dos módulos.
- Nada muda nas permissões, Rules, Firestore, Functions ou PRD.

**Implementação HML:** hotfix v1.13.12-H.4, somente menu/breadcrumb e identificação de versão. Homologação visual continua necessária.

## Refinamento de organização HML v1.13.12-H.5

A Fila de aprovação foi deslocada visualmente da seção Gestão para Patrimônio, após Inventários. O botão preserva `data-perfis="admin,gestor"`, o indicador de pendências e a mesma página `transferencias`. Nenhuma alteração na lógica de acesso, Firestore, Rules ou dados; somente menu e breadcrumb. Central de Trabalho aprovada como conceito, sem implementação nesta entrega.
