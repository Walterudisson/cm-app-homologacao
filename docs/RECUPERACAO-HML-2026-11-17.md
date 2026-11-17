# Recuperação controlada do CMAPP HML para base v1.13.11-H

Data: 17/11/2026. **Somente HML. PRD intocado.**

## Preservação
- Base de recuperação: commit `330fb23b542707ee4e611b7301e815060cf72f4f`, anterior à modularização.
- Snapshot de código anterior à recuperação: branch `backup/hml-antes-recuperacao-2026-11-17`, commit `739c22c76659ed58cf7428a7741067de842c9910`.
- Código novo de DSIPS e Gestão V2 continua preservado, sem exclusão de arquivos; a aplicação principal utiliza novamente a identidade/navegação v1.13.11-H.
- Firebase Web continua apontando estritamente para `cm-app-homologacao`.
- GitHub Pages entrega somente frontend: não reverte Firestore, Auth, Functions, Rules, Storage nem índices.

## Compatibilidade e restrições

A conta Superadmin foi migrada previamente para `autorizacaoVersao=2`. As Rules de transição impedem privilégios operacionais legados dessas contas. A aplicação recuperada **não tenta contornar esse bloqueio**: contas V2 seguem, temporariamente, para a Gestão V2, e contas ainda legadas podem utilizar o frontend antigo.

**Restaurar o frontend NÃO basta para recuperar Patrimônios para o Superadmin.** Antes de declarar HML estável, executar a reversão controlada do piloto de acesso do Superadmin com o plano e a pasta de estado originais, após revisão das alterações posteriores. O mecanismo já implementado em `scripts/homologar-gestao-hml.mjs reverter` compara os documentos e recusa sobrescrever divergências. Não executar script novo sem inspecionar a situação real.

Usar Node 22, credenciais do projeto HML e a pasta de estado que contém `estado.json`, `plano.json` e `config-original.json`. Preservá-la. Verificar modo `status` antes de reverter. Se houve concessão de acesso ou edição de conta após o piloto, será necessária reconciliação individual antes da reversão. Não apagar documentos ou editar marcadores manualmente.

## Homologação obrigatória

1. Confirmar no GitHub Pages a tela clássica v1.13.11-H e a identidade visual.
2. Confirmar o projeto `cm-app-homologacao` no app.
3. Com usuário ainda não migrado: login, painel, relação de Patrimônios, Divisões e Inventários.
4. Confirmar que conta versionada não recebe permissões legadas indevidamente.
5. Após reversão administrativa do Superadmin: login, painel, Patrimônios, filtros, inventários e operações em HML; verificar falhas `permission-denied`.
6. Conferir políticas, endpoints legados e PWA/Android antes de declarar recuperação concluída.

Nenhum documento da base de dados é alterado por este commit. Não copiar dados de PRD e não publicar Functions/Rules neste passo.
