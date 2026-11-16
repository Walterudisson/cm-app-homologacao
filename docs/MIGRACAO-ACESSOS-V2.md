# Migração de acessos v2

Estado: ferramentas preparadas para revisão e execução em HML. Nenhuma conta real foi migrada.

## O que é automatizado

- Planejamento local sem credenciais, por conta explicitamente revisada. Admin legado não se torna
  Superadmin automaticamente. O UID inicial precisa ser informado no arquivo de revisão por ambiente.
- Snapshot das coleções raiz usuarios, cmappAcessos, divisoes, patrimonios e inventarios. Datas,
  referências, coordenadas e bytes são preservados com um codec de tipos. Números não finitos e
  colisão com o campo reservado `$cmappTipo` interrompem a exportação.
- Aplicação atômica de até 150 documentos e 6 MiB propostos por plano. O limite é conservador:
  snapshots com muitos bens devem ter preparação segmentada antes de habilitar a operação.
- Preparação opcional de localizacaoEfetivaV2 sem apagar histórico, situação ou localização original.
  Catálogo duplicado, bem sem divisão conhecida ou localizado não booleano bloqueiam o plano.
- Backup local de todos os documentos antes/depois alterados, criado com permissão 0600 e sem
  sobrescrever arquivos existentes, antes de qualquer escrita. A reversão usa o mesmo plano original.
- Recibos e eventos de aplicação/reversão são conservados. Reenvios não repetem alterações.
- Divergência posterior em qualquer documento alterado recusa a reversão inteira. Não há restauração
  forçada ou exclusão de novos registros criados depois da migração.

O snapshot e o backup dos documentos alterados **não são um export integral do Firestore**: não incluem
subcoleções de fotografias de inventário, Storage nem Firebase Authentication. Nenhum desses recursos
é alterado pela ferramenta. Antes do corte, preparar também o backup institucional completo e validar
sua restauração. O hash do plano identifica alterações acidentais; não é assinatura nem autorização.

## Janela de manutenção

Primeiro publicar os callables protegidos e as Rules locais geradas pelo preparador. Não basta escrever
uma flag se os escritores legados/Rules ainda não a respeitam. Revisar o diff das Rules e índices.

No documento cmappConfiguracao/acessos, definir:

```json
{"manutencaoV2":true,"legadoBloqueado":true,"sincronizacaoContasAtiva":false}
```

Aguardar o término das chamadas anteriores e das concessões de execução (pelo menos 120 segundos,
confirmando também os logs). Isso precisa ser feito antes do snapshot e de qualquer escrita. A transição
não é um bloqueio distribuído do Firebase Authentication, que não oferece uma transação com o Firestore.
O perfil próprio também fica temporariamente indisponível nas Rules preparadas.

As ferramentas não ativam nem removem manutenção, não habilitam a operação patrimonial e não fazem
deploy. O encerramento da manutenção é um passo distinto, após comparar o resultado com a matriz
aprovada, revisar ciclos de inventário e validar login/autorização em HML.

## Comandos

Usar Node 22. O pacote Functions informado deve conter o Admin SDK instalado. Não usar o projeto
padrão do gcloud/.firebaserc como indicação do ambiente. Os pares permitidos são HML /
cm-app-homologacao e PRD / patrimonioscm. A credencial ADC precisa ter autorização para o projeto.

```bash
node scripts/migrar-acessos-v2.mjs snapshot hml cm-app-homologacao /caminho/functions snapshot-hml.json
node scripts/migrar-acessos-v2.mjs planejar snapshot-hml.json revisao-hml.json plano-hml.json
node scripts/migrar-acessos-v2.mjs aplicar hml cm-app-homologacao /caminho/functions plano-hml.json backup-aplicacao-hml.json cm-app-homologacao
node scripts/migrar-acessos-v2.mjs reverter hml cm-app-homologacao /caminho/functions plano-hml.json backup-reversao-hml.json cm-app-homologacao
```

Aplicar/reverter exigem o ID do projeto repetido ao final, revisão explícita no plano, manutenção atual
no servidor e backup local gravado com sucesso. Antes de aplicar, comparam também as coleções completas
do snapshot para detectar novos documentos. A reversão compara apenas os documentos alterados, para
não desfazer trabalho de outros recursos. Após reversão, um novo avanço exige novo snapshot e plano.

Arquivo de revisão (exemplo; substituir UID e responsável pelos dados reais de HML):

```json
{
  "ambiente":"hml",
  "projectId":"cm-app-homologacao",
  "superadminUid":"UID-EXPLICITO-DE-HML",
  "revisadoPor":"Responsável pela revisão",
  "prepararPatrimonios":false,
  "contas":[{
    "uid":"UID-EXPLICITO-DE-HML",
    "revisado":true,
    "politica":{
      "papelPlataforma":"superadmin",
      "permissoesPlataforma":[],
      "atribuicoes":[],
      "delegacoes":[]
    }
  }]
}
```

Todas as contas selecionadas precisam ter ativo booleano, nome e e-mail válidos. A ferramenta não
infere concessões a partir da lotação e não altera a situação no Authentication. A equivalência dos
acessos legados exige revisão humana da análise produzida por analisar-acessos-legados.mjs.
Não usar UIDs de outros sistemas (por exemplo, Sinal) como identidade do CMAPP.

## Retomada automática de contas

O preparador Functions registra cmappSincronizarContas, a cada cinco minutos, com timeout de 60s,
uma instância e concorrência 1. O trabalho só atua com sincronizacaoContasAtiva === true e manutenção
desligada. O padrão é inativo. Processa até 25 pendências por rodada; cursor persistido evita que
falhas permanentes nos primeiros UIDs impeçam a tentativa dos demais. Falhas não apagam pendências.
Concessões de execução de 120s permitem retomar após interrupções. A cada conta, relê a configuração.
Não registra e-mails/senhas em logs e não cria permissões, não ativa contas inativas no CMAPP,
não exclui identidades Auth nem envia mensagens. Reservas de criação não confirmadas continuam
desabilitadas e exigem retomada da operação original ou análise administrativa.

Limite conhecido: o Authentication não tem compare-and-swap; uma chamada externa suspensa além da
concessão pode divergir temporariamente. Confirmar o término da execução anterior e repetir a
reconciliação. Os testes de Auth são simulados; validação real em HML continua necessária.

## Antes de liberar HML operacional

1. Validar o UID inicial e a matriz revisada, backup completo e rota de reversão.
2. Publicar Rules/callables/índices e versão de frontend correspondentes na janela acordada.
3. Validar os ciclos atuais de inventário e todas as localizações, inclusive lotes maiores que o limite.
4. Executar snapshot, planejamento e aplicação, conferindo recibos e estado final ainda em manutenção.
5. Liberar as flags de operação somente após a revisão. Validar cada perfil com login real, câmera/OCR,
   Android/PWA, índices, desempenho e atualização do cache. Só então encerrar a homologação.

A publicação do job cria recurso no Cloud Scheduler; consultar a documentação oficial antes do deploy:
https://firebase.google.com/docs/functions/schedule-functions?hl=pt-br


## Preparação preliminar de HML com o sistema disponível

`scripts/preparar-plano-hml.mjs caminho/functions revisao-hml.json pasta-nova` faz apenas leituras.
Valida o UID inicial e seu e-mail/estado no Authentication e na conta CMAPP, lê as cinco coleções raiz
em transação readOnly e gera snapshot.json, plano.json e resumo.json. O plano contempla somente a
conta inicial explícita; não ativa Patrimônios nem converte outras contas. PRD é recusado.

Essa análise preliminar dispensa manutenção porque não altera o servidor; a aplicação posterior
continua exigindo manutenção, drenagem, backup e comparação integral dos dados lidos. Se a base
mudar, gerar outro plano. Dados reais não fazem parte do código versionado: a revisão com o UID
informado e os resultados ficam no pacote/ambiente de execução. O resumo omite nomes e e-mails;
os demais arquivos contêm dados da base e não precisam ser enviados para a conversa nesta etapa.

O codec de backup é compartilhado pelos dois comandos, preservando os tipos retornados pelo SDK.
Os testes verificam também a precisão efetivamente armazenada dos Timestamps no emulador.
