# Decisão de navegação CMAPP | 17/11/2026

**Situação:** organizamos o Painel atual dentro do módulo Patrimônio.

- O Painel existente é **patrimonial**: cards de patrimônios, progresso de inventário e dicas operacionais. Seu conteúdo foi aprovado e não deve ser redesenhado nesta etapa.
- O menu **Patrimônio** contém: Painel, Leitura, Relação e Inventários.
- Mantemos **Painel** como página inicial provisória após o login para preservar o comportamento homologado.
- DSIPS aparece como módulo separado, com Materiais nesta sprint.
- Futuramente, quando DSIPS e Patrimônio tiverem funcionalidades efetivamente consolidadas, uma **página inicial do CMAPP como plataforma** poderá apresentar módulos, pendências relevantes por permissão e atalhos, sem substituir os painéis próprios de cada módulo.
- Nada muda nas permissões, Rules, Firestore, Functions ou PRD.

**Implementação HML:** hotfix v1.13.12-H.4, somente menu/breadcrumb e identificação de versão. Homologação visual continua necessária.
