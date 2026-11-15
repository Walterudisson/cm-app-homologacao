# Sprint 3 — Cadastros e estoque DSIPS

Versão candidata **v1.15.0-H.1**, destino HML após publicação do backend.
Base frontend: commit `a091143b8b8cdd9705bd71c7af982c3fb70ff237`.
Base backend: pacote v1.14.1-H.1 já publicado pelo usuário em homologação.

## Entrega

DSIPS passa a oferecer Início, Materiais, Cadastros, Estoque e Histórico.
O início resume materiais ativos, materiais com estoque, saldos iniciais pendentes
e responsáveis ativos, sem somar unidades de medida diferentes em um indicador único.

Materiais possuem nome, categoria, controle, unidade, observações e situação.
O controle pode ser por quantidade ou individualizado. Unidades: unidade, par, caixa e kit.
Categorias e locais possuem nome e situação. Responsáveis possuem nome, matrícula,
divisão/setor e situação; não precisam de uma conta no CMAPP.
O campo de setor sugere as Divisões ativas existentes, permitindo registro de setor textual.

Cadastros podem ser pesquisados, editados e inativados, com auditoria. Nomes duplicados
de materiais, categorias ou locais são bloqueados, ignorando espaços, caixa e acentos.
Matrículas são únicas e não podem ser alteradas depois do cadastro.
Depois do saldo inicial, controle e unidade do material ficam imutáveis.
Inativar um cadastro não apaga suas unidades, estoque ou histórico.

## Saldo inicial

Um registro inicial por material, em um local ativo, com justificativa obrigatória.
Quantidade inteira entre zero e 1.000.000; individualizados aceitam até 200 unidades
identificadas por material. Cada unidade exige patrimônio ou série em uma linha.
A identificação é única em todo o DSIPS, incluindo comparações sem acentos e caixa.

O servidor grava saldo, unidades, marcador de inicialização, auditoria e recibo de operação
na mesma transação. Duplo clique/reenvio não duplica o registro. Duas solicitações
concorrentes para o mesmo material confirmam apenas um saldo inicial.
O lançamento inicial não é editável. Cautelas e devoluções pertencem à Sprint 4;
ajustes de saldo e estornos, à Sprint 5. Não importar planilha nesta entrega.

## Acesso

Administrador e Gestor ativo com DSIPS podem gerenciar. Conferente com DSIPS consulta
materiais, cadastros, estoque e unidades, sem gravar ou consultar auditoria.
O backend revalida o acesso em cada operação, inclusive na repetição de uma operação
que já teve sucesso antes da revogação. O cliente não pode escrever diretamente em
coleções de cadastros, estoque, unidades, auditoria, índices de unicidade ou recibos.
As coleções de trabalho de DSIPS ainda não concedem acesso a dados patrimoniais.

## Implantação

1. Baixar **CMAPP-v1.15.0-H.1-internal.zip** e enviar ao Cloud Shell.
2. Extrair em uma pasta exclusiva. Os arquivos desta entrega ficam na raiz do ZIP.
3. Executar `bash publicar-hml.sh` na pasta extraída.
4. O script compara as Rules atuais de HML com a base, salva backup e interrompe
   antes do deploy se houver diferenças. Instala dependências fixadas pelo lockfile,
   testa no emulador local **demo-cmapp-sprint3** e publica somente as duas funções
   novas e as Rules no projeto **cm-app-homologacao**.
5. Após a confirmação do backend, integrar o PR frontend e aguardar o GitHub Pages.
6. Aceitar a atualização do PWA e confirmar v1.15.0-H.1.

O projeto demo é usado apenas nos testes locais; esses dados nunca são enviados ao HML.
Não há alteração de produção, dados iniciais reais ou importação automática da planilha.

## Homologação em quatro blocos

| Bloco | Cenários | Esperado |
| --- | --- | --- |
| **1 — Cadastros** | Criar categoria, local, responsável sem login e dois materiais (quantidade e individualizado); pesquisar, editar e inativar um cadastro de teste | Dados persistem e recebem auditoria; matrícula e nome duplicados são recusados |
| **2 — Estoque** | Registrar saldo por quantidade e saldo com duas identificações; consultar unidades; tentar repetir o lançamento ou uma identificação | Estoque e unidades corretos; duplicidades bloqueadas; histórico mostra operador, data e justificativa |
| **3 — Perfis** | Consultar como Conferente DSIPS e entrar com conta somente Patrimônios | Conferente não vê ações de gravação/histórico; conta sem DSIPS não abre suas páginas |
| **4 — Uso e regressão** | Navegar em desktop/celular, atualizar PWA, sair/entrar e conferir Leitura, Relação e Inventários de Patrimônios | Formulários legíveis, menu por contexto e comportamento patrimonial preservados |

Usar somente contas, identificações e saldos de teste no HML.

## Validação realizada

- **138 verificações frontend aprovadas**, incluindo seis testes dos formulários sobre
  o HTML real em DOM: cadastro, consulta, identificações, perfis, reenvio e resposta de outra sessão.
- **14 cenários de integração aprovados no Emulator Suite**, com as Rules reais e
  transações Firestore: leitura negada em Patrimônios e subcoleções, autoatribuição,
  concessão indevida, perfis, escrita direta, auditoria, idempotência, duplicidades e concorrência.
- **Cinco testes da função de concessão de módulos aprovados**.
- Sintaxe e imports locais conferidos. Nenhum login real ou deploy foi feito nesta preparação.

Os testes de integração concluem a checagem técnica pendente da Sprint 2 em ambiente
emulado. A revisão visual e os quatro blocos de homologação em HML permanecem pendentes.
O navegador local de renderização não pôde iniciar; não há captura visual validada.

## Modelo de dados

| Coleção | Finalidade |
| --- | --- |
| dsipsCategorias / dsipsLocais / dsipsResponsaveis | Cadastros auxiliares |
| dsipsMateriais | Definição do material e controle da inicialização |
| dsipsEstoque | Posição inicial única por material |
| dsipsUnidades | Identificações individuais e situação |
| dsipsEventos | Auditoria de cadastros e saldo inicial |
| dsipsChaves | Unicidade dos nomes e matrículas; acesso somente pelo servidor |
| dsipsOperacoes | Recibos de operações para reenvio idempotente; acesso somente pelo servidor |

O serviço carrega os cadastros necessários apenas ao abrir cada tela, sem ouvintes
permanentes ou consultas DSIPS no login. Histórico apresenta os últimos 30 eventos.
Os cadastros são consultados integralmente nesta etapa; paginação será necessária
se o volume crescer muito além do acervo inicial previsto.

## Reversão

Reverter o frontend para a Sprint 2 mantém a interface anterior. Preservar dados e
autorizações do backend; não apagar estoques ou recibos para tentar corrigir lançamentos.
Não reabrir escritas diretas nas coleções DSIPS. Comparar o backup antes de qualquer
reversão das Rules, preservando o bloqueio de acesso por módulo.

## Resultado da homologação

Os quatro blocos foram aprovados pelo usuário em HML. Backend e frontend v1.15.0-H.1 publicados.
