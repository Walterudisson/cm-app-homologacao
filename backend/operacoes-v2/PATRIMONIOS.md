# Operações patrimoniais v2 — implementação preparada

Sem publicação ou migração. Esta etapa cobre backend/contratos; não substitui ainda as telas patrimoniais
ou a administração dos ciclos de inventário. A prévia pública de Usuários/DSIPS permanece isolada.

## Contratos

| Endpoint | Entrada específica | Permissão |
| --- | --- | --- |
| cmappPatrimoniosListar | divisao opcional, limite 1–50, cursor opcional, somentePendentes opcional | consultar na divisão; ausência de divisão exige escopo todos |
| cmappPatrimoniosConferir | id, destino, metodoLocalizacao, observacao opcional | conferir na origem efetiva e no destino |
| cmappPatrimoniosSugerirDestino | id, destino, observacao opcional | sugerir na origem efetiva |
| cmappPatrimoniosResolverTransferencia | id, decisao aprovar/rejeitar | aprovar na origem efetiva e no destino pendente |
| cmappPatrimoniosResolverSugestao | id, decisao aprovar/rejeitar | aprovar na origem efetiva e no destino pendente |

As quatro mutações também exigem operacaoId estável por tentativa e revisaoEsperada inteira >=0.
A consulta por ID cmappConsultarPatrimonio continua disponível, dentro do escopo de localização atual.
O cliente js/services/operacoes-v2.service.js contém os cinco contratos novos, sem fallback legado.
O preparador Functions agora registra 26 endpoints e copia patrimonios.cjs.

A revisão deve vir do último registro lido (revisaoOperacionalV2, ou zero se ausente). Se outra operação
alterar o bem, a confirmação antiga falha com aborted e pede atualização; não decide uma nova solicitação
com base na tela anterior. Uma repetição com mesmo operacaoId/conteúdo recebe o resultado confirmado,
sem repetir histórico. Outro conteúdo com o mesmo ID é recusado. Mesmo no replay, a autorização vigente
é verificada contra as divisões registradas no recibo.

## Estados e integridade

A conferência mantém o comportamento anterior: no mesmo local, registra localizado/concluído; se houver
mudança, registra localizado e transferência pendente, mantendo o local efetivo até a decisão.
A sugestão só se aplica a bem ainda não localizado, com destino diferente, sem outra solicitação pendente.
Aprovar sugestão muda a localização administrativa, preserva não localizado e exige conferência física.
Rejeitar preserva a localização anterior. Origem/destino bloqueados pelo inventário impedem mutações.
Destino novo precisa existir, ser ativo e único pelo nome no catálogo. Rejeitar não depende de o cadastro
de destino continuar ativo; ainda exige autorização e inventário aberto nas divisões envolvidas.

Conferência e aprovação requerem abrangência nas duas divisões. Isso impede que o gestor de uma única
área modifique o acervo de outra. Sugestão permite indicar outra divisão sem ganhar visibilidade ou poder
sobre seus bens. Essa regra é deliberadamente mais restrita que a leitura global por plaqueta do legado;
a comparação de acessos na migração deverá considerar os fluxos entre divisões. Não ampliar escopo pela
lotação, por perfil antigo ou por um campo de origem enviado no formulário.

Todas as mutações leem identidade, política, bem, inventários, destino e recibo na mesma transação.
Gravam bem/histórico, evento imutável em patrimoniosEventos e recibo em patrimoniosOperacoes atomicamente.
Operador e versão/revisão de autorização vêm do servidor. Datas são geradas pelo servidor; o histórico
mantém a apresentação pt-BR/America-Sao_Paulo compatível com a operação anterior. O evento possui também
registradoEm do Firestore. Campos desconhecidos, como perfil, usuário, histórico ou data, são recusados.
A revisão operacional do bem é separada da revisão de autorização da conta.

## Preparação obrigatória da localização e transição

O campo localizacaoEfetivaV2 é derivado no servidor por localizacaoAtual || divisaoOrigem || divisao.
Mutações v2 o mantêm sincronizado. A listagem faz query pelo campo e não varre o acervo inteiro para
filtrar no navegador. O filtro de pendências é aplicado na página autorizada; pode haver uma página vazia
com proximoCursor. O cliente deve continuar a paginação e não tratar essa página como total zero.

A listagem exige, no documento cmappConfiguracao/acessos, patrimoniosIndiceVersao=2 e
patrimoniosOperacaoVersao=2. Essas marcas representam preparação integral e transição dos operadores.
Não são instrução para habilitação manual. Ainda falta implementar o migrador com backup, validação de
todos os bens, aplicação idempotente e reversão. Se o índice e a localização real divergirem em uma página,
a consulta falha explicitamente; não devolve registros de outra divisão ou totais parciais.

O preparador local de Rules de transição bloqueia temModulo('patrimonios') no legado quando
patrimoniosOperacaoVersao=2: isso fecha leitura/escrita patrimonial e caminhos de inventário do cliente
antigo, inclusive admin não migrado. Sem a marca, o legado continua operando. DSIPS e gestão de contas
não recebem esse bloqueio por esse marcador. Essa verificação evita escritores antigos que alterem o
local do bem sem atualizar o índice v2. O corte exige implantação conjunta das Rules, conclusão dos
controladores e migração de todos os operadores patrimoniais; não pode ser feito parcialmente em uso.
O bloqueio/drenagem antes da migração continua necessário para chamadas/gravações em andamento.

## Verificação e trabalho restante

211 testes frontend/política/pacote/DOM e 62 cenários no Firestore Emulator aprovados. Os cenários novos
cobrem listagem por alçada, índice/preparação, conferência, sugestão sem localização física, decisões,
permissão nas duas divisões, estado do inventário, destino inativo/duplicado, revisão obsoleta,
concorrência e reenvios. As Rules de transição foram testadas antes/depois do marcador do módulo.

Restam conectar as telas patrimoniais aos contratos, finalizar ciclos/fechamentos/reabertura/exportação,
preparar migração da base/acessos, reconciliação de Authentication e homologação com contas reais de HML.
Não há deploy de Functions/Rules, alteração de dados reais ou ativação dos marcadores nesta etapa.
