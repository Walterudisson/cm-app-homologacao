import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const ler=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('GEST-04 rota usa cadastro comum de Gestão e não cria módulo paralelo',async()=>{
  const [modules,nav,html]=await Promise.all([
    ler('js/platform/modules.js'),ler('js/ui/navigation.js'),ler('index.html')
  ]);
  assert.match(modules,/pessoas: comum\('Pessoas e vínculos', 'Gestão', 'Pessoas e vínculos', Object\.freeze\(\['admin'\]\)\)/);
  assert.match(nav,/pessoas: \{ titulo: 'Pessoas e vínculos'/);
  assert.match(html,/id="tab-btn-pessoas"[^>]+data-nav-page="pessoas"[^>]+data-perfis="admin"/);
  assert.match(html,/id="sec-pessoas"[^>]+class="hidden/);
});
test('GEST-04 rota requer admin e direitos legados de ambos os cadastros',async()=>{
  const src=await ler('js/platform/acesso-sessao.js');
  assert.match(src,/id==='pessoas'/);
  assert.match(src,/u\.perfil==='admin'/);
  assert.match(src,/usuarioPode\(u,PERMISSOES\.USUARIOS_VISUALIZAR\)/);
  assert.match(src,/usuarioPode\(u,PERMISSOES\.DIVISOES_VISUALIZAR\)/);
});
test('GEST-04 carregamento valida sessão após cada leitura',async()=>{
  const app=await ler('app.js');
  const inicio=app.indexOf('async function carregarPessoasVinculos');
  const fim=app.indexOf('function inicializarGestaoDivisoes()',inicio);
  assert.ok(inicio>0&&fim>inicio);
  const trecho=app.slice(inicio,fim);
  assert.match(trecho,/await carregarUsuarios\(true\)/);
  assert.match(trecho,/await carregarGestaoDivisoes\(true\)/);
  assert.ok((trecho.match(/if\(!atual\(\)\)return;/g)||[]).length>=2);
  assert.match(trecho,/abaAtual==='pessoas'/);
  assert.match(app,/painelPessoasVinculos\?\.limpar\(\)/);
  assert.match(app,/uidConsulta!==usuarioLogado\?\.uid\|\|auth\.currentUser\?\.uid!==uidConsulta/);
});
test('GEST-04 não integra acesso privado a cautelas ou RH no painel',async()=>{
  const ui=await ler('js/modules/gestao/pessoas-vinculos-ui.js');
  const model=await ler('js/modules/gestao/pessoas-vinculos-model.js');
  assert.doesNotMatch(ui,/(getDocs|httpsCallable|setDoc|updateDoc|fetch|localStorage)\(/);
  assert.doesNotMatch(model,/(getDocs|httpsCallable|setDoc|updateDoc|fetch|localStorage)\(/);
  assert.match(ui,/projetarMapaInstitucional/);
  assert.match(model,/responsavelOrigem==='usuarios'/);
  assert.match(model,/contato\?\.origem==='usuarios'/);
});
