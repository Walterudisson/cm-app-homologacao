# CMAPP UX-05 | Estados de carregamento das telas

Versão HML: **v1.13.51-H.1**. Sprint exclusivamente visual/frontend; não altera Firestore, autenticação, Functions ou Rules.

## Diretriz de interface

- **Consulta inicial, tabela, cards:** skeleton que reproduz a estrutura da tela, sem dados fictícios.
- **Salvar/confirmar/registrar:** spinner discreto no próprio botão, preservando mensagens e bloqueios da operação. Evolução futura, sem alterar por enquanto os fluxos críticos.
- **Processos com etapas realmente mensuráveis:** barra de progresso apenas quando houver medição real. Evitar porcentagens inventadas.
- **Consultas rápidas:** abaixo de **160 ms**, não mostrar o skeleton para evitar piscadas.
- **Mais demoradas:** skeleton suave, mensagem textual independente e estado de ocupado acessível; quando a consulta terminar ou falhar, removê-lo imediatamente.
- **Acessibilidade:** animação desligada com `prefers-reduced-motion`, skeleton `aria-hidden`, região de dados `aria-busy`, texto com `role=status`.
- **Privacidade e segurança:** limpar em saída da tela, troca de usuário, falta de acesso e respostas obsoletas; não mostrar números antigos como se fossem os dados da consulta atual.

## Implementação da primeira tela: DSIPS > Cautelas

1. Novo controlador `js/ui/loading.js`, reutilizável e sem dependências externas.
2. Área com dois cards fantasma posicionada abaixo dos indicadores da tela Cautelas.
3. Indicador inicia com a consulta e só aparece após 160 ms; é cancelado quando a consulta termina, falha, a tela é abandonada ou é invalidada por outra consulta.
4. KPI total e pendentes exibem reticências durante a atualização, não `0` nem contagens antigas.
5. Não houve mudança nas chamadas a `listarCadastroDsips`, bloqueios de botões, validação, salvamento ou acesso.
6. CSS de identidade CMAPP, versão do cache PWA e testes para carregamentos rápidos/lentos, cancelamento e acessibilidade.

## Próximas telas candidatas (somente backlog)

| Prioridade | Tela | Comportamento proposto |
|---|---|---|
| Alta | DSIPS > Estoque | Skeleton em cards e grade de unidades durante consulta |
| Alta | DSIPS > Quem está com o quê | Skeleton de consulta e KPIs sem dados obsoletos |
| Alta | Gestão > Usuários e Pessoas e vínculos | Skeleton da listagem, preservando filtro, paginação e acesso |
| Média | Patrimônios > Painel e Fila | Skeleton dos indicadores e tabela, sem duplicar carregamentos |
| Média | Gabinete > Agenda | Skeleton de cards nas consultas institucionais futuras, conforme backend autorizado |
| Média | Central de Trabalho | Loading localizado por módulo, sem bloquear toda a plataforma |

## Homologação necessária

Abrir DSIPS > Cautelas com e sem cache, atualizar a consulta, alternar de tela enquanto carrega, testar Android/PWA e desktop, tema claro/escuro, leitor de tela e preferência de movimento reduzido. Confirmar que os cards somem ao carregar e ao ocorrer falha, sem travar ações de cautela ou devolução. Backend e PRD permanecem inalterados.
