# Sprint 2 — Módulos e acessos

Versão candidata: **v1.14.1-H.1**. Destino: HML, após publicação do backend.
A Sprint 1 (v1.14.0-H.1) foi homologada pelo usuário, MOD-01 a MOD-13.

## Experiência

- Administrador vê seleção entre Patrimônios e DSIPS ao entrar.
- Usuário com um módulo entra diretamente nele; com dois, vê a seleção.
- Usuário sem módulos vê uma orientação e mantém Meu perfil disponível.
- O botão Módulos permite voltar à seleção e trocar de contexto.
- Menus de Patrimônios e DSIPS se alternam; administração e conta permanecem comuns.
- DSIPS apresenta somente “Em preparação”; estoque e cautelas não estão disponíveis.
- A faixa de HML reserva espaço para o cabeçalho e a sidebar, inclusive no celular.

## Atribuições

O campo protegido `usuarios/{uid}.modulos` contém IDs de módulos permitidos.
Ausência do campo mantém apenas `patrimonios`, preservando usuários legados.
Lista vazia significa nenhum módulo operacional; campo inválido não concede acesso.
Administradores mantêm acesso a todos os módulos, sem autoedição das atribuições.

Em Módulos, Administrador seleciona um usuário ativo não administrativo, marca os módulos
e confirma a alteração. A função `definirModulosUsuario` revalida o operador e o alvo,
altera a lista e cria auditoria em uma única transação. O cliente não escreve esse campo.
Alterações do perfil, situação ou módulos encerram a sessão observada para exigir nova entrada.

As Rules acrescentam a verificação de Patrimônios a todas as operações das coleções
`patrimonios`, `inventarios` (incluindo subcoleções) e `inventariosGerais`.
DSIPS ainda não tem coleções operacionais: a regra geral continua negando caminhos não previstos.
Usuários sem Patrimônios não iniciam suas consultas e ouvintes durante o login.

## Ordem de implantação

1. Recuperar o pacote interno **CMAPP-v1.14.1-H.1-internal.zip** e abri-lo no Cloud Shell.
2. Conferir que o projeto de destino é `cm-app-homologacao`.
3. Na pasta do pacote, executar `bash publicar-hml.sh`.
4. O script confere as Rules atuais, salva backup e só publica a nova função e as Rules se a base for compatível. Havendo diferenças ou falha de consulta, interrompe antes do deploy.
5. Integrar o PR da Sprint 2 no repositório de homologação e aguardar o Pages.
6. Confirmar v1.14.1-H.1 e executar a homologação abaixo com contas de teste.

Não publicar essa interface isoladamente: o formulário depende da nova função e o
bloqueio de dados depende das Rules. A implantação do backend não foi executada nesta sessão.
O pacote foi reconstruído da entrega interna v1.13.11-H; conferir eventuais alterações
posteriores publicadas manualmente antes de substituir as Rules em HML.

## Homologação

| ID | Cenário | Esperado |
| --- | --- | --- |
| S2-01 | Administrador entra | Seleção com Patrimônios e DSIPS; DSIPS identificado Em preparação |
| S2-02 | Abrir Patrimônios e depois DSIPS pelo botão Módulos | Menu e título mudam; navegação anterior continua funcionando |
| S2-03 | Visitar Usuários, Divisões e Meu perfil a partir de cada módulo | Recursos comuns acessíveis conforme perfil |
| S2-04 | Conta legada sem campo modulos | Entrada direta em Patrimônios |
| S2-05 | Administrador atribuir apenas DSIPS a conta de teste | Alteração auditada, sessão anterior encerrada, nova entrada direta em DSIPS |
| S2-06 | Conta DSIPS tentar ler Patrimônios diretamente pelo SDK | Servidor nega; não basta ocultação de menu |
| S2-07 | Conta comum tentar alterar o próprio campo modulos ou chamar a função | Servidor nega sem alterar permissões |
| S2-08 | Conceder dois módulos e depois nenhum à conta de teste | Seleção com dois; após revogação, orientação sem módulos e Meu perfil disponível |
| S2-09 | Conferente consultar inventários e registrar conferência com Patrimônios | Fluxo anterior preservado e alçadas respeitadas |
| S2-10 | Menu/Voltar, desktop/celular e PWA atualizado | Camadas funcionam; faixa HML não sobrepõe a marca |

## Verificação realizada

127 verificações da suíte do frontend aprovadas usando o backend interno recuperado.
Cinco testes da função administrativa aprovados (validação, negação, atribuição e auditoria).
Sintaxe e resolução dos imports locais verificadas. Testes de UI usam DOM simulado.
As suítes antigas receberam caminho de backend configurável por `CMAPP_INTERNAL_ROOT`.
Expectativas estáticas de versão foram atualizadas; um teste antigo de texto de status passou
a verificar a classificação de sugestão como pendente, sem modificar o comportamento de Patrimônios.

Não houve deploy Firebase, teste em Emulator Suite ou login real. A homologação das Rules
e a revisão visual em dispositivos permanecem necessárias; testes estáticos não as substituem.

## Reversão

Reverter a interface para a versão anterior se necessário. Após atribuições explícitas,
manter as Rules de autorização por módulo para não restabelecer acesso indevido aos dados.
Uma reversão das Rules exige revisar as atribuições e o comportamento esperado antes.
