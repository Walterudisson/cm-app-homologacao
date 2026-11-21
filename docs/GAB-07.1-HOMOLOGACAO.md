# GAB-07.1 | Homologação da fonte única de contatos e órgãos externos

**Candidata:** `v1.13.42-H.1` · **Ambiente:** apenas HML. **Não usar dados pessoais reais.**

## O que foi integrado no frontend
- A Agenda projeta os dez exemplos anteriores, dois órgãos externos sintéticos e o contato **do próprio usuário autenticado**, quando tiver permissão de consulta.
- **Card e ficha:** iniciais ou foto já carregada em Meu Perfil **somente para o titular autenticado**. Não busca fotos de outros usuários, não copia o avatar para o armazenamento local nem publica dados no GitHub.
- Os demais usuários cadastrados ainda não são enumerados na Agenda: sua futura consulta exigirá uma **projeção autorizada pelo backend**, sem tentar buscar coleções privadas do navegador.
- Pessoas internas são **somente consulta** no CRUD demonstrativo. Gestão continua dona de pessoas e usuários; não há formulário Novo usuário/pessoa no Gabinete.
- Divisões já cadastradas são consultadas por IDs/nome via função de leitura **existente** `listarDivisoes` apenas para admin autorizado ao cadastro. Em indisponibilidade, somente divisões **fictícias** estão disponíveis na prévia. Ramal grava `unidadeId` em memória; o nome da divisão é derivado no momento da consulta.
- **Órgãos externos:** CRUD próprio na segunda aba, inclusive deduplicação, revisão, arquivamento e restauração. Órgão referenciado por contatos ativos não pode ser arquivado pela interface.
- **Contatos externos:** cada um aponta para `orgaoId`, e o nome do órgão é derivado de sua única referência. Órgãos também são listados na Agenda como entidades separadas, sem virar usuário.
- **Ramais:** continuam com CRUD demonstrativo, mas novos/alterados selecionam uma divisão por ID.
- Todas as alterações de órgãos/ramais/contatos permanecem **somente na memória desta sessão**. Não grava Firebase, Storage ou cache persistente. Os dados simulados desaparecem com refresh, saída ou troca de conta.

## Roteiro para Android, desktop e PWA

| ID | Ação | Resultado esperado |
|---|---|---|
| GAB-071A-01 | Conferir rodapé | Versão `v1.13.42-H.1` |
| 02 | Abrir Central > Gabinete > Agenda | Cards com avatar e ação Ver ficha |
| 03 | Abrir ficha de pessoa fictícia | Iniciais em destaque, nenhum CPF/nascimento completo |
| 04 | Abrir ficha do próprio usuário | Foto cadastrada em Meu Perfil, se houver; senão iniciais |
| 05 | Trocar/remover a foto do próprio perfil | Card/ficha atualizam ao retornar à Agenda |
| 06 | Abrir Agenda com usuário sem permissão | Bloqueio da consulta preservado |
| 07 | Abrir Gabinete > Cadastros e revisão como admin | Abas Pessoas e ramais / Órgãos externos |
| 08 | Ver Pessoa interna nos cadastros | Somente ficha; sem ação Editar/Excluir |
| 09 | Clicar Novo ramal/contato | Não oferece novo usuário/pessoa |
| 10 | Selecionar Ramal e divisão | Lista de divisões permitidas, identificação por ID |
| 11 | Criar ramal exemplo `0007` | Aparece também na Agenda e tela Ramais |
| 12 | Alterar o ramal | Atualiza as consultas sem duplicação |
| 13 | Escolher aba Órgãos externos | Lista dois órgãos fictícios iniciais |
| 14 | Cadastrar órgão externo fictício | Aparece na aba e na Agenda |
| 15 | Tentar órgão homônimo (acentos/maiúsculas) | Duplicidade bloqueada |
| 16 | Tentar e-mail ou telefone inválido do órgão | Campo identificado, gravação recusada |
| 17 | Selecionar Contato externo e vincular ao órgão | `orgaoId` obrigatório, órgão não duplicado |
| 18 | Alterar nome do órgão | Nome apresentado no contato vinculado muda automaticamente |
| 19 | Tentar arquivar órgão com contato ativo | Recusa com mensagem de vínculos |
| 20 | Arquivar e restaurar órgão sem vínculos | Operações confirmadas funcionam |
| 21 | Filtrar ativos/arquivados, pessoa/ramal/externo | Lista coerente sem modificar dados |
| 22 | Conferir aniversariantes | Pessoas fictícias permanecem; nenhuma data privada |
| 23 | Sair e entrar com outra conta | Dados temporários e foto anterior descartados |
| 24 | Validar não-admin e regressões DSIPS/Patrimônios | Gestão do Gabinete oculta, demais módulos íntegros |
| 25 | Fechar/atualizar PWA Android | Sem tela branca, versão nova e Central correta |

## Gates ainda não vencidos
1. O cruzamento **de todos os usuários reais** com Agenda/DSIPS depende de confirmar `responsavelId`↔UID/`pessoaId`, Rules e Functions implantadas.
2. A foto de **outras pessoas** depende de uma entrega autorizada pela fonte, evitando `getDownloadURL` reutilizável sem controle de escopo.
3. CRUD persistente e concessões granulares são etapas de backend, **não autorizadas nesta sprint**.
4. A promoção PRD só poderá ocorrer após homologação funcional explícita, teste de segurança e aprovação separada.
