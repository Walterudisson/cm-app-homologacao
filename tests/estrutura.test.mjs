import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const [html, css, app, controlador, navegacao, feedback, firebase, perfilService, pwa] = await Promise.all([
  readFile(new URL('index.html', raiz), 'utf8'),
  readFile(new URL('app.css', raiz), 'utf8'),
  readFile(new URL('app.js', raiz), 'utf8'),
  readFile(new URL('js/controllers/camera.controller.js', raiz), 'utf8'),
  readFile(new URL('js/ui/navigation.js', raiz), 'utf8'),
  readFile(new URL('js/ui/feedback.js', raiz), 'utf8'),
  readFile(new URL('js/config/firebase.js', raiz), 'utf8'),
  readFile(new URL('js/services/perfil.service.js', raiz), 'utf8'),
  readFile(new URL('js/pwa.js', raiz), 'utf8')
]);

function idsDoHtml(conteudo) {
  return new Set([...conteudo.matchAll(/\bid=["']([^"']+)["']/g)].map(resultado => resultado[1]));
}

function idsConsultados(conteudo) {
  const padroes = [
    /getElementById\(["']([^"']+)["']\)/g,
    /porId\(["']([^"']+)["']\)/g
  ];
  return padroes.flatMap(padrao => [...conteudo.matchAll(padrao)].map(resultado => resultado[1]));
}

test('todos os IDs estáticos consultados existem no HTML', () => {
  const ids = idsDoHtml(html);
  const ausentes = [...new Set([
    ...idsConsultados(app),
    ...idsConsultados(controlador),
    ...idsConsultados(navegacao),
    ...idsConsultados(feedback),
    ...idsConsultados(perfilService),
    ...idsConsultados(pwa)
  ])]
    .filter(id => !id.includes('${'))
    .filter(id => !ids.has(id));
  assert.deepEqual(ausentes, []);
});

test('o resultado fica antes do formulário no fluxo da tela', () => {
  assert.ok(html.indexOf('id="leitura-resultado"') < html.indexOf('id="scanner-form-card"'));
});

test('a orquestração da câmera reside no controlador dedicado', () => {
  assert.match(app, /criarControladorCamera/);
  assert.doesNotMatch(app, /new Html5Qrcode/);
  assert.match(controlador, /TEMPO_AJUDA_LEITURA_MS/);
});

test('a forma de localização chega ao salvamento e aparece nos dois históricos', () => {
  assert.match(controlador, /aoReconhecerPlaqueta\(codigo, 'codigo'\)/);
  assert.match(controlador, /aoReconhecerPlaqueta\(numeroReconhecido, 'ocr'\)/);
  assert.match(app, /metodoLocalizacao: metodoLocalizacaoSelecionado/);
  assert.equal((app.match(/detalheMetodoHistorico\(h\)/g) || []).length, 2);
  assert.match(app, /metodoLocalizacaoSelecionado = 'digitacao';\s*const valor = limparPlaqueta/);
});

test('o preview usa recorte e não desenha número ou moldura sobre a imagem', () => {
  assert.match(controlador, /calcularRecortePreview/);
  assert.doesNotMatch(controlador, /fillText|strokeRect/);
});

test('o aviso pausado duplicado é ocultado quando o resultado está visível', () => {
  assert.match(controlador, /camera-status-result/);
});

test('a interface identifica a versão v1.13.8-H', () => {
  assert.match(html, /v1\.13\.8-H • HOMOLOGAÇÃO/);
});

test('Gestão separa usuários e inventários em telas próprias', () => {
  ['tab-btn-usuarios', 'tab-btn-inventarios', 'sec-usuarios', 'sec-inventarios', 'panel-gestao-ciclo']
    .forEach(id => assert.match(html, new RegExp(`id=["']${id}["']`)));

  const inicioUsuarios = html.indexOf('id="sec-usuarios"');
  const inicioInventarios = html.indexOf('id="sec-inventarios"');
  const painelCiclo = html.indexOf('id="panel-gestao-ciclo"');
  assert.ok(inicioUsuarios >= 0 && inicioUsuarios < inicioInventarios);
  assert.ok(inicioInventarios < painelCiclo);
  assert.match(navegacao, /inventarios: \{ titulo: 'Inventários'/);
  assert.match(app, /abaAtiva === 'inventarios'/);
});

test('Conferente acessa progresso dos inventários sem ações de reinício', () => {
  assert.match(html, /id="tab-btn-inventarios"[^>]*data-nav-page="inventarios"/);
  assert.match(html, /id="lista-progresso-inventarios"/);
  assert.match(app, /btnInventarios\.classList\.remove\('hidden'\)/);
  assert.match(app, /if \(panelCiclo\) panelCiclo\.classList\.add\('hidden'\)/);
  assert.doesNotMatch(app, /abaAtiva === 'usuarios' \|\| abaAtiva === 'inventarios'/);
});

test('o shell contém sidebar, breadcrumb, perfil e feedback acessível', () => {
  ['app-sidebar', 'btn-menu', 'breadcrumb-current', 'btn-profile-menu', 'toast-container', 'modal-confirmacao']
    .forEach(id => assert.match(html, new RegExp(`id=["']${id}["']`)));
});

test('as três pesquisas possuem ação explícita para limpar', () => {
  ['btn-limpar-plaqueta', 'btn-limpar-busca-usuarios', 'btn-limpar-filtro-relacao']
    .forEach(id => assert.match(html, new RegExp(`id=["']${id}["']`)));
});

test('mensagens e confirmações não dependem das caixas nativas do navegador', () => {
  assert.doesNotMatch(app, /\balert\s*\(/);
  assert.doesNotMatch(app, /\bconfirm\s*\(/);
  assert.match(app, /notificarMensagem/);
  assert.match(app, /confirmarAcao/);
});

test('a fila é agrupada por divisão em elementos details', () => {
  assert.match(app, /<details class="transfer-group"/);
  assert.match(app, /localeCompare\(divisaoB, 'pt-BR'\)/);
});

test('o painel de métricas locais do Firebase foi removido', () => {
  assert.doesNotMatch(html, /Métricas do Firebase|firebase-metrics/i);
  assert.doesNotMatch(app, /firestore-metrics|registrarLeituras|obterMetricasFirestore/);
});

test('a revisão usa textos compactos de entrada e saída', () => {
  assert.match(html, />\s*🔐 ENTRAR\s*</);
  assert.match(html, /id="btn-logout"[^>]*>SAIR</);
  assert.doesNotMatch(html, /Entrar no Sistema|Sair do CM APP/);
});

test('o resumo redundante do perfil foi removido do Painel', () => {
  assert.doesNotMatch(html, /profile-summary-card|dash-nome|dash-perfil|dash-divisoes/);
});

test('o estado de patrimônio não encontrado é persistente e orienta correção', () => {
  ['patrimonio-nao-encontrado', 'patrimonio-nao-encontrado-codigo', 'btn-corrigir-plaqueta']
    .forEach(id => assert.match(html, new RegExp(`id=["']${id}["']`)));
  assert.match(app, /exibirPatrimonioNaoEncontrado/);
});

test('o botão voltar fecha camadas e percorre as telas do app', () => {
  assert.match(app, /pushState/);
  assert.match(app, /popstate/);
  assert.match(app, /fecharCamadaSobreposta/);
});

test('toasts ficam abaixo do header e a sidebar expande por hover', () => {
  assert.match(css, /\.toast-container[\s\S]*?top:\s*calc\(var\(--topbar-height\)/);
  assert.match(css, /app-sidebar:is\(:hover, :focus-within\)/);
});

test('os resultados observados nos testes manuais usam tipos explícitos', () => {
  assert.match(app, /Novo ciclo de \$\{divisao\} iniciado: \$\{quantidade\} itens retornaram a pendente/);
  assert.match(app, /if \(mensagem\) notificarMensagem\(mensagem, 'sucesso'\)/);
  assert.match(app, /Item retornado para pendente com sucesso\.", 'sucesso'/);
  assert.match(app, /Este e-mail já está cadastrado no sistema\."/);
  assert.match(app, /tipo = 'aviso'/);
  assert.match(app, /ehTransferencia \? 'aviso' : 'sucesso'/);
});

test('a tela de perfil reúne foto, abrangência e alteração de senha', () => {
  ['sec-perfil', 'profile-avatar', 'input-foto-perfil', 'perfil-divisoes', 'form-alterar-senha']
    .forEach(id => assert.match(html, new RegExp(`id=["']${id}["']`)));
  assert.match(navegacao, /perfil: \{ titulo: 'Meu perfil'/);
  assert.match(app, /reauthenticateWithCredential/);
  assert.match(app, /updatePassword/);
});

test('a foto usa Storage em caminho individual e mantém fallback por iniciais', () => {
  assert.match(firebase, /getStorage/);
  assert.match(perfilService, /usuarios\/\$\{uid\}\/perfil\/avatar/);
  assert.match(perfilService, /FOTO_PERFIL_DIMENSAO/);
  assert.match(navegacao, /atualizarFotoUsuario/);
});

test('somente a interface administrativa oferece redefinição de senha', () => {
  assert.match(app, /usuarioLogado\.perfil === 'admin'/);
  assert.match(app, /sendPasswordResetEmail/);
  assert.match(app, /Apenas Administradores podem enviar redefinições de senha/);
});

test('a troca de senha preserva o formulário antes das operações assíncronas', () => {
  const capturaFormulario = app.indexOf('const formulario = evento.currentTarget;');
  const reautenticacao = app.indexOf('await reauthenticateWithCredential');
  assert.ok(capturaFormulario >= 0 && capturaFormulario < reautenticacao);
  assert.match(app, /formulario\.reset\(\)/);
  assert.doesNotMatch(app, /evento\.currentTarget\.reset\(\)/);
});
