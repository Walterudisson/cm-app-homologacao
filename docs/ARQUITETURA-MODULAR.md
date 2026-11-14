# CMAPP — base modular

Decisão: CMAPP reúne funcionalidades comuns e módulos de negócio no mesmo domínio.
O primeiro módulo é Patrimônios; DSIPS começa futuramente por Materiais e Cautelas.

## Responsabilidades

| Camada | Responsabilidade nesta entrega |
| --- | --- |
| `js/platform/modules.js` | Catálogo de módulos, páginas comuns, contexto e guarda de navegação |
| `js/platform/pages.js` | Encaminhar cada tela ao carregador correspondente |
| `js/modules/patrimonios/module.js` | Declarar as cinco telas e o contexto de Patrimônios |
| `js/modules/patrimonios/pages.js` | Carregar as telas patrimoniais com os serviços existentes injetados |
| `js/ui/navigation.js` | Menu, cabeçalho, breadcrumb e camadas responsivas compartilhadas |
| `app.js` | Composição dos carregadores, autenticação, estado, eventos e integração existente |

## Contrato inicial

Cada módulo declara `id`, `nome`, `estado`, `paginas` e, quando ativo, sua `paginaInicial`.
Cada página declara título, trilha e restrições de perfil quando necessárias.
O catálogo de páginas dirige o cabeçalho, a alternância das seções e o despacho de carregamento.
Os IDs e hashes existentes são preservados para evitar mudanças desnecessárias no histórico.
Painel e Relação continuam usando a divisão em foco, indicada na declaração da página.

O carregador de um módulo recebe as dependências por parâmetro. A plataforma não importa
Firestore ou serviços de inventário. Telas comuns recebem carregadores próprios.
Os erros continuam chegando ao tratamento de erro existente no ponto de entrada.

Na Sprint 2, DSIPS passa a ter uma entrada de apresentação, identificada como Em preparação.
O seletor e os menus por contexto usam o catálogo. Nenhuma regra de negócio de Materiais está implementada.
Atribuições usam o campo protegido modulos do usuário, com função administrativa auditada e Rules por módulo.
Detalhes de implantação e validação: SPRINT-2-MODULOS.md.

## Acesso e compatibilidade

A guarda de navegação rejeita páginas desconhecidas, usuários ausentes ou inativos e perfis
não reconhecidos. Mantém o acesso operacional dos perfis nativos. Usuários e Divisões são
acessíveis a Administrador e Gestor; Funções e permissões apenas a Administrador,
conforme os controles de menu existentes. Conferente mantém as telas operacionais e Meu perfil.

Essa guarda organiza a interface e não substitui autorização nas regras do Firestore e backend.
O catálogo de módulos ativos não concede permissões de acesso a dados; a atribuição do usuário é verificada na interface e no backend.
Permissões adicionais existentes foram preservadas. As Rules acrescentam a exigência de acesso a Patrimônios às coleções desse módulo.
Não há migração de contas, divisões ou patrimônios, nem mudança de projeto Firebase.

## Extração gradual

Esta é uma base inicial, não a conclusão da separação de todos os arquivos por domínio.
As implementações de consultas, gravações, cache e eventos permanecem integradas pelo `app.js`.
O adaptador permite extraí-las em entregas menores sem alterar o contrato da plataforma.
Não se deve tratar esse adaptador como isolamento de dados ou de implantação.

## Próximas entregas

1. Base modular: homologada pelo usuário.
2. Seleção/troca de módulos e autorização de acesso: entrega candidata v1.14.1-H.1, com backend pendente de deploy e homologação.
3. Cadastros e estoque do DSIPS; separar destinatários de materiais de contas operadoras.
4. Cautelas com vários itens, devoluções totais/parciais e consulta por responsável.
5. Conferências, ajustes/estornos auditáveis e consistência sob operações simultâneas.
6. Painel, relatórios, avaliação da importação e homologação para produção.

Inicialmente, o domínio e o login permanecem únicos. Subdomínio é uma decisão futura
de hospedagem e sessão, independente da organização dos módulos.
