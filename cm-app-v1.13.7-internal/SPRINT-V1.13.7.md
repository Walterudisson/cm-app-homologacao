# CM APP v1.13.7-H — publicação em homologação

Projeto exclusivo: `cm-app-homologacao`.

## Pré-requisito

O projeto precisa estar no plano Blaze para publicar Cloud Functions. Configure orçamento e alertas antes da implantação.

## Ordem de publicação

1. Abra o Cloud Shell com o projeto `cm-app-homologacao` selecionado.
2. Envie e extraia este pacote interno.
3. Entre na pasta extraída e execute `npm --prefix functions install`.
4. Execute `firebase deploy --only firestore:rules,functions`.
5. Somente após a conclusão, publique o pacote público v1.13.7-H no repositório GitHub Pages de HML.
6. No PWA, aceite **ATUALIZAR AGORA** e confirme `v1.13.7-H` no rodapé.

## Testes mínimos

- Administrador cadastra Gestor e Conferente.
- Gestor visualiza, mas não recebe botões administrativos.
- Desativação bloqueia novo login e revoga uma sessão já aberta.
- Usuário inativo permanece na aba Inativos e conserva seu histórico.
- Reativação mantém o mesmo UID, perfil e divisões.
- Administrador não consegue administrar a própria conta nessa tela.
- Pesquisa, filtros, paginação e layout mobile funcionam.

Não publique este pacote interno no GitHub Pages.
