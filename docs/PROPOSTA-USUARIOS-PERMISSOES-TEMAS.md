# Proposta navegável — Usuários, permissões e temas

Data: 16/11/2026. **Proposta visual aprovada pelo usuário em 16/11/2026.**
Proposta isolada: propostas/gestao-acessos/index.html.
Não importa o aplicativo, Firebase ou a autenticação; todos os dados são fictícios.
Não substitui as telas publicadas e não altera autorização, regras ou banco de dados.

## Referências e experiência

AppDashboard-pro fornecido pelo usuário: users.html (listagem), users-view.html e users-edit.html
(detalhamento), roles.html (matriz). A proposta usa implementação independente, sem copiar o pacote
de bibliotecas do template. Mantém azul, superfícies arredondadas e identidade visual CMAPP.

Lista com pesquisa e filtro de situação; detalhes nas abas Dados/Acessos/Histórico; exemplos de
Administrador da TI, Conferente de Patrimônios e Operador DSIPS. Dados e concessões podem ser simulados
somente na memória da página. Recarregar restaura os exemplos. A preferência de tema usa uma chave
local exclusiva da proposta; não altera a preferência do aplicativo atual.

Matriz por módulo, funcionalidade e papel. Distingue CRUD de ações de negócio, nega apagar histórico
e mostra abrangência e delegação separadas. Papéis são padronizados; não há editor livre. A concessão
simulada inclui somente papéis operacionais, não designação de gestores ou administradores.
A sessão demonstrativa representa um Superadmin; não simula autorização real do backend.

## Temas

Dois temas visuais: Claro e Escuro. Seleção Automático acompanha o dispositivo e é o padrão. Preferência explícita prevalece sobre o dispositivo.
Modo Automático acompanha mudanças de preferência do dispositivo. Aplicação inicial no head reduz a troca
visível de cores ao abrir a página. Armazenamento bloqueado não impede a proposta de funcionar.
Tokens semânticos de fundo, superfície, texto, borda, ação e status; inputs e seletores acompanham
color-scheme. Status têm texto além da cor. Layout prevê celular, tablet e desktop, abas operáveis por
teclado e estados de foco.

Dez verificações automatizadas da proposta: tema, armazenamento indisponível, busca/filtro, separação
entre administração e operação, matriz, concessão/revogação demonstrativa, desativação, texto seguro,
ausência de conexão ao backend e contraste dos pares principais. Não equivale a auditoria completa de
acessibilidade ou validação visual em dispositivo real.

## Adoção no aplicativo atual — etapa posterior

app.css já possui tokens parciais, mas títulos, gradientes, formulários e utilitários de cor fixa ainda
precisam de revisão. Não aplicar filtro CSS de inversão de cores nem importar todo o CSS do template.

1. Consolidar tokens e preferência de tema compartilhados, com chave própria da plataforma.
2. Revisar shell, autenticação, navegação, diálogos, listas, formulários e notificações.
3. Revisar telas Patrimônios, DSIPS/PDV e gráficos nos dois temas.
4. Migrar as telas de gestão junto com a nova política de acessos, Functions, Rules e plano de migração.
5. Validar navegação, leitura, contraste e legibilidade em celular e desktop em HML antes de PRD.

A proposta não implementa a nova matriz como segurança, não migra perfis legados e não avança os
módulos futuros. Publicação eventual em HML ocorre apenas no caminho isolado de propostas; PRD intacto.

## Aprovação e limite da aprovação

Aprovadas a composição de Usuários (Dados/Acessos/Histórico), a matriz por funcionalidade e papel
e a aparência Claro/Escuro com seleção Automático. A aprovação visual não equivale à migração dos
usuários nem à aprovação de permissões efetivas ainda não implementadas.
A interface demonstrativa continuará separada até a entrega funcional correspondente.
Plano de implementação: PLANO-GESTAO-ACESSOS.md.
