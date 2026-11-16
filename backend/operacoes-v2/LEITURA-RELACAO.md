# Leitura e relação patrimonial v2 — continuação preparada

Sem publicação, migração ou alteração da prévia pública.

## Câmera e OCR

A rota patrimonios-v2/ reutiliza js/controllers/camera.controller.js, o controlador já usado pelo CMAPP.
Mantém as versões existentes de Html5-Qrcode 2.3.8 e Tesseract 5.1.0. Câmera é ligada somente por ação
do usuário; digitação continua disponível. Zoom/lanterna/foco dependem das capacidades do dispositivo.
O código de barras/OCR consulta o bem, mas não salva conferência automaticamente. O usuário confirma
localização e observação. O método original é enviado como codigo_barras, ocr ou digitacao.

O controlador compartilhado agora acompanha geração e contexto da leitura. Desligar/trocar contexto
invalida callbacks de câmera/OCR pendentes. Não reapresenta captura antiga depois de sair ou trocar de
sessão; uma inicialização que termina atrasada é interrompida. A câmera é desligada ao sair da leitura,
encerrar a sessão ou ocultar a página; a retomada segue o comportamento anterior do leitor.

As imagens ficam no canvas e no processamento do motor; esta integração não envia imagens ao backend
CMAPP nem cria anexos. O motor pode carregar seus recursos de OCR pela rede, como já ocorre no legado.
Os testes simulam scanner/vídeo/canvas/Tesseract e não validam foco, desempenho OCR ou permissões físicas
em Android/iOS. A validação em aparelhos e com rede real permanece obrigatória antes de ativar.

## Filtros, indicadores e CSV

cmappPatrimoniosListar aceita busca (até 120 caracteres), situacao e exportar. Busca compara plaqueta,
descrição, marca/modelo e localização/origem, sem diferenciar acentos ou maiúsculas. Situações:
- localizados: localizado=true, sem transferência pendente;
- nao_localizados: não localizado, sem transferência pendente;
- aguardando: transferência pendente;
- todos: sem esse filtro.

Sugestão de destino pendente continua como não localizado, preservando o comportamento homologado.
A fila continua abrangendo transferências e sugestões. Filtros são aplicados na página autorizada no
servidor; uma página vazia pode ter cursor. Carregar mais percorre as páginas seguintes, sem alargar
abrangência. Os indicadores da tela descrevem registros carregados, não contagens globais do inventário.

Exportar seleção percorre todas as páginas da divisão/busca/situação, com exportar=true em cada chamada.
O servidor exige a ação exportar na abrangência consultada, além da validação do índice/localização.
O cliente limita a 200 páginas/10.000 registros; excesso, erro ou troca de sessão cancela a geração sem
arquivo parcial. CSV usa UTF-8/BOM, delimitador ponto e vírgula, aspas escapadas e proteção contra fórmulas.
Inclui plaqueta, descrição, localização/origem, situação da conferência/transferência e observação.

A relação corrente pode mudar enquanto as páginas são consultadas. Para fotografia imutável e totais
de encerramento, usar o fechamento de inventário. A exportação corrente não substitui a fotografia.
A ação exportar controla o serviço e a UI; não impede cópia externa de dados legitimamente consultáveis.

## Status

227 testes locais e 74 cenários no Firestore Emulator aprovados: barras, OCR atrasado, inicialização
pendente, método de leitura, CSV/filtros/paginação, cancelamento e permissão de exportação por divisão.
Não equivalem à homologação visual ou de hardware. Permanecem indicadores globais, ordenações/filtros
avançados e relatórios oficiais do legado, reconciliação de contas/Auth, migração integral com backup e
reversão, revisão de cache/PWA e homologação com contas/dispositivos reais.

Mutações patrimoniais também exigem as duas marcas de preparação/transição antes de qualquer recibo
ou gravação. Isso impede uso antecipado dos escritores v2 em paralelo com escritas patrimoniais legadas.
