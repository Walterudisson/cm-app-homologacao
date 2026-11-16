# Prévia navegável CMAPP v2

Avaliação de interface e fluxos, exclusivamente com dados fictícios. Esta pasta é autocontida e pode
ser publicada isoladamente em HML sem integrar o PR de implementação operacional.

Entradas: index.html (roteiro), gestao/ e dsips/. Os perfis de demonstração ficam no seletor superior.
Dados são armazenados em cmapp.previa.v2.dados neste navegador; Restaurar demonstração reinicia a base.
A preferência de tema também tem chave própria. Não insira informações reais.

Os controladores em assets/ são cópias das fontes compartilhadas do código em desenvolvimento,
geradas por scripts/preparar-previa-homologacao-v2.mjs. modelo.js é apenas uma simulação de serviços,
sem equivalência com transações, Authentication, Rules, índices ou garantia de segurança no servidor.
A validação operacional usa o backend e o Firestore Emulator do PR #7; não é substituída pela prévia.
Não há Firebase SDK, credenciais, serviços reais ou requisições de API. CSP proíbe connect-src.

Esta publicação não altera a navegação principal, versão, usuários, estoque ou deploy de Functions/Rules.
Serve para avaliar organização, nomes, cliques, perfis e temas. Pendências para homologação operacional:
operações patrimoniais v2; reconciliação de contas, migração/backup/reversão; publicação controlada dos
serviços/índices, contas de teste e validação Android/desktop e cache/PWA.
