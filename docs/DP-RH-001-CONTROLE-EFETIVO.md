# DP-RH-001 | Controle de efetivo como visão do cadastro institucional único

**Decisão de produto:** 21/11/2026. **Situação:** planejamento funcional; sem implementação ou alteração de dados, backend ou PRD.

## Visão aprovada

O módulo de **Recursos Humanos (RH)** terá, como primeira entrega, uma **visualização moderna, pesquisável, responsiva e organizada da planilha "Controle Geral do Efetivo"**, que tem origem no próprio setor de RH. Não se pretende construir um sistema complexo de RH na primeira fase.

A **fonte de referência de pessoas** deve ser a mesma do cadastro institucional de usuários/pessoas do CMAPP, aproveitada pela Agenda do Gabinete, responsáveis de cautelas da DSIPS e, no futuro, outros módulos. **Não criar um cadastro duplicado do efetivo dentro de RH.**

## Separação das responsabilidades

| Componente | Responsabilidade |
|---|---|
| Cadastro institucional único de pessoas | Identificação da pessoa, nome, posto/graduação/cargo, lotação/divisão e informações cadastrais institucionais, com identificador estável. Abrange também pessoas sem acesso ao aplicativo, quando necessário. |
| Gestão de usuários e acessos | Conta Firebase Auth/UID quando existir, credenciais, status de acesso, módulos, concessões, perfis e permissões. Ter vínculo com uma pessoa **não** significa que ela deva ter login. |
| RH | Referência administrativa para as informações do efetivo vindas da planilha: lotação, situação funcional e demais colunas homologadas; responsáveis por manter e validar informações funcionais conforme a política institucional. Não duplica identidade. |
| Gabinete | Diretório telefônico, ramais e órgãos externos, consultando apenas projeções autorizadas da mesma pessoa/divisão. |
| DSIPS | Responsáveis e histórico de materiais por identificadores preservados e conciliados com a mesma pessoa. |

A autoridade de edição de cada campo será definida em matriz de governança de dados antes da integração real. Informações funcionais gerenciadas pelo RH não devem ser alteradas indiscriminadamente por qualquer administrador de contas.

## MVP do RH: planilha com experiência de aplicativo

1. **Painel de efetivo:** total e distribuição do efetivo, situação funcional, distribuição por divisão/unidade, com indicadores a definir após inspecionar as colunas reais e regras de contagem.
2. **Relação de efetivo:** pesquisa e filtros por dados realmente presentes na planilha; tabela mobile-first com cards adaptativos, ordenação, agrupamento e paginação.
3. **Ficha funcional:** apresentação organizada de informações autorizadas, sem novo cadastro da pessoa; possível acesso ao perfil institucional por identificador.
4. **Origem e qualidade dos dados:** indicar data da última atualização, fonte da planilha, inconsistências e necessidades de revisão sem duplicar pessoas.
5. **Conciliação:** importação futura com prévia de inclusões/alterações/conflitos e correspondência entre linha da planilha e pessoa já cadastrada, **sem gravar no banco ou criar conta automaticamente**. Antes de efetivar, validar amostra, cabeçalhos, chaves e autoridade do RH.

Não presumir que a coleção `usuarios` já contém todos os integrantes do efetivo ou que todos devem possuir login: o modelo institucional único precisa permitir vínculo opcional com `uid`. A planilha do RH pode conter pessoas sem conta. Preservar UID, vínculos da DSIPS, identificadores de divisões e histórico.

## Fases futuras exclusivas do RH

- **Controle de férias:** planejamento e períodos, situação, saldos/regras conforme a política aplicável, fluxos de análise/aprovação e histórico; especificação específica posterior.
- Outras funcionalidades de RH a discutir, priorizadas conforme necessidades reais; não incluir no MVP sem decisão expressa.

Férias não devem ser confundidas com status de login ou com suspensão de direitos de acesso à Agenda. Afastamentos e dados eventualmente sensíveis exigem permissões adequadas e minimização.

## Privacidade e segurança

- Controle de acesso ao RH expresso e **mais granular** que a simples presença no módulo. Fichas e informações funcionais ficam visíveis apenas a usuários autorizados.
- Diferenciar **dados de diretório institucional** de **dados internos de RH** e de **dados pessoais restritos**; não repassar colunas privadas em APIs da Agenda, busca geral ou prévias estáticas.
- CPF, nascimento completo e dados sobre saúde/atestados não integram automaticamente a visão comum do efetivo; tratamento separado, com justificativa e autorização.
- Nenhuma planilha real ou registro pessoal em GitHub Pages, commit, asset público, fixture de testes, cache PWA ou logs.
- Sem mudanças em Rules, Cloud Functions, Firestore, índices, importação real ou PRD antes de inspeção técnica e autorização específica.

## Ordem sugerida no roadmap

1. Concluir homologação da GAB-07.1 e GAB-09.
2. Evoluir **Gestão** e o cadastro institucional único, com matriz de responsabilidade por campo e vínculo de usuários/divisões/DSIPS.
3. Planejar **RH-00**: mapear colunas da planilha original, indicadores, filtros, permissões e protótipo visual com dados fictícios, sem acesso indevido.
4. Executar **RH-01**: painel e relação do efetivo com experiência mobile-first e ficha funcional demonstrativa.
5. **RH-02 em etapa posterior:** conciliação/importação de dados reais com autorização específica e backend seguro.
6. **RH-03+ futuro:** controle de férias e outras rotinas de RH.

A nomenclatura RH-00/RH-01/RH-02/RH-03+ é apenas sugestão inicial de planejamento e pode ser refinada na priorização, sem reservar sprint imediata.

## Critérios de aceite arquiteturais

- A mesma pessoa aparece coerentemente em Gestão, RH, Gabinete e DSIPS sem novo registro duplicado.
- Alterações de lotação e situação funcional seguem autoridade de dados e não revogam conta nem apagam cautelas.
- Usuários com login e integrantes do efetivo sem login podem coexistir no cadastro institucional único.
- O RH reproduz o significado real das colunas e contagens da planilha, evitando inferências de status ou hierarquia.
- A primeira experiência deve favorecer **consulta rápida, filtros, visualização e gestão da qualidade**, sem impor fluxo de férias ou folha de pagamento antes de especificação.
