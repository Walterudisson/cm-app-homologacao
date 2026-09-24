# CM APP v1.13.8-H — publicação em homologação

Projeto exclusivo: `cm-app-homologacao`.

## Ordem de publicação

1. Abra o Cloud Shell com o projeto `cm-app-homologacao` selecionado.
2. Envie e extraia este pacote interno.
3. Entre na pasta extraída.
4. Execute `firebase deploy --only firestore:rules --project cm-app-homologacao`.
5. Cloud Functions e Storage permanecem inalterados; não é necessário publicá-los novamente.
6. Somente após a conclusão, publique o pacote público v1.13.8-H no repositório GitHub Pages de HML.
7. No PWA, aceite **ATUALIZAR AGORA** e confirme `v1.13.8-H` no rodapé.

## Testes mínimos

- Primeiro acesso de Conferente inicia o tutorial automaticamente.
- Pular conserva a etapa e Meu perfil oferece CONTINUAR TUTORIAL.
- Concluir registra o estado e Meu perfil oferece REVER TUTORIAL.
- Nenhuma conferência ou transferência é gravada durante o guia.
- Cards Total, Ativos, Inativos e Conferentes filtram a tabela.
- Abas e seletor de perfil mantêm o destaque dos cards sincronizado.
- Desktop e mobile mantêm navegação, leitura e responsividade.

Não publique este pacote interno no GitHub Pages.
