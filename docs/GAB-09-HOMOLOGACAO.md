# GAB-09 | Qualidade integrada do Gabinete, acessibilidade e PWA

**Candidata HML:** `v1.13.43-H.1` (21/11/2026)  
**Escopo:** frontend HML. **Não publicar em PRD antes de homologação.**

## Melhorias entregues na candidata

1. **Isolamento entre sessões:** referências de divisões reais retornadas pelo serviço existente não permanecem na memória ao trocar de usuário ou sair. Com referências reais disponíveis, o seletor apresenta somente divisões reais; divisões fictícias continuam válidas apenas no catálogo de prévia e para vínculos já criados na sessão.
2. **Fichas coerentes:** quando o nome de um órgão muda, a ficha aberta na Agenda reflete imediatamente a nova informação. Ao arquivar/remover um contato, sua ficha fecha, o favorito inativo deixa de contar e o conteúdo é limpo se o acesso for revogado.
3. **Acessibilidade das abas:** padrão de abas com foco controlado, `aria-selected`, `tabindex` e atalhos **←, →, Home, End**; foco visível para teclado.
4. **Formulários:** vínculo obrigatório com divisão ou órgão tem erro explícito junto ao seletor, foco no campo inválido e associação `aria-describedby`. Ao fechar/cancelar, erros e ações pendentes são limpos. O CRUD de órgãos também informa e foca o campo inválido.
5. **UX mobile-first:** campos de formulário empilham em telas estreitas, botões de pelo menos 44px, margens/rolagem de diálogos adequadas a viewport variável e teclado virtual, área segura no rodapé.
6. **Integridade de navegação:** uma resposta assíncrona do catálogo de divisões não redesenha o Gabinete se o usuário já mudou de tela/conta; item de menu de administração do Gabinete marcado como visível apenas ao perfil demonstrativo admin.
7. **Desempenho demonstrativo:** contagem de contatos vinculados aos órgãos feita em uma única passagem, antes da montagem dos cards, mantendo a verificação no momento do arquivamento.
8. **PWA:** incremento de `v1.13.42-H.1` para `v1.13.43-H.1`, novo identificador de cache, com lista de assets preservada; sem limpeza de IndexedDB/cookies e sem alteração de dados em backend.

## Verificação automatizada/simulada realizada no código

- **21 testes de modelo, 131 asserções**, todos aprovados por execução JavaScript isolada no ambiente de análise. Inclui testes anteriores GAB-07/GAB-07.1 e novos GAB-09.
- **11 interações de interface simuladas** por DOM de teste, todas aprovadas. Abrangem rolagem lógica de abas, mensagens/foco, atualização de ficha e revogação visual.
- Arquivos `tests/gabinete-gab09-regressao.test.mjs` e `tests/gabinete-gab09-ui.test.mjs` incluídos no repositório como suites Node; o segundo utiliza jsdom.
- **Não foi executado navegador autenticado real** nem execução Node/jsdom dos testes no CI; essas atividades permanecem na homologação. As verificações simuladas não certificam Rules/Functions reais.

## Roteiro de homologação manual (Android, desktop e PWA)

| ID | Cenário | Critério de aceite |
|---|---|---|
| GAB-09-01 | Entrar no HML | Versão `v1.13.43-H.1` |
| 02 | Login de usuário com módulos | Abre diretamente na Central de Trabalho sem exibir rapidamente Patrimônios |
| 03 | Central > Gabinete | Painel, Agenda e Ramais com layout coerente |
| 04 | Agenda, nome/sigla/ramal | Busca sem diferenciação de maiúsculas/acentos |
| 05 | Filtrar Pessoa, Ramal, Externo | Só aparecem tipos pertinentes |
| 06 | Ficha de contato | Avatar, dados institucionais, botões corretos |
| 07 | Foto do próprio perfil | Card e ficha exibem foto ao voltar à Agenda |
| 08 | Pessoa fictícia sem foto | Avatar com iniciais; não carrega foto de outra conta |
| 09 | Editar órgão que possui contato | Nome atualizado no contato e na ficha |
| 10 | Arquivar órgão sem vínculos | Desaparece da Agenda, fecha ficha e pode ser restaurado |
| 11 | Arquivar órgão com vínculos ativos | Operação recusada e mensagem clara |
| 12 | Favoritar órgão fictício e depois arquivá-lo | Não permanece como favorito ativo |
| 13 | Administrador abre Cadastros e revisão | Duas abas, Pessoas e ramais / Órgãos externos |
| 14 | Usuário não-admin abre navegação | Item administrativo oculto e rota protegida pelo cliente |
| 15 | Focar aba e usar setas ←/→ | Aba e painel mudam, foco acompanha |
| 16 | Focar aba e usar Home/End | Salta à primeira/última aba |
| 17 | Novo ramal sem divisão | Erro visível, foco no seletor correto |
| 18 | Contato externo sem órgão | Erro visível, foco no seletor correto |
| 19 | Órgão com telefone/e-mail inválido | Erro junto ao campo, sem gravação |
| 20 | Cancelar formulário com erro | Erro e campos inválidos são limpos |
| 21 | Abrir outro formulário após cancelar | Sem dados pendentes do formulário anterior |
| 22 | Criar ramal com número `0001` | Preserva zeros à esquerda |
| 23 | Listar divisões reais acessíveis no cadastro | Seleção sem duplicar divisão; não misturar opções de exemplo quando há referências reais |
| 24 | Simular falha de consulta de divisões | Somente opções fictícias sinalizadas, sem bloquear navegação |
| 25 | Mudar de conta | Dados digitados, catálogo real e foto antiga não são herdados |
| 26 | Revogação de acesso durante sessão | Navegação, Agenda e fichas deixam de estar disponíveis no frontend |
| 27 | Voltar Android com ficha aberta | Fecha ficha, sem retornar indevidamente à tela anterior |
| 28 | Voltar Android com formulário aberto | Fecha diálogo conforme comportamento nativo, sem perder a tela de cadastros |
| 29 | Teclado virtual e campo final do modal | Formulário permanece acessível, botões alcançáveis, sem sobreposição |
| 30 | PWA Android após atualização | Cache `v1.13.43-h.1-gab09`, sem tela branca |
| 31 | Alternar claro/escuro/automático | Contraste e foco visíveis |
| 32 | DSIPS: cadastrar/consultar cautela | Fluxo e responsáveis existentes não sofrem regressão |
| 33 | Patrimônios: Painel e consulta | Fluxos existentes continuam funcionando |
| 34 | Gestão: usuários/divisões e acessos | CRUD legado íntegro |
| 35 | Logout e refresh | CRUD demonstrativo volta aos dados sintéticos originais |

## Restrições e decisões mantidas

- **GAB-08 (PDF/vCard) adiada para backlog futuro**, não faz parte da GAB-09.
- Diretório de usuários reais de terceiros e respectivas fotos ainda requerem **fonte de leitura autorizada pelo backend**.
- Novas permissões, Rules, Cloud Functions, migração, vínculos DSIPS reais, importação e persistência **continuam fora do escopo** sem autorização específica.
- Dados reais não devem ser digitados nos formulários de homologação nem incluídos em arquivos públicos.
- HML com código integrado **não é homologação funcional**. Após testes reais e aceite explícito, avaliar promoção PRD em procedimento separado.

## Próxima frente

Após a homologação desta sprint: **Gestão**, começando pelo CRUD de usuários e divisões, simplificação de permissões e contrato do cadastro institucional único para Gabinete, DSIPS e RH, respeitando o gate de backend.
