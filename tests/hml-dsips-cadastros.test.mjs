import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  TIPOS_CADASTRO_DSIPS, podeConsultarCadastrosDsips, podeGerenciarCadastrosDsips,
  filtrarCadastrosDsips, prepararCadastroDsips
} from '../js/modules/dsips/cadastros-model.js';
const ler = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('somente usuários com DSIPS consultam; apenas Admin/Gestor DSIPS escrevem', () => {
  assert.equal(podeConsultarCadastrosDsips({perfil:'admin',ativo:true}),true);
  assert.equal(podeConsultarCadastrosDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeGerenciarCadastrosDsips({perfil:'admin',ativo:true}),true);
  assert.equal(podeGerenciarCadastrosDsips({perfil:'gestor',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeGerenciarCadastrosDsips({perfil:'gestor',ativo:true,modulos:['patrimonios']}),false);
  assert.equal(podeGerenciarCadastrosDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeGerenciarCadastrosDsips({perfil:'usuario',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeGerenciarCadastrosDsips({perfil:'admin',ativo:false}),false);
  assert.equal(podeGerenciarCadastrosDsips({perfil:'admin',ativo:true,autorizacaoVersao:2}),false);
});
test('categorias e locais são gravados pela função de cadastro já existente', () => {
  assert.deepEqual(Object.keys(TIPOS_CADASTRO_DSIPS),['categoria','local']);
  assert.equal(TIPOS_CADASTRO_DSIPS.categoria.colecao,'categorias');
  assert.equal(TIPOS_CADASTRO_DSIPS.local.colecao,'locais');
  assert.deepEqual(prepararCadastroDsips({nome:'  Armamento  ',ativo:true},{tipo:'categoria',id:'cat-1'}),
    {tipo:'categoria',id:'cat-1',dados:{nome:'Armamento',ativo:true}});
  assert.deepEqual(prepararCadastroDsips({nome:'  Almoxarifado  ',ativo:false},{tipo:'local',id:'local-1'}),
    {tipo:'local',id:'local-1',dados:{nome:'Almoxarifado',ativo:false}});
});
test('validação impede tipo, nome e duplicidade, sem afetar edição do próprio cadastro', () => {
  const existentes=[{id:'a',nome:'Comunicação',ativo:true},{id:'b',nome:'Armamento',ativo:false}];
  assert.throws(()=>prepararCadastroDsips({nome:'X',ativo:true},{tipo:'responsavel',id:'x'}));
  assert.throws(()=>prepararCadastroDsips({nome:'',ativo:true},{tipo:'categoria',id:'x'}));
  assert.throws(()=>prepararCadastroDsips({nome:'a'.repeat(121),ativo:true},{tipo:'categoria',id:'x'}));
  assert.throws(()=>prepararCadastroDsips({nome:'COMUNICACAO',ativo:true},{tipo:'categoria',id:'x',existentes}));
  assert.throws(()=>prepararCadastroDsips({nome:' armamento ',ativo:true},{tipo:'categoria',id:'x',existentes}));
  assert.deepEqual(prepararCadastroDsips({nome:'Comunicação',ativo:false},{tipo:'categoria',id:'a',existentes}).dados,
    {nome:'Comunicação',ativo:false});
});
test('pesquisa por nome ignora maiúsculas e acentos e não altera os registros originais', () => {
  const registros=[{id:'2',nome:'Depósito auxiliar'},{id:'1',nome:'Área central'}];
  assert.deepEqual(filtrarCadastrosDsips(registros,'DEPOSITO').map(x=>x.id),['2']);
  assert.deepEqual(filtrarCadastrosDsips(registros,'AREA').map(x=>x.id),['1']);
  assert.equal(filtrarCadastrosDsips(registros,'inexistente').length,0);
  assert.equal(registros[0].nome,'Depósito auxiliar');
});
test('Cadastros faz parte do CMAPP e mantém identidade, login e navegação única',async()=>{
  const [html,app,nav,sw,fb,css]=await Promise.all([
    ler('index.html'),ler('app.js'),ler('js/ui/navigation.js'),
    ler('service-worker.js'),ler('js/config/firebase.js'),ler('app.css')
  ]);
  for(const id of ['tab-btn-dsips-cadastros','sec-dsips-cadastros','dsips-catalog-tab-categoria',
    'dsips-catalog-tab-local','dsips-cadastros-new','dsips-cadastros-editor','dsips-cadastros-form',
    'dsips-cadastros-list','dsips-cadastros-search','dsips-cadastros-status']) {
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.equal((html.match(/id="view-login"/g)||[]).length,1);
  assert.match(html,/data-nav-page="dsips-cadastros"/);
  assert.match(html,/name="nome" type="text" required maxlength="120"/);
  assert.match(nav,/'dsips-cadastros': \{ titulo: 'Cadastros DSIPS'/);
  assert.match(app,/cadastrosDsips\.limpar\(\)/);
  assert.match(app,/cadastrosDsips\.carregar\(\)/);
  assert.match(app,/if \(\['dsips-materiais', 'dsips-cadastros', 'dsips-estoque', 'dsips-cautelas', 'dsips-posse'\]\.includes\(abaAtiva\)/);
  assert.match(app,/tab-btn-dsips-cadastros/);
  assert.match(sw,/v1\.13\.20-h\.1-ux-central/);
  assert.match(sw,/\.\/js\/modules\/dsips\/cadastros-model\.js/);
  assert.match(sw,/\.\/js\/modules\/dsips\/cadastros-ui\.js/);
  assert.match(css,/\.dsips-cadastros-tabs/);
  assert.match(fb,/projectId: "cm-app-homologacao"/);
  assert.doesNotMatch(fb,/projectId: "patrimonioscm"/);
  assert.match(html,/<span class="sidebar-section-label sidebar-label">Patrimônio<\/span>/);
});
test('a interface mantém idempotência, isolamento de sessão e não cria cadastro paralelo de responsáveis',async()=>{
  const [ui,html]=await Promise.all([ler('js/modules/dsips/cadastros-ui.js'),ler('index.html')]);
  assert.match(ui,/salvarCadastroDsips\(\{ \.\.\.payload, operacaoId \}\)/);
  assert.match(ui,/pendente\.assinatura !== assinatura/);
  assert.match(ui,/if \(!podeGravar\(\) \|\| !pronto \|\| gravando/);
  assert.match(ui,/uid !== obterUsuario\(\)\?\.uid/);
  assert.match(ui,/epoca !== sessao/);
  assert.match(ui,/formulario\.reportValidity\(\)/);
  assert.doesNotMatch(ui,/innerHTML\s*=/);
  assert.doesNotMatch(ui,/responsaveis/);
  assert.match(html,/responsáveis pelas cautelas são usuários do CMAPP/);
});
