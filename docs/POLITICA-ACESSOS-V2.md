# Base de autorização v2 — primeira entrega

Data: 16/11/2026. Implementação isolada, sem importação no app.js, sem alteração de Rules, Functions,
PWA ou versão operacional. O CMAPP publicado continua aplicando os acessos legados.
Não é uma migração concluída nem um backend de autorização publicado.

## Componentes

- js/platform/access/catalogo.js: ações, papéis padronizados e escopos suportados.
- js/platform/access/politica.js: avaliador puro para operação, plataforma e delegação.
- js/platform/access/legado.js: análise de candidatos legados, sem gravação.
- scripts/analisar-acessos-legados.mjs: CLI de leitura local e relatório JSON no stdout.
- fixtures/acessos-legados-exemplo.json: seis identidades fictícias, sem dados reais.

Não há wildcard para apagar registros ou histórico. Inativação e operações de negócio têm ações próprias.
Superadmin cobre as ações declaradas no catálogo, inclusive leitura global; identificadores inexistentes
continuam negados. Administradores só recebem permissões de plataforma expressamente registradas.
Lotação, modulos e perfil legados nunca são usados pelo avaliador v2 como fallback.

## Contrato de referência

O avaliador recebe um objeto autenticado e carregado do servidor com:

```json
{
  "uid": "exemplo-conferente",
  "versao": 2,
  "ativo": true,
  "papelPlataforma": "usuario",
  "permissoesPlataforma": [],
  "atribuicoes": [{
    "moduloId": "da", "funcionalidadeId": "patrimonios", "papelId": "conferente",
    "escopo": {"tipo": "divisoes", "ids": ["DA", "Gabinete"]}
  }],
  "delegacoes": []
}
```

Esse objeto não pode vir do body da requisição. O UID vem da autenticação; situação e concessões vêm
somente da fonte administrativa protegida. O armazenamento definitivo e os adaptadores de leitura
serão definidos na integração com Functions/Rules; este DTO não autoriza mover todos os dados para
um documento de perfil consultável por outros usuários.

Para Patrimônios, os escopos são todos ou divisoes com lista explícita (até 100 IDs/nomeadores nesta base).
A denominação atual das divisões é preservada na análise; adoção de IDs organizacionais estáveis exige
mapeamento posterior. Para DSIPS, o escopo inicial é todos dentro de Materiais e Cautelas.
Consulta de listagem deve gerar consultas compatíveis com a abrangência; não baixar tudo e ocultar depois.
Em operações sobre recurso, divisaoId deve ser obtido do recurso no servidor. Durante transferências,
o adaptador precisará verificar origem, destino e invariantes do fluxo, não só um campo fornecido pelo cliente.
Operações de lote/ciclo exigem verificação de todos os recursos e divisões afetadas.

Acúmulo de papéis é união de atribuições completas: a ação e o recurso devem caber na mesma atribuição.
Não combinar uma ação de uma divisão com o escopo de outra para obter privilégio novo.

## Operação, gestão e delegação

Papel operacional gestor não implica poder para conceder acessos. Delegações separadas possuem nível
modulo ou funcionalidade e limites explícitos por funcionalidade, papel operacional e escopo.
Um gestor de módulo não recebe automaticamente concessão sobre funcionalidades futuras.
Ele seleciona qualquer usuário ativo, sem requisito de mesma lotação. Não concede gestor, administrador
ou Superadmin, não altera sua própria autorização e não amplia o escopo delegado.

Superadmin ou administrador com gestores.designar pode designar gestão/delegação. Administrador com
acessos.conceder pode conceder acessos operacionais; isso é atribuição explícita separada de contas.gerenciar.
Conceder acesso a alguém inativo é negado; revogar uma atribuição existente de conta inativa é permitido à autoridade competente. Administração de contas pode reativar uma conta comum inativa,
mas um administrador comum não modifica Superadmin; edição própria fica no fluxo Meu perfil.

Revogação avaliada aqui remove uma atribuição inteira dentro do limite do autor. Se uma atribuição
abranger áreas fora da delegação, um gestor local não pode removê-la inteira. Alteração parcial exige
substituição auditada na integração, preservando as áreas fora do seu alcance.

## Migração: somente análise nesta etapa

```bash
node scripts/analisar-acessos-legados.mjs fixtures/acessos-legados-exemplo.json
```

Entrada obrigatória: ambiente hml/prd explícito e lista de usuários com UID. UID duplicado interrompe.
Relatório inclui situação por UID, candidato de atribuições e pontos de revisão. Nenhum candidato é aplicado.
Não há conexão Firebase, credencial, SDK administrativo ou modo de escrita nesse script.
Relatórios com usuários reais devem permanecer privados; não subir exportações reais no repositório.

Admin legado exige designação manual: nunca promovê-lo automaticamente. Gestor legado pode ter acessos
comuns a usuários e divisões; sua conversão não é equivalência simples. Conferente tem diferenças de
leitura direta e histórico entre o modelo antigo e o novo. Auditoria de cadastros/saldo DSIPS precisa
ser separada do histórico de movimentações antes de liberar este último ao Operador.
Funções personalizadas e permissões adicionais exigem análise, não descarte. Documento já v2 não é
reconvertido; versões desconhecidas não recorrem ao perfil antigo. Conta inativa continua inativa.

Os exemplos demonstram: admin com designação manual, quatro casos com revisão e básico sem operação.
Essa simulação não representa inventário dos usuários reais de HML ou PRD.

## Validação e próximos passos

24 cenários específicos cobrem negação por padrão, Superadmin, TI, Conferente, Operador, múltiplas
atribuições, delegação por módulo/funcionalidade, escopo, autoelevação e análise de legado.
Rodar também a suíte frontend existente com CMAPP_INTERNAL_ROOT apontando ao pacote interno de teste.

A política já é aplicada nos endpoints de gestão e testada no Firestore Emulator. Bibliotecas
administrativas não obedecem às Rules; os novos endpoints leem autorização atual no servidor.
Ainda falta portar as operações e Rules de negócio de Patrimônios/DSIPS antes de ativar contas reais.

## Serviço e interface preparados

Treze endpoints e empacotamento local estão em backend/acessos-v2/README.md. A rota gestao-v2/ usa
sessão e dados reais, acompanha revisão e oferece perfil próprio ao usuário básico. Não foi publicada.
As proteções de transição bloqueiam uso de privilégios legados por contas versionadas; elas não
substituem a migração nem habilitam o negócio v2. Descritores corrompidos não liberam gestão.

Validação atual: 208 testes frontend/política/pacote e 46 cenários no Firestore Emulator. Incluem
ciclo de contas, falha de sincronização Auth, reenvio antigo, limites de gestor e Rules de transição.
Permanecem migração com UID inicial explícito, backup/reversão, reconciliação Auth/Firestore,
homologação visual e extensão de temas ao restante do sistema. Nenhum usuário real foi alterado.

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
