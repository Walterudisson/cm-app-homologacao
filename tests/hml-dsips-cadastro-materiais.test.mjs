import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { podeGerenciarMateriaisDsips, prepararCadastroMaterialDsips } from '../js/modules/dsips/consulta-materiais-model.js';

const campos = { nome: 'Rádio Portátil', categoriaId: 'c1', controle: 'quantidade', unidade: 'un',
  icone: 'radio', cor: 'azul', observacoes: 'Teste HML', ativo: true };
const categorias = [{ id: 'c1', nome: 'Comunicação', ativo: true }, { id: 'inativa', nome: 'Antiga', ativo: false }];
const ler = p => readFile(new URL('../' + p, import.meta.url), 'utf8');

test('admin e gestor DSIPS podem cadastrar, conferente e usuário comum somente consultam', () => {
  assert.equal(podeGerenciarMateriaisDsips({uid:'a',perfil:'admin',ativo:true}),true);
  assert.equal(podeGerenciarMateriaisDsips({uid:'g',perfil:'gestor',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeGerenciarMateriaisDsips({uid:'c',perfil:'conferente',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeGerenciarMateriaisDsips({uid:'g',perfil:'gestor',ativo:true,modulos:['patrimonios']}),false);
  assert.equal(podeGerenciarMateriaisDsips({uid:'u',perfil:'usuario',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeGerenciarMateriaisDsips({uid:'a',perfil:'admin',ativo:false}),false);
  assert.equal(podeGerenciarMateriaisDsips({uid:'a',perfil:'admin',autorizacaoVersao:2}),false);
});
test('cadastro normalizado preserva tipo material e dados compatíveis com Callable existente', () => {
  const payload=prepararCadastroMaterialDsips({...campos,nome:' Rádio Portátil  '},{id:'mat-123',categorias});
  assert.deepEqual(payload,{tipo:'material',id:'mat-123',dados:{...campos,nome:'Rádio Portátil'}});
});
test('valida categoria ativa, tipos e observações sem permitir salvamentos inválidos', () => {
  for (const change of [{categoriaId:'inativa'},{categoriaId:'desconhecida'},{controle:'qualquer'},{unidade:'kg'},{cor:'rosa'},{icone:'perigoso'},{observacoes:'A'.repeat(501)},{nome:'   '}]) {
    assert.throws(()=>prepararCadastroMaterialDsips({...campos,...change},{id:'a',categorias}));
  }
});
test('saldo inicial bloqueia alterações de controle e unidade',()=>{
  const antigo={...campos, saldoInicialRegistrado:true};
  assert.throws(()=>prepararCadastroMaterialDsips({...campos,controle:'individualizado'},{id:'a',categorias,anterior:antigo}));
  assert.throws(()=>prepararCadastroMaterialDsips({...campos,unidade:'par'},{id:'a',categorias,anterior:antigo}));
  assert.equal(prepararCadastroMaterialDsips({...campos,nome:'Rádio editado'},{id:'a',categorias,anterior:antigo}).dados.nome,'Rádio editado');
});
test('edição é integrada ao CMAPP original, sem outro login ou backend novo',async()=>{
  const [html,app,ui,service,sw,fb]=await Promise.all([
    ler('index.html'),ler('app.js'),ler('js/modules/dsips/consulta-materiais-ui.js'),
    ler('js/modules/dsips/service.js'),ler('service-worker.js'),ler('js/config/firebase.js')
  ]);
  for (const id of ['dsips-material-new','dsips-material-editor','dsips-material-form','dsips-material-cancel','dsips-material-save']) {
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/name="categoriaId" required/);
  assert.match(html,/name="observacoes" maxlength="500"/);
  assert.match(ui,/await salvarCadastroDsips\(\{ \.\.\.pedido, operacaoId \}\)/);
  assert.match(ui,/crypto\.randomUUID\(\)/);
  assert.match(ui,/!podeGravar\(\)/);
  assert.match(ui,/uid !== obterUsuario\(\)\?\.uid/);
  assert.match(app,/notificar: notificarMensagem/);
  assert.match(service,/httpsCallable\(functions, 'dsipsSalvarCadastro'\)/);
  assert.match(sw,/v1\.13\.23-h\.1-ux-gestao/);
  assert.match(fb,/projectId: "cm-app-homologacao"/);
  assert.equal((html.match(/id="view-login"/g)||[]).length,1);
});

test('módulos DSIPS têm URL de versão explícita para impedir misturar UI antiga com HTML novo', async () => {
  const [app,ui,html,sw] = await Promise.all([ler('app.js'),ler('js/modules/dsips/consulta-materiais-ui.js'),ler('index.html'),ler('service-worker.js')]);
  assert.match(app,/consulta-materiais-model\.js\?v=1\.13\.13-h\.3/);
  assert.match(app,/consulta-materiais-ui\.js\?v=1\.13\.23-h\.1/);
  assert.match(ui,/consulta-materiais-model\.js\?v=1\.13\.13-h\.3/);
  assert.match(ui,/service\.js\?v=1\.13\.13-h\.3/);
  assert.match(html,/id="dsips-material-mode"[^>]+>Verificando acesso…<\/span>/);
  assert.match(html,/app\.js\?v=1\.13\.23-h\.1/);
  assert.match(sw,/v1\.13\.23-h\.1-ux-gestao/);
});
test('identidade institucional não limita CMAPP a Patrimônio', async () => {
  const html=await ler('index.html');
  assert.doesNotMatch(html,/CM APP · Patrimônio/);
  assert.match(html,/<strong>CM APP<\/strong>\s*<span>Plataforma<\/span>/);
  assert.match(html,/<span>CM APP<\/span>\s*<span>v1\.13\.23-H\.1 · HOMOLOGAÇÃO<\/span>/);
  assert.match(html,/<span class="sidebar-section-label sidebar-label">Patrimônio<\/span>/);
});
test('controle de gravação não amplia acesso: Admin gerencia, Conferente apenas consulta', () => {
  assert.equal(podeGerenciarMateriaisDsips({perfil:'admin',ativo:true}),true);
  assert.equal(podeGerenciarMateriaisDsips({perfil:'gestor',ativo:true,modulos:['dsips']}),true);
  assert.equal(podeGerenciarMateriaisDsips({perfil:'conferente',ativo:true,modulos:['dsips']}),false);
  assert.equal(podeGerenciarMateriaisDsips({perfil:'admin',ativo:false}),false);
  assert.equal(podeGerenciarMateriaisDsips({perfil:'admin',ativo:true,autorizacaoVersao:2}),false);
});
