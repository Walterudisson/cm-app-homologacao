# Ciclos de inventário v2 — preparado, sem ativação

O módulo usa os mesmos caminhos históricos de inventarios/{divisao}, fechamentos e itens. O backend
substitui as escritas privilegiadas do navegador. Não publica Rules/Functions nem ativa marcadores.

## Contratos

| Endpoint | Permissão | Uso |
| --- | --- | --- |
| cmappPatrimoniosCatalogo | consultar em alguma abrangência | Catálogo de destinos e capacidades por divisão |
| cmappInventarioConsultar | consultar na divisão | Estado e até 20 fechamentos recentes |
| cmappInventarioComandar | inventarios na divisão | encerrar, avancar, reabrir, reiniciar |
| cmappInventarioConsolidar | inventarios com escopo todos | Consolidação geral de um ciclo |
| cmappInventarioItens | historico; exportar se solicitado | Fotografia paginada de um fechamento |

O registro local contém 31 endpoints de gestão e negócio. consultar/comandar/itens exigem divisão;
comandar exige revisaoEsperada e operacaoId; reabrir exige justificativa. A consolidação aceita somente
ciclo e operacaoId: não recebe um subconjunto de divisões escolhido pelo cliente.

## Fechamento e retomada

encerrar verifica pendências de origem e destino (transferência e sugestão), o estado aberto e o ciclo;
grava o bloqueio encerrando. Esse bloqueio é respeitado pelas operações patrimoniais em suas transações.
avancar lê a autoridade atual, o checkpoint e uma página ordenada de bens, cria os itens da fotografia
e atualiza checkpoint, contadores, revisão, auditoria e recibo na mesma transação. Um reenvio não duplica
itens. O último lote cria o cabeçalho imutável do fechamento e marca a divisão encerrada.

São até 100 bens por etapa, com orçamento de 6 MiB de conteúdo fotografado. Bens maiores reduzem o lote.
A fotografia conserva os campos patrimoniais, incluindo financeiros/cadastrais, a localização e a revisão;
o array histórico de movimentações não é duplicado. Ele permanece no bem e na auditoria operacional.
Cabeçalhos/fotografias anteriores não são sobrescritos. Erro ou revogação conserva o checkpoint e bloqueio;
um gestor atualmente autorizado pode retomar. Não existe desbloqueio silencioso após falha.

## Reabertura, consolidação e novo ciclo

Reabrir exige divisão encerrada, justificativa e ausência de consolidação geral do ciclo. Mantém a
fotografia anterior; o próximo fechamento gera outro identificador. A consolidação reúne no servidor
as divisões do catálogo (inclusive inativas) e dos cabeçalhos existentes. Todas precisam estar encerradas
no mesmo ciclo, com fotografia e totais íntegros. Isso evita omitir divisões ou bens de divisões inativas.
Há limite explícito de 200 divisões; acima disso é necessário ampliar o processamento de consolidação.

reiniciar exige consolidação geral que inclua exatamente a fotografia atual da divisão. Bloqueia como
reiniciando; avancar redefine em lotes a conferência dos bens, preservando localização e histórico e
incrementando a revisão operacional de cada bem. O último lote abre o ciclo seguinte. Assim, uma tela
de conferência anterior não consegue gravar com revisão antiga depois do reinício.
Uma divisão adicionada após a consolidação não pode encerrar retroativamente o ciclo já consolidado:
a entrada de novas divisões exige provisionamento administrativo no ciclo corrente, antes da ativação.

## Interface e limites

patrimonios-v2/ conecta relação, consulta por plaqueta digitada, conferência, sugestões, fila, inventários,
retomada e fotografia/CSV. Compartilha com DSIPS o bootstrap de sessão em area-operacional-v2.js.
A interface percorre no máximo 100 lotes em uma execução e oferece Retomar depois. A consulta/exportação
de fotografia limita-se a 10.000 itens; acima disso falha sem apresentar total parcial. CSV inclui as
colunas de identificação/localização/situação e neutraliza fórmulas; não substitui os relatórios completos
legados. Cada página de exportação também verifica a permissão no servidor.

A listagem de fechamentos retorna os 20 mais recentes; registros anteriores não são apagados. A origem
e o estado do inventário vêm do servidor. Trocar divisão ou sair da sessão cancela logicamente resultados
pendentes. A UI não decide a autoridade por lotação ou perfil antigo. Temas Claro/Escuro/Automático usam
as mesmas variáveis da gestão v2. Nenhuma conta real foi migrada.

## Validação e dependências

227 testes locais e 74 cenários no Firestore Emulator cobrem escopo, operações, lotes, fotografia,
reenvio, bloqueio, reabertura, consolidação, reinício, revisão, revogação e troca de sessão.
São testes de DOM/emulador; não equivalem à homologação visual ou com Authentication real.

Antes de ativar: reconciliar contas/Auth, preparar migração com backup/reversão e validar todos os
cabeçalhos/localizações/catálogos. Implantar os cinco índices compostos preparados (histórico DSIPS e
quatro verificações de pendências patrimoniais). Concluir paridade dos recursos legados de Patrimônios,
incluindo câmera/OCR, filtros/indicadores e relatórios completos, e validar em HML com contas reais.
O corte de Rules bloqueia o cliente patrimonial antigo: não deve ser ativado antes dessa paridade.
A prévia pública continua sendo a demonstração anterior de Usuários/DSIPS, com dados fictícios.

### Leitor, filtros e relação CSV preparados — 16/11/2026

A área patrimonios-v2 reutiliza o controlador homologado de câmera/barras/OCR, com invalidação de
capturas atrasadas por geração/contexto. Método de reconhecimento é preservado na conferência.
Busca e situação são filtradas na página autorizada; indicadores identificam os registros carregados.
A relação pode ser exportada em CSV com permissão verificada por página, limites explícitos e sem
arquivo parcial após erro ou troca de sessão. Ver backend/operacoes-v2/LEITURA-RELACAO.md.
Restam indicadores/ordenações/filtros avançados e relatórios oficiais, homologação de hardware e conta
real, reconciliação Auth e migração/backup/reversão. Não há deploy operacional nesta etapa.
