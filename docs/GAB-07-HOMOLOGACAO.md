# GAB-07 | Roteiro de homologação do CRUD demonstrativo

**Versão candidata:** v1.13.41-H.1. **Apenas HML.** Não testar com dados reais, CPF, nascimento completo, telefone particular ou e-mail de pessoas reais.

## Premissas e limites

- Acessar `Central de Trabalho > Gabinete > Cadastros e revisão` com um perfil **admin** autorizado no modelo atual de HML.
- Outras contas com consulta ao Gabinete não devem ter acesso à tela de Cadastros nem ver ação de edição na ficha.
- Os cadastros são **somente em memória**: atualização, fechamento da aba, troca de usuário ou logout descartam tudo.
- A autorização definitiva, validação por servidor, registros de auditoria, importação e backend continuam pendentes.

## Testes manuais Android e desktop

| ID | Ação | Resultado esperado |
|---|---|---|
| GAB-071-01 | Abrir Gabinete > Cadastros | Lista 10 registros fictícios com indicadores |
| GAB-071-02 | Clicar Novo contato | Modal abre com Pessoa selecionada; campos claros |
| GAB-071-03 | Tentar nome de um caractere | Bloqueio de validação e foco no campo |
| GAB-071-04 | Tentar ramal com letras | Bloqueio; zeros à esquerda são aceitos |
| GAB-071-05 | Tentar 30/02 | Bloqueio; 29/02 é válido |
| GAB-071-06 | Criar Pessoa Exemplo X em Unidade Teste, ramal 0007, aniversário 29/02 | Cadastro aparece imediatamente na lista e na Agenda |
| GAB-071-07 | Criar outra pessoa com mesmo nome/unidade/tipo, mudando apenas maiúsculas/acentos | Duplicidade recusada |
| GAB-071-08 | Criar outra pessoa com mesmo ramal 0007 e nome diferente | Permitido; ramal compartilhado |
| GAB-071-09 | Abrir ficha e acionar Editar cadastro | Formulário preenchido com dados do contato |
| GAB-071-10 | Editar nome, unidade e ramal | Lista, ficha e filtros refletem edição |
| GAB-071-11 | Criar/editar ramal institucional em Cadastros | Tela Ramais mostra alteração sem recarregar |
| GAB-071-12 | Criar/editar aniversário de pessoa | Painel Aniversariantes reflete alteração |
| GAB-071-13 | Aplicar filtros por nome, tipo e Revisão vencida | Retornam somente correspondentes |
| GAB-071-14 | Selecionar Revisar hoje | Solicita confirmação; situação de revisão atualiza |
| GAB-071-15 | Selecionar Excluir e Cancelar | Registro permanece ativo |
| GAB-071-16 | Confirmar Excluir | Sai dos ativos, permanece em Excluídos/restauráveis |
| GAB-071-17 | Restaurar o registro | Volta aos ativos e às telas de consulta |
| GAB-071-18 | Tentar restaurar um registro enquanto existe duplicado ativo | Operação recusada |
| GAB-071-19 | Trocar de usuário ou sair e entrar novamente | Edições anteriores não sobrevivem à sessão |
| GAB-071-20 | Acessar com conta sem permissão de gestão | Não há tela de Cadastros, botões de edição nem dados editáveis |
| GAB-071-21 | Testar rolagem e teclado Android em formulário longo | Sem sobreposição de botões e foco visível |
| GAB-071-22 | Testar atualização do PWA para v1.13.41-H.1 | Sem flash de Patrimônios, acesso à Central e demais módulos preservados |

## Critérios de aceite

- Todas as ações da GAB-07 operam somente com dados sintéticos.
- Não existe gravação no Firestore/Storage nem em localStorage de dados cadastrados.
- A revisão vence **no 90º dia**; alerta não bloqueia consulta.
- Nenhuma regressão em Patrimônios, DSIPS, Central de Trabalho e acesso por módulo.
- A homologação de frontend **não** autoriza implantação de backend nem promoção PRD.
