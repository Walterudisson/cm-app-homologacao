# Roadmap do CM APP após a v1.13.6

## Sequência acordada

1. Desativação reversível de usuários.
2. Detalhamento do usuário na gestão.
3. Backend confiável para operações administrativas.
4. Tutorial guiado v1 para Conferentes e início da fase Beta.
5. Cadastro e manutenção de divisões, incluindo responsáveis.
6. Notificações push.
7. Relatórios de inventário.
8. Mapa Carga da Divisão.
9. Ocorrências de patrimônio não cadastrado.
10. Observabilidade.
11. Escala, retenção e histórico.
12. Refatoração final na Sprint 2.0 e preparação da Release Candidate.

## Organização sugerida em versões

### Bloco A — identidade e acesso

- Desativação reversível, detalhamento dos usuários e backend confiável devem ser tratados no mesmo ciclo arquitetural.
- A desativação precisa bloquear o Firebase Authentication e preservar a identidade já citada em históricos.
- A criação e a administração de usuários devem sair do navegador e passar pelo backend confiável.

### Bloco B — Beta orientado ao Conferente

- Publicar o tutorial v1 após estabilizar identidade e acesso.
- Concentrar o primeiro tutorial em login, seleção de divisão, leitura, digitação manual, resultado e envio de transferência para aprovação.
- Usar o período Beta para recolher feedback de operação real antes de ampliar o tutorial aos fluxos administrativos.

### Bloco C — administração institucional

- O cadastro de divisões deve incluir responsáveis, situação ativa, auditoria e tratamento dos vínculos existentes.
- Os responsáveis cadastrados passam a alimentar destinatários de notificações, cabeçalhos, relatórios e documentos oficiais.
- As notificações push dependem do backend confiável, consentimento e cadastro de dispositivos.
- Ocorrências de patrimônio não cadastrado passam a notificar os responsáveis definidos para a divisão.

### Bloco D — documentos e maturidade

- Relatórios e Mapa Carga compartilham cabeçalho institucional, responsáveis, período, totalizadores e regras de retenção.
- Observabilidade e validação de escala devem preceder o congelamento da Release Candidate.
- A Sprint 2.0 consolida a refatoração e prepara a RC após o fechamento dos ajustes observados no Beta.

## Ajuste de dependência

O backend confiável deve começar junto da desativação reversível. Excluir apenas o documento em `usuarios` não desativa a credencial no Firebase Authentication. As operações de bloquear, reativar, criar e administrar contas precisam usar privilégios de servidor e registrar auditoria.
