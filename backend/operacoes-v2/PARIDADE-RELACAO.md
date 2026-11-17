# Comparação de indicadores e relatórios patrimoniais

Fonte comparada: app.js, index.html e js/core/relacao.js da base CMAPP existente no repositório.
Esta etapa permanece no PR de desenvolvimento; não publicou serviços ou migrou dados reais.

| Recurso da base | Tratamento em v2 |
| --- | --- |
| Leitura por digitação, barras e OCR | Controlador compartilhado; confirmação humana antes de salvar |
| Busca numérica por início da plaqueta, mínimo três dígitos | Range de document ID no servidor; cursor validado dentro do prefixo |
| Busca por descrição/marca/modelo | Adicional; filtro de texto na página autorizada, com cursor para continuar |
| Situação/localização | Filtros por divisão e estado; sugestão continua não localizado |
| Relação agrupada por divisão, inicialmente expandida | Grupos dos registros carregados com Expandir/Recolher; preserva estado ao carregar mais |
| Indicadores do acervo | Endpoint de agregação da abrangência autorizada, independente da paginação |
| CSV geral | Toda a abrangência selecionada, sem filtros de texto/situação |
| CSV pendentes | Não localizados e transferências aguardando aprovação na abrangência |
| CSV filtrado | Divisão, busca e situação atuais |

A fonte legada oferece essas três exportações em CSV. Não foi encontrado gerador de PDF/XLSX nesse
fluxo. Portanto, “relatórios oficiais pendentes” nas anotações anteriores não representa um formato
adicional confirmado pelo usuário. Esta comparação substitui essa pendência genérica para a Relação.
Novos modelos institucionais ou PDF/XLSX devem ser definidos como nova demanda, se necessários.

## Totais e permissão

cmappPatrimoniosResumo recebe somente divisao opcional. Sem divisão, exige consulta com escopo todos;
com divisão, exige consulta nessa divisão. Não usa lotação ou perfil antigo. Exige as marcas de
preparação/transição, e lê conta, política e agregações na mesma transação. O SDK Admin instalado
suporta AggregateQuery em Transaction.get; a implementação foi verificada no emulador.

As contagens incluem total, localizados sem transferência pendente, não localizados, aguardando
transferência e sugestões em análise. Sugestões são informativas e não uma quinta categoria exclusiva.
O progresso é localizados/total, ou zero quando não existem bens. A soma das três situações principais
é o total. Há índices compostos preparados para as agregações; a base precisa ter sido integralmente
validada/normalizada antes de habilitar os marcadores.

A interface separa “Totais da abrangência selecionada” de “Registros carregados”. Os totais não aplicam
busca textual ou situação; esse fato é informado na tela. Trocar a divisão/sessão invalida respostas
atrasadas. Falha não se transforma em zero. Conferência, decisão e término dos ciclos atualizam os totais.
Agregações transacionais podem competir com escritas de grandes acervos; homologar desempenho/latência
na dimensão real antes de ativar, sem abandonar a verificação de autorização vigente.

## CSV compatível e limites

Os sete campos e sua ordem foram preservados:
Plaqueta; Divisao Anterior; Local Atual; Status; Conferido Por; Descricao; Data Ultima Atualizacao.
Os estados são LOCALIZADO, PENDENTE e AGUARDANDO APROVAÇÃO. O formato usa UTF-8/BOM, ponto e vírgula,
aspas escapadas e proteção contra fórmulas. O arquivo segue relatorio_geral, relatorio_pendentes ou
relatorio_filtrado com data America/Sao_Paulo. Não gera arquivo vazio ou parcial após erro/limite.

Cada página exige exportar na abrangência, mesmo nos relatórios geral e pendentes. “Geral” não significa
ignorar a divisão nem ler acervo fora do escopo. O filtro de texto é removido somente nessa modalidade;
filtrados conserva os filtros e pendentes agrupa as duas situações não concluídas. O limite atual é
10.000 registros; volumes maiores exigem exportação ampliada, ou divisão dos filtros. A relação corrente
não é fotografia imutável; para registro de encerramento, usar a fotografia de inventário.

## Validação e próximos bloqueios

230 testes locais e 78 cenários no Firestore Emulator aprovados. Cobrem contagens além da primeira
página, escopos, preparação, revogação, classificação, prefixo/cursor numérico, modos de CSV, campos,
data local, grupos e distinção entre totais e registros carregados. Não substituem homologação de
hardware, Auth ou desempenho reais.

Antes de ativar: reconciliação Auth–Firestore; simulação/revisão de equivalências e migração integral
com backup/reversão; provisionamento de novas divisões em ciclos existentes; instalação dos oito índices
compostos preparados; cache/PWA/release e homologação de dispositivos/fluxos reais. Perfil próprio,
configurações compartilhadas e demais recursos de plataforma também precisam da conferência final
contra o legado antes de desativar seus caminhos de operação.
