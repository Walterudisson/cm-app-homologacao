# Sprint 1 — Base modular do CMAPP

Status: homologação funcional concluída pelo usuário, MOD-01 a MOD-13.
O ajuste visual da faixa HML sobre a marca foi encaminhado para a Sprint 2.

Versão candidata: **v1.14.0-H.1**. Ambiente exclusivo: HML.
Base: `Walterudisson/cm-app-homologacao`, commit `330fb23b542707ee4e611b7301e815060cf72f4f`.

## Entrega

- Patrimônios é declarado como módulo ativo e possui carregador próprio.
- Conta, Usuários, Divisões e Funções permanecem recursos comuns.
- Catálogo compartilhado orienta seções, títulos, breadcrumb e carregamento de páginas.
- DSIPS está apenas reservado no catálogo, sem funcionalidades ou botão de acesso.
- O menu, componentes, estilos, dados e serviços existentes são reaproveitados.
- Login passa a apresentar CM APP; sidebar e trilhas identificam Patrimônios.
- Guarda de navegação valida o destino antes de alterar seção, histórico ou iniciar consultas.

Não inclui seletor de módulos, concessão de acesso a DSIPS, estoque, cautelas, migração
de dados, subdomínio ou alterações de Rules e Functions. Isso pertence às sprints seguintes.

## Publicação em HML

1. Revisar e integrar a branch da Sprint 1 exclusivamente na `main` de homologação.
2. Aguardar a publicação do GitHub Pages e abrir o endereço HML.
3. Se o PWA oferecer atualização, aceitá-la; confirmar **v1.14.0-H.1** no login e no rodapé.
4. Executar o roteiro abaixo com contas e itens de teste, registrando resultado por ID.
5. Não promover para produção antes de concluir essa homologação.

Não há deploy de backend nem edição de configuração Firebase nesta entrega.

## Roteiro de homologação

| ID | Verificação | Resultado esperado |
| --- | --- | --- |
| MOD-01 | Abrir o HML e entrar com conta ativa | Versão v1.14.0-H.1 e entrada direta no Painel de Patrimônios |
| MOD-02 | Administrador navegar entre Painel, Leitura, Relação, Inventários e Fila | Mesmas funcionalidades; trilha identifica Patrimônios; somente a seção escolhida visível |
| MOD-03 | Abrir Usuários, Divisões, Funções e Meu perfil | Gestão e Conta em contexto comum, sem perder dados, filtros e ações permitidas |
| MOD-04 | Entrar como Gestor | Consultar gestão conforme permissões atuais; Funções não disponível |
| MOD-05 | Entrar como Conferente | Leitura, Relação, Inventários e Meu perfil disponíveis; gestão e fila bloqueadas |
| MOD-06 | Selecionar divisão em foco e alternar Painel/Relação | Mesmo escopo e mesmos totais; seletor aparece somente nessas duas telas |
| MOD-07 | Consultar item, registrar conferência e rever histórico | Fluxo, persistência e auditoria existentes preservados |
| MOD-08 | Registrar sugestão/transferência com conta permitida e tratar na fila | Mesmas regras e resultados; reabrir fila sem duplicar atualização |
| MOD-09 | Abrir progresso/históricos de Inventários com Admin e Conferente | Resumos carregam; ações administrativas respeitam o perfil |
| MOD-10 | Abrir/recolher menu e perfil; usar Voltar no Android e Escape no desktop | Camadas e navegação mantêm o comportamento anterior |
| MOD-11 | Alterar dados de perfil e sair/entrar com outra conta | Recursos comuns preservados; telas e dados não permanecem expostos após saída |
| MOD-12 | Reabrir PWA e interromper conexão | Avisos existentes mantidos, sem operação offline indevida; atualização sem erros de módulos |
| MOD-13 | Procurar DSIPS no menu | Nenhuma operação DSIPS disponível nesta sprint |

Repetir a navegação em desktop e celular. Usar dados de teste nos passos que gravam informações.
Registrar eventuais falhas com ID, perfil, dispositivo e mensagem observada.

## Validação automatizada e limites

A versão de base foi testada antes das alterações: 79 verificações passaram e seis falharam.
Duas falhas eram expectativas antigas de versão (1.13.9) e foram atualizadas.
Quatro suítes dependem de Rules/Functions da pasta externa `cm-app-v1.13.9-internal`,
ausente neste repositório; essas suítes continuam indisponíveis e não foram removidas ou ignoradas.

Após as alterações: **96 verificações aprovadas**, incluindo **16 novas verificações**
do catálogo, guarda de navegação, despacho, carregamento patrimonial e dependências do PWA.
As quatro suítes externas permanecem falhando por ausência dos arquivos de backend.
Isso não constitui aprovação de Rules/Functions nem homologação operacional.

Comando da suíte disponível sem os arquivos internos:

```sh
node --test tests/camera.test.mjs tests/escopo.test.mjs tests/estrutura.test.mjs tests/feedback.test.mjs tests/inventarios.test.mjs tests/modulos.test.mjs tests/movimentacao.test.mjs tests/paginacao.test.mjs tests/perfil.test.mjs tests/pwa.test.mjs tests/relacao.test.mjs tests/sprint-1.13.6.test.mjs
```

Suíte completa: `node --test tests/*.test.mjs`.

O ensaio visual automatizado com navegador local não pôde ser executado neste ambiente:
o processo Chromium é impedido de criar o socket necessário para iniciar.
Não houve login real nem leitura/gravação no Firebase durante os testes.
A revisão visual e os fluxos integrados dependem dos passos de homologação acima.

## Reversão

Reverter o commit da Sprint 1 em HML e aguardar a republicação do Pages.
Confirmar o retorno à versão anterior e aceitar a atualização do PWA quando oferecida.
Não há migração de banco ou backend para reverter.

## Critério de encerramento

Encerrar a sprint após MOD-01 a MOD-13 aprovados e as limitações de testes registradas.
Até lá, esta é uma entrega candidata para revisão e homologação.
