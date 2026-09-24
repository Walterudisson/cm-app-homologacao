# CM APP v1.13.9-H — Sugerir destino

## Escopo

- Conferente pode sugerir outra divisão para um patrimônio ainda não localizado.
- A sugestão não conta como leitura, não marca o item como localizado e não altera imediatamente sua divisão.
- Administrador ou Gestor analisa a solicitação na Fila de Aprovação de Movimentações.
- Na aprovação, o vínculo administrativo passa ao destino sugerido, mas o item continua pendente até uma conferência física.
- Na rejeição, a localização anterior é preservada.
- O histórico registra criação e resolução da sugestão, com responsáveis e datas.

## Publicação em HML

No Cloud Shell, dentro da pasta interna desta versão e com o projeto `cm-app-homologacao` selecionado:

```bash
gcloud config set project cm-app-homologacao
firebase deploy --only firestore:rules
```

Não é necessário publicar Functions ou Storage nesta sprint.

Depois do sucesso das regras, substitua no repositório de homologação o conteúdo público pelos arquivos do pacote `cm-app-homologacao-publico-v1.13.9-H.zip`, faça commit e aguarde o GitHub Pages concluir a publicação.

## Roteiro mínimo de homologação

1. Entre como Conferente e abra um item pendente de uma divisão atribuída.
2. Clique em **Sugerir destino**, escolha outra divisão e confirme.
3. Verifique que o item continua pendente e exibe **Destino sugerido**.
4. Confirme que nova leitura ou nova sugestão fica bloqueada enquanto a análise estiver pendente.
5. Entre como Gestor ou Administrador e abra a Fila de Aprovação.
6. Confira a identificação visual, origem, destino, responsável e justificativa.
7. Aprove uma sugestão: o item deve aparecer pendente na divisão de destino, sem contar como localizado.
8. Crie outra sugestão e rejeite: o item deve permanecer na divisão de origem.
9. Confirme os registros no histórico do patrimônio.
10. Faça uma transferência normal após leitura e confirme que ela permanece diferenciada da sugestão.

## Validação local

```bash
node --test ../cm-app-homologacao-v1.13.9/tests/*.test.mjs
```

Resultado esperado nesta entrega: **100 testes aprovados**.
