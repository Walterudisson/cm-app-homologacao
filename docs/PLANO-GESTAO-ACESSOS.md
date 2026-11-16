# Gestão de acessos — implementação da proposta aprovada

Referência: proposta visual aprovada em 16/11/2026. Base operacional HML: v1.16.1-H.1.
Nenhuma autorização ou dado de usuário é alterado por este plano. PRD permanece inalterado.

## Escopo confirmado

- Cadastro único de pessoas; lotação separada da autorização.
- Navegação por unidade responsável, com funcionalidades internas. Patrimônios sob DA;
  Materiais e Cautelas sob DSIPS. TI mantém área própria de trabalho vinculada à DA.
- Superadmin administra a plataforma e consulta todo o conteúdo.
- Administradores autorizados, inicialmente TI, mantêm contas. Não recebem leitura operacional
  nem poder de designar gestores automaticamente.
- Gestores de módulo e de funcionalidade concedem/revogam acessos operacionais para qualquer
  usuário ativo, dentro das funcionalidades, papéis e abrangências expressamente delegados.
- Designação de gestores cabe a Superadmin ou administrador especificamente autorizado.
- Papéis padronizados; matriz combina CRUD com ações de negócio. Exclusão de histórico não é CRUD genérico.
- Tela Usuários: Dados, Acessos e Histórico. Matriz serve como referência das permissões efetivas;
  editor livre de funções personalizadas fica fora desta entrega.
- Dois temas visuais, Claro e Escuro; Automático acompanha o dispositivo. Preferência de apresentação
  não interfere em autenticação, autorização ou dados operacionais.
- Acessos temporários e substituições, pré-cautela, novos módulos e Sinal ficam no roadmap.

## Ordem das entregas

### 1. Política de autorização e plano de migração

Catalogar ações reais de Patrimônios e DSIPS e distinguir papéis operacionais, administração e delegação.
Implementar um avaliador de referência sem importar código visual, com testes de negação, escopo,
acúmulo de papéis, inativação e tentativas de autoelevação. Funções e Rules deverão aplicar a mesma
política, mas serão verificadas separadamente; compartilhar o catálogo não substitui testes de Rules.

Preparar comparação dos acessos legados e propostos por UID, sem gravações. Não promover admins legados
a Superadmin automaticamente. Designar explicitamente a conta inicial no ambiente correto, preservar
recuperação administrativa e detectar acessos cuja equivalência não pode ser garantida.
Funções personalizadas e permissões adicionais antigas exigem revisão, não descarte silencioso.
Não importar dados nem identidades entre HML e PRD.

Aceite: relatório de equivalências e divergências; nenhuma ampliação automática ou perda silenciosa;
casos de TI, Conferente, Operador, gestores delegados, Superadmin e conta sem módulo cobertos por testes.

### 2. Telas funcionais e temas

Substituir as telas demonstrativas por controladores ligados aos serviços reais, retirando as concessões
da tela de seleção de módulos. Usuários expõe Dados/Acessos/Histórico; matriz mostra ações e abrangências
que o backend realmente aplica. Simulações não podem ser copiadas como lógica de autorização.
A interface deve impedir alteração de concessões fora da área administrável e apresentar erros do servidor.
Concessões e revogações precisam de confirmação adequada, auditoria e proteção contra duplicação.

Migrar tokens de cores nos componentes do CMAPP, respeitando a aparência aprovada. Cobrir login, shell,
formulários, diálogos, listas, notificações, Patrimônios e PDV. Preferência explícita prevalece sobre
Automático. Revisar foco, textos, estados vazios, erros e legibilidade em cada tema.

Aceite: nenhuma informação demonstrativa na aplicação funcional; telas e backend coerentes; homologação
mobile/desktop de TI, Conferente e Operador; Claro/Escuro/Automático verificados nas telas operacionais.

### 3. Migração e publicação em HML

Gerar backup e simulação antes de aplicar. Aplicar migração auditada, idempotente e versionada por usuário.
Evitar união indiscriminada de permissões antigas e novas durante a transição. Um usuário migrado usa
uma única fonte de autorização; revogação não pode ser anulada por fallback legado.

Aplicar a política tanto nas leituras diretas protegidas por Rules quanto nas operações Admin SDK;
backend não pode confiar no perfil fornecido pelo cliente. Atualizar o acompanhamento de acesso da sessão.
Validar regressão das operações patrimoniais, cautelas/devoluções, estoque e históricos anteriores.

Aceite: matriz executável aprovada em HML; migração reversível conforme versão e backup; publicação
rastreável. Preparação de automação de deploy deve acompanhar a entrega, sem trocar o processo por
credenciais permanentes expostas ou reproduzir a distribuição manual de pacotes como solução definitiva.
Promoção PRD é etapa posterior à homologação, com plano específico e versões compatíveis de frontend,
Functions e Rules. Não prometer reversão apenas de interface quando o esquema de autorização mudar.

## Critérios de conclusão

A proposta visual aprovada é referência, não versão funcional pronta. A entrega conclui quando os papéis
são impostos pelo servidor e Rules, a migração conserva os acessos aprovados, os temas cobrem o aplicativo
e os fluxos existentes continuam funcionando. A homologação pendente do PDV não é substituída pela
aprovação desta proposta.

## Andamento — 16/11/2026

Catálogo, avaliador, análise local do legado e backend de gestão preparados. Ver POLITICA-ACESSOS-V2.md.
A rota gestao-v2/ conecta a composição visual aprovada aos serviços reais de usuários/acessos, sem
cadastros de demonstração. Inclui perfil próprio, matriz do catálogo, atribuição e delegação distintas,
seleção de divisões do servidor, histórico e Claro/Escuro/Automático.

Treze endpoints implementam consultas, concessões/delegações e ciclo de contas; proteções dos nove
endpoints antigos e preparador de Rules de transição estão disponíveis localmente. Testes: 196 no
frontend/política/pacote, 62 no Firestore Emulator. Ver backend/acessos-v2/README.md para limites.

Faltam aplicar política às operações e Rules dos módulos, reconciliação de Authentication, revisar dados
reais e preparar migração/backup/reversão, homologar telas em dispositivos e ampliar temas ao sistema.
A proteção de transição nega acesso legado das contas marcadas; não ativa o negócio novo. Não migrar
usuários antes de resolver essas dependências. Nenhum usuário foi migrado ou publicação realizada.

### Continuação operacional — 16/11/2026

Oito endpoints operacionais preparados: cadastros/saldo/cautelas/devoluções DSIPS, consultas paginadas
e consulta patrimonial por ID. Autorização e dados são verificados na mesma transação. Operador não
administra cadastros e seu histórico não expõe auditoria cadastral. Há 21 endpoints no preparador local.
Ver backend/operacoes-v2/README.md. Restam integração de telas/PDV e operações patrimoniais/inventários;
nenhum módulo completo foi habilitado ou usuário real migrado nesta etapa.

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
