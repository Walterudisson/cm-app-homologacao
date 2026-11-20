# QA-03 · Homologação integrada
Base 1e1caaedf5cf72f548831b0a52c6d0c102255b71 (v1.13.36-H.1); candidata v1.13.37-H.1. HML somente.
## Achado estático e correção
A guarda de menu anterior apenas adicionava hidden. No logout sem reload, Patrimônio e seus botões podiam continuar ocultos após login de um perfil autorizado. Recalcular todos os itens/grupos nos dois sentidos a cada sessão, mantendo alias Materiais oculto e a guarda de rotas. Testes JSDOM percorrem matriz e sequência reversa (mesmo DOM), Central, navegação desktop/mobile e catálogo de rotas. Não atestam funcionamento real do login, backend ou browser.
## Roteiro manual
Usar somente contas e registros de teste HML já autorizados. Não modificar permissões de contas reais nem criar acessos V2; se indisponíveis, marcar BLOQUEADO. Registrar data, versão, perfil, dispositivo, resultado APROVADO/REPROVADO/BLOQUEADO e evidência sem dados pessoais. Não executar em PRD. Nas operações, anotar referência do dado de teste, confirmar saldo antes/depois e não repetir envio sem confirmação. Não apagar histórico.
| ID | Perfil/ambiente | Procedimento | Esperado |
|---|---|---|---|
| INT-01 | Chrome desktop e Android | Abrir HML, conferir login/rodapé/sidebar | v1.13.37-H.1 e tarja HML; sem erro de inicialização |
| INT-02 | PWA Android anterior | Aceitar atualização após salvar rascunhos | Aviso único por worker, reload e versão atual |
| INT-03 | Admin | Central, alternar Patrimônio/DSIPS/Gestão | Somente módulos previstos; breadcrumb correto |
| INT-04 | DSIPS restrito -> Admin | Logout e novo login na mesma aba sem reload | Patrimônio reaparece; nenhum dado da sessão anterior |
| INT-05 | Admin -> Conferente/usuário básico | Logout/login, tentar menu e voltar | Só rotas autorizadas; básico apenas perfil |
| INT-06 | Conferente Patrimônio | Painel, escolher divisão permitida, Relação e filtros | Mesmo escopo; sem dados não autorizados |
| INT-07 | Conferente Patrimônio | Leitura manual/câmera; conferência de bem de teste | Registro correto; sem ação administrativa |
| INT-08 | Admin/gestor Patrimônio | Fila e Inventários | Consulta correta; não duplicar listener |
| INT-09 | Admin/gestor DSIPS | Painel, KPIs acionáveis e filtros | Contagens e listas coerentes |
| INT-10 | Admin/gestor DSIPS | Cadastros: material, categoria e local de teste | Autocomplete, edição e feedback corretos |
| INT-11 | Admin/gestor DSIPS | Saldo inicial de material de teste e identificação | Quantidade e identificações consistentes |
| INT-12 | Admin/gestor DSIPS | Entrega de quantidade e unidade identificada | Estoque, cautela, posse e histórico coerentes |
| INT-13 | Admin/gestor DSIPS | Devolução parcial e integral em sequência | Status e saldos coerentes; histórico preservado |
| INT-14 | Conferente DSIPS | Consultar cautelas/posse; tentar operação e histórico | Somente consulta, sem gravar ou abrir auditoria |
| INT-15 | Admin/gestor Gestão | Usuários, Divisões, Funções conforme perfil | Sem privilégios adicionais; gestor não acessa Funções |
| INT-16 | SAN-01: piloto retirado | Abrir antigas URLs em HML | Interface experimental indisponível; nenhuma migração/criação de conta |
| INT-17 | Duas contas de teste, se autorizado | Alterar acesso de conta teste enquanto aberta e restaurar | Recarga/encerramento após confirmação remota; sem dados antigos |
| INT-18 | Android/desktop | Menu, botão Voltar, teclado, toast, tema disponível | Sem sobreposição, layout utilizável, sem perda indevida de navegação |
| INT-19 | PWA | Desconectar e reconectar sem operação em curso | Feedback offline, nova validação de acesso; sem promessa de uso offline |
| INT-20 | Admin | Reabrir listas e telas DSIPS, observar latência e filtros | Sem consultas redundantes visíveis, sem perda de filtros/contexto |
## Gates
CI obrigatório aprovado, nenhuma falha nova, QA-13–16 permanecem bloqueados por backend até autorização. Publicação Pages deve ser verificada. Homologação funcional somente após resultados manuais; nenhuma promoção PRD. GEST-01 permanece próxima após aceite QA-03.
