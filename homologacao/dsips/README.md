# DSIPS V2 no HML | Publicação controlada
Rota: https://walterudisson.github.io/cm-app-homologacao/homologacao/dsips/

Este pacote acrescenta uma rota isolada de DSIPS com login Authentication real do HML, sessão versionada, autorizações v2 e páginas de Materiais, Estoque, Cautelas, Devoluções, Responsáveis e Histórico. Não substitui a raiz do CMAPP nem modifica regras, contas ou dados.

A interface depende das sete Functions V2 ainda não confirmadas como implantadas. Sem elas, as consultas falharão, mesmo que a rota apareça no GitHub Pages.

## Backend a ativar no Cloud Shell de HML

Inspecionar os diretórios antes de executar. O pacote Functions real deverá conter o Admin SDK e o index.js CMAPP.

```bash
nvm use 22
cd "$HOME/cmapp-v2-hml-implantacao/fonte"
node scripts/preparar-backend-acessos-v2.mjs "$HOME/cmapp-pdv/functions"
cd "$HOME/cmapp-pdv"
firebase deploy --project cm-app-homologacao --only "functions:cmappDsipsSalvarCadastro,functions:cmappDsipsRegistrarSaldoInicial,functions:cmappDsipsRegistrarCautela,functions:cmappDsipsRegistrarDevolucao,functions:cmappDsipsListar,functions:cmappDsipsListarResponsaveis,functions:cmappDsipsListarEventos"
```

O histórico filtrado requer índice composto em dsipsEventos. Preparar a mesclagem com `scripts/preparar-indices-operacoes-v2.mjs`, conferir as alterações e publicar índices no projeto HML antes do teste de histórico. Não ativar marcadores de Patrimônios manualmente.

Homologar: autenticação Superadmin; botão DSIPS na Gestão V2; consulta real de materiais, estoque e responsáveis; cautela/devolução com dados de teste; bloqueio de acesso de usuário sem atribuição; logout e revogação em sessão. A produção PRD não é tocada.
