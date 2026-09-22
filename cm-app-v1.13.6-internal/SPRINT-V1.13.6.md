# CM APP v1.13.6 — entrega para homologação

## Ordem de publicação

1. No Firebase do projeto `cm-app-homologacao`, substitua e publique as regras pelo arquivo `firestore.rules` desta entrega.
2. No repositório GitHub Pages de homologação, substitua os arquivos públicos pelo conteúdo do pacote `cm-app-homologacao-publico-v1.13.6-H.zip`.
3. No PWA, aceite **ATUALIZAR AGORA** quando o aviso for exibido. Confirme `v1.13.6-H` no rodapé.

## Escopo

- Ícone para mostrar e ocultar todos os campos de senha.
- Ribbon `ENCERRADO` nos cards cujo ciclo da divisão esteja encerrado.
- Edição do próprio nome e da senha na tela `Meu perfil`.
- O próprio usuário deixa de aparecer na tela `Gestão de usuários`.
- Correção responsiva para nomes longos nos cards de inventário.
- Identificador técnico seguro para divisões que contêm `/`, mantendo o nome institucional exibido e gravado nos históricos.

## Roteiro de homologação

1. Testar o ícone de senha no login, cadastro de usuário e alteração de senha.
2. Entrar com Administrador, Gestor e Conferente; confirmar que cada um edita o próprio nome em `Meu perfil`.
3. Com Administrador e Gestor, confirmar que a própria conta não aparece em `Gestão de usuários`.
4. Conferir os cards em tela móvel, inclusive com nome longo e percentual, sem conteúdo fora da borda.
5. Encerrar uma divisão controlada e confirmar o ribbon `ENCERRADO`, o bloqueio de novas conferências e a consulta ao histórico.
6. Validar em HML uma divisão de teste cujo nome contenha `/`: consultar progresso, encerrar, consultar histórico, reabrir com justificativa e encerrar novamente.

## Verificação técnica

- 81 testes locais aprovados.
- Sintaxe do módulo principal verificada.
- Cache do PWA alterado para `v1.13.6-homologacao`.

## Observação de compatibilidade

Divisões sem `/` mantêm o mesmo identificador usado na v1.13.5. Para divisões com `/`, o aplicativo cria um ID técnico escapado no documento de inventário e mantém o nome original no campo `divisao`. As regras usam a mesma transformação para controlar leituras e gravações.
