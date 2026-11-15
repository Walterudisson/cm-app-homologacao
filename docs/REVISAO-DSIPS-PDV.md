# Revisão DSIPS — Atendimento PDV e usuários

Versão v1.16.1-H.1, exclusiva HML. Base: v1.16.0-H.1, homologada pelo usuário em 15/11/2026.

## Comportamento

Atendimento é a entrada do DSIPS. O operador escolhe um usuário, toca nos cards dos materiais,
ajusta quantidades ou seleciona identificações, confere e confirma. Clique repetido em material por
quantidade soma na mesma linha até o saldo disponível. Busca e categoria filtram os cards. Cesta permite
remoção e limpeza; confirmação exibe o usuário e as quantidades. Backend revalida todos os saldos.
Ícone e cor dos cards são personalizáveis no cadastro de material, com opções validadas no servidor.

Modo quiosque simplifica a apresentação do aplicativo, preserva o operador e permite sair pelo botão,
Escape ou navegação. Não é bloqueio do navegador ou do sistema operacional. A devolução tem atalho
para a consulta de cautelas e mantém o fluxo transacional já homologado.
Filtros distintos: Todas, Sem devolução, Parcialmente devolvida e Encerrada.

## Identidade e compatibilidade

Responsáveis novos vêm exclusivamente de usuarios. Callable dsipsListarResponsaveis retorna somente
id, nome, matrícula quando existente e indicador ativo; não expõe e-mail, permissões ou dados de acesso.
Somente Administrador ou Gestor DSIPS ativo usa essa consulta. Conferente mantém consulta das cautelas,
sem carregar a lista de usuários. Novas cautelas guardam responsavelUid e responsavelOrigem=usuarios,
além do nome e da matrícula históricos. Matrícula não é requisito para uma conta já existente.

Cadastros DSIPS passam a ter categorias e locais. O backend recusa novos cadastros de responsável
separados. Registros anteriores não são apagados nem vinculados automaticamente por semelhança de nome.
Cautelas anteriores permanecem consultáveis e devolvíveis com seus nomes e identificações originais.

Perfil nativo usuario: Administrador cria/edita na tela comum de Usuários. Esse perfil entra diretamente
em Meu perfil, sem consultas patrimoniais ou DSIPS. Alterá-lo para básico remove módulos operacionais;
concessão de módulos para básico é recusada no backend. Pode editar os dados próprios já permitidos,
foto e senha. O perfil nunca concede funções operacionais, mesmo com módulos ou permissões indevidos.
Rules atuais continuam bloqueando dados de outros usuários e coleções operacionais.

## Publicação

Publicar o pacote interno primeiro. O script compara Rules HML com a base da Sprint 4, salva backup,
executa testes locais em projeto demo e publica apenas as funções modificadas e firestore:rules:
criarUsuario, atualizarUsuario, definirModulosUsuario, dsipsSalvarCadastro, dsipsRegistrarCautela,
dsipsListarResponsaveis. As demais funções permanecem existentes. Não executar scripts antigos após esta revisão.
O frontend deve ser integrado após a confirmação do deploy. PRD permanece inalterado.

## Validação

155 testes frontend, 35 cenários de integração com Firestore Emulator, cinco testes de concessão e
três testes dos handlers de criação/edição de usuários: 198 aprovados. Incluem concorrência, reenvio,
conta inativa, negação de autoelevação, vínculo UID, retorno legado e isolamento de dados no PDV.
Não foi realizada validação visual em navegador real nesta revisão; confirmar HML mobile e desktop.

## Homologação — quatro blocos agrupados

1. Contas: Administrador cria Usuário básico sem divisões; essa conta entra somente em Meu perfil.
   Tentar abrir telas operacionais por hash deve retornar ao perfil. Cadastro DSIPS só mostra categoria/local.
2. PDV: selecionar usuário, pesquisar/filtrar cards, adicionar dois materiais, repetir toque de quantidade,
   selecionar identificação e concluir. Conferir saldo e vínculo. Personalizar cor/ícone de um material.
3. Quiosque e retorno: entrar/sair do modo no celular e computador; conferir operador; registrar devolução
   parcial e total, inclusive de cautela da versão anterior. Conferir os quatro filtros distintos.
4. Permissões/regressão: Conferente DSIPS consulta sem retirar; básico não recebe gestão; sem DSIPS não
   acessa operação; conferir Patrimônios, Meu perfil, histórico e atualização PWA.

## Próximas entregas

Pré-cautela futura: somente usuários explicitamente autorizados poderão consultar os materiais liberados
e enviar solicitações para análise da DSIPS. Solicitação não movimenta estoque nem equivale à entrega;
a cautela efetiva nasce na aprovação/entrega pelo operador. Permissões, fila e auditoria serão próprias.
Sprint 5 mantém ajustes, estornos e conferência; Sprint 6 mantém relatórios/importação e preparação PRD.
Reversão: frontend anterior ainda cadastra responsáveis separados e não deve ser combinado com estas funções.
Se houver necessidade de reversão, planejar backend compatível mantendo dados, UIDs e recibos; não apagar
histórico nem reabrir escrita direta. Preferir correção sobre esta revisão em HML.
