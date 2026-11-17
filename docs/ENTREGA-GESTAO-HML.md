# Entrega piloto: gestão de usuários em HML

Rota: https://walterudisson.github.io/cm-app-homologacao/homologacao/gestao-acessos/

Esta rota usa Authentication/Firestore/Functions reais do HML. Tem entrada própria com as mesmas
credenciais do CMAPP, temas Claro/Escuro/Automático, diretório, cadastro de conta básica, matriz,
concessões e delegações limitadas, histórico e perfil. Os outros usuários legados aparecem no
diretório, identificados como pendentes de migração; não se presume equivalência de permissões.
Links operacionais ficam ocultos neste piloto. A conta migrada não usa privilégios pelo fluxo legado.
A entrada antiga dos outros usuários e a prévia fictícia permanecem preservadas.

## Publicação

Gerar com `node scripts/preparar-gestao-piloto-hml.mjs`. Publicar apenas homologacao/gestao-acessos/,
sem substituir a raiz do site nem fazer merge de toda a modularização. O gerador inclui dependências
locais, mantém o controlador compartilhado e usa o mesmo SDK/configuração HML; não há dados fictícios.
Não publicar esta rota em PRD. O login não registra senha em logs ou armazenamento próprio.

## Habilitação em um comando

Backend e Rules de transição devem estar publicados; o deploy deles já foi confirmado no log.
O script verifica a rota publicada, quinze funções de gestão ACTIVE e os marcadores das Rules antes
de tocar na base. Usa Node 22 e o Admin SDK já instalado no pacote Functions indicado.

```bash
node scripts/homologar-gestao-hml.mjs ativar caminho/functions revisao-hml.json pasta-estado
```

O arquivo de revisão contém só o UID inicial explicitamente autorizado, ambiente hml, projeto
cm-app-homologacao e política Superadmin. A ferramenta faz snapshot novo sob manutenção; não depende
de o snapshot preliminar ainda estar atual. Propõe apenas usuarios/UID e cmappAcessos/UID, com recibo
e evento. Não ativa índices, Patrimônios ou DSIPS, nem migra outras identidades ou altera Auth.

Fluxo: verifica publicação; salva configuração original; toma manutenção com token próprio; desliga
sincronização; drena 120 segundos com progresso a cada 30; lê snapshot tipado das cinco coleções raiz;
salva revisão/plano; aplica transacionalmente; confere os dois documentos e Auth; restaura somente
as flags alteradas; conclui com o link. Os dados completos ficam em pasta local privada, nunca no git.

A pasta registra progresso. Repetir o mesmo comando após interrupção retoma a migração pelo recibo,
sem repetir deploy ou duplicar documentos. Uma execução já concluída apenas confere a identidade.
Uma falha após a aplicação tenta reverter o plano e liberar a manutenção; se a recuperação não puder
ser confirmada, mantém o bloqueio e informa a necessidade de recuperação explícita. Não toma
manutenção de outro administrador. Flags alteradas por terceiros impedem restauração silenciosa.

## Recuperação

```bash
node scripts/homologar-gestao-hml.mjs status caminho/functions revisao-hml.json pasta-estado
node scripts/homologar-gestao-hml.mjs reverter caminho/functions revisao-hml.json pasta-estado
```

A reversão também drena chamadas e confere se os documentos continuam iguais ao plano aplicado.
Mudança posterior no perfil/acesso impede sobrescrever dados. Recibos e auditoria permanecem.
Após reversão, uma nova ativação exige pasta nova, para gerar novo identificador e novo plano.
O snapshot das coleções raiz não é backup integral de Storage/Auth/subcoleções; eles não são alterados.
A documentação geral de migração continua em MIGRACAO-ACESSOS-V2.md.

## Homologação pelo titular

Entrar na nova rota com a conta autorizada; conferir identificação Superadmin, 13 usuários ou a
contagem atual, matriz e os três modos de tema. Selecionar uma conta legada deve informar necessidade
de migração. Para testar cadastro/mudanças/concessões, usar uma conta fictícia nova em HML; recuperação
de senha é ação separada com envio real de e-mail. Perfil deve continuar disponível ao voltar à rota.
O teste automatizado usa Auth simulado; login real, visual em dispositivos e e-mails dependem de HML.
