import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
import {CATALOGO_ACESSOS,obterFuncionalidade,obterPapel} from '../js/platform/access/catalogo.js';
import {atribuicaoValida,escopoValido,escopoContem,podeExecutar,podeNaPlataforma,podeConceder,podeRevogar,podeDesignarDelegacao,podeGerenciarConta} from '../js/platform/access/politica.js';
import {analisarUsuarioLegado,analisarLoteLegado} from '../js/platform/access/legado.js';
const pessoa=(uid='a',extra={})=>({uid,versao:2,ativo:true,papelPlataforma:'usuario',atribuicoes:[],delegacoes:[],permissoesPlataforma:[],...extra});
const atrib=(papelId='conferente',ids=['DA'])=>({moduloId:'da',funcionalidadeId:'patrimonios',papelId,escopo:ids?{tipo:'divisoes',ids}:{tipo:'todos'}});
const cautela=(papelId='operador')=>({moduloId:'dsips',funcionalidadeId:'materiais_cautelas',papelId,escopo:{tipo:'todos'}});
const pedido=(acao='consultar',dsips=false)=>({moduloId:dsips?'dsips':'da',funcionalidadeId:dsips?'materiais_cautelas':'patrimonios',acao});
const delegacao=(papeis=['consulta','conferente'],ids=['DA'])=>({nivel:'funcionalidade',moduloId:'da',funcionalidadeId:'patrimonios',limites:[{funcionalidadeId:'patrimonios',papeis,escopo:ids?{tipo:'divisoes',ids}:{tipo:'todos'}}]});
test('catálogo só contém ações declaradas, é imutável e não herda chaves de Object',()=>{
 assert.equal(obterFuncionalidade('constructor','patrimonios'),null);assert.equal(obterFuncionalidade('da','__proto__'),null);assert.equal(obterPapel('da','patrimonios','toString'),null);
 assert.ok(Object.isFrozen(CATALOGO_ACESSOS.dsips.funcionalidades.materiais_cautelas.papeis.operador));
 for(const m of Object.values(CATALOGO_ACESSOS))for(const f of Object.values(m.funcionalidades))for(const a of Object.values(f.papeis))for(const action of a)assert.ok(Object.hasOwn(f.acoes,action));
});
test('conta sem atribuições, desconhecida, inativa, ou versão errada não recebe acesso',()=>{
 for(const u of [null,pessoa(),pessoa('a',{versao:1,perfil:'admin'}),pessoa('a',{papelPlataforma:'desconhecido'}),pessoa('a',{ativo:false,atribuicoes:[cautela('gestor')]})])assert.equal(podeExecutar(u,pedido('consultar',true)),false);
});
test('lotação e campos legados não concedem permissões v2',()=>{
 const u=pessoa('a',{lotacao:'DSIPS',perfil:'admin',modulos:['patrimonios','dsips'],permissoes:['usuarios.gerenciar']});assert.equal(podeExecutar(u,pedido()),false);assert.equal(podeNaPlataforma(u,'contas.gerenciar'),false);
});
test('Superadmin cobre ações conhecidas de todos os módulos e plataforma, sem autorizar ação inexistente',()=>{
 const s=pessoa('s',{papelPlataforma:'superadmin'});
 for(const [moduloId,m]of Object.entries(CATALOGO_ACESSOS))for(const [funcionalidadeId,f]of Object.entries(m.funcionalidades))for(const acao of Object.keys(f.acoes))assert.equal(podeExecutar(s,{moduloId,funcionalidadeId,acao}),true);
 assert.equal(podeNaPlataforma(s,'contas.gerenciar'),true);assert.equal(podeExecutar(s,pedido('apagar_historico')),false);assert.equal(podeNaPlataforma(s,'constructor'),false);
});
test('administrador TI mantém contas sem ganhar operação nem designação automaticamente',()=>{
 const ti=pessoa('ti',{papelPlataforma:'administrador',permissoesPlataforma:['contas.consultar','contas.gerenciar','contas.recuperar']});
 assert.equal(podeNaPlataforma(ti,'contas.gerenciar'),true);assert.equal(podeNaPlataforma(ti,'gestores.designar'),false);assert.equal(podeExecutar(ti,pedido('consultar',true)),false);assert.equal(podeConceder(ti,pessoa('b'),cautela()),false);
});
test('administrador pode reativar conta comum, mas não alterar Superadmin nem a própria conta administrativa',()=>{
 const ti=pessoa('ti',{papelPlataforma:'administrador',permissoesPlataforma:['contas.gerenciar','contas.consultar']});
 assert.equal(podeGerenciarConta(ti,pessoa('b',{ativo:false}),'contas.gerenciar'),true);assert.equal(podeGerenciarConta(ti,pessoa('s',{papelPlataforma:'superadmin'}),'contas.gerenciar'),false);assert.equal(podeGerenciarConta(ti,ti,'contas.gerenciar'),false);
});
test('Conferente atua somente nas divisões atribuídas, exige contexto do recurso e não aprova',()=>{
 const c=pessoa('c',{atribuicoes:[atrib()]});assert.equal(podeExecutar(c,pedido('conferir'),{divisaoId:'DA'}),true);assert.equal(podeExecutar(c,pedido(),{divisaoId:'Gabinete'}),false);assert.equal(podeExecutar(c,pedido()),false);assert.equal(podeExecutar(c,pedido('aprovar'),{divisaoId:'DA'}),false);
});
test('Consulta não confere; acúmulo de papéis respeita ação e escopo na mesma atribuição',()=>{
 const c=pessoa('c',{atribuicoes:[atrib('consulta',['DA']),atrib('conferente',['Gabinete'])]});assert.equal(podeExecutar(c,pedido('conferir'),{divisaoId:'DA'}),false);assert.equal(podeExecutar(c,pedido('conferir'),{divisaoId:'Gabinete'}),true);
});
test('Operador DSIPS retira/devolve e consulta movimentações, sem cadastrar materiais nem inicializar saldo',()=>{
 const o=pessoa('o',{atribuicoes:[cautela()]});for(const a of ['consultar','cautelar','devolver','historico'])assert.equal(podeExecutar(o,pedido(a,true)),true);
 for(const a of ['cadastrar','alterar','inativar','saldo_inicial'])assert.equal(podeExecutar(o,pedido(a,true)),false);assert.equal(podeExecutar(o,pedido()),false);
});
test('escopos inválidos, vazios, repetidos ou não suportados nunca concedem acesso',()=>{
 for(const escopo of [{tipo:'divisoes',ids:[]},{tipo:'divisoes',ids:['DA','DA']},{tipo:'divisoes',ids:[' ']},{tipo:'todos',ids:['DA']},{tipo:'desconhecido'}])assert.equal(atribuicaoValida({...atrib(),escopo}),false);
 assert.equal(escopoValido({tipo:'divisoes',ids:['DA']},'dsips','materiais_cautelas'),false);assert.equal(atribuicaoValida({...cautela(),papelId:'superadmin'}),false);
});
test('gestor operacional sem delegação não concede nem revoga acessos',()=>{
 const g=pessoa('g',{atribuicoes:[cautela('gestor')]});assert.equal(podeConceder(g,pessoa('b'),cautela()),false);assert.equal(podeRevogar(g,pessoa('b'),cautela()),false);
});
test('delegação permite outra lotação, limita papel, funcionalidade e abrangência',()=>{
 const g=pessoa('g',{delegacoes:[delegacao()]});const b=pessoa('b',{lotacao:'DTA'});
 assert.equal(podeConceder(g,b,atrib()),true);assert.equal(podeRevogar(g,b,atrib('consulta')),true);assert.equal(podeConceder(g,b,atrib('gestor')),false);assert.equal(podeConceder(g,b,atrib('conferente',['Gabinete'])),false);assert.equal(podeConceder(g,b,atrib('conferente',null)),false);assert.equal(podeConceder(g,b,cautela()),false);
});
test('delegação de módulo exige limite explícito por funcionalidade e não autoriza função futura',()=>{
 const d={...delegacao(),nivel:'modulo'};delete d.funcionalidadeId;const g=pessoa('g',{delegacoes:[d]});
 assert.equal(podeConceder(g,pessoa('b'),atrib()),true);assert.equal(podeConceder(g,pessoa('b'),{...atrib(),funcionalidadeId:'ti'}),false);
});
test('ninguém se concede acesso nem concede a inativo ou modifica Superadmin por delegação comum',()=>{
 const g=pessoa('g',{delegacoes:[delegacao()]});assert.equal(podeConceder(g,g,atrib()),false);assert.equal(podeConceder(g,pessoa('b',{ativo:false}),atrib()),false);assert.equal(podeConceder(g,pessoa('s',{papelPlataforma:'superadmin'}),atrib()),false);
});
test('designar gestores e delegações exige autorização administrativa explícita',()=>{
 const comum=pessoa('ti',{papelPlataforma:'administrador'});const autorizado={...comum,permissoesPlataforma:['gestores.designar']};const b=pessoa('b');
 assert.equal(podeDesignarDelegacao(comum,b,delegacao()),false);assert.equal(podeDesignarDelegacao(autorizado,b,delegacao()),true);assert.equal(podeConceder(autorizado,b,atrib('gestor')),true);assert.equal(podeDesignarDelegacao(autorizado,b,delegacao(['gestor'])),false);assert.equal(podeDesignarDelegacao(autorizado,b,{...delegacao(),funcionalidadeId:'outra'}),false);
});
test('análise não promove admin legado, não infere delegação e não modifica entrada',()=>{
 const old={uid:'a',perfil:'admin',ativo:true};const copia=structuredClone(old);const r=analisarUsuarioLegado(old);assert.equal(r.situacao,'designacao_manual');assert.equal(r.proposta,null);assert.deepEqual(old,copia);
 const g=analisarUsuarioLegado({uid:'g',perfil:'gestor',modulos:['dsips']});assert.equal(g.situacao,'revisar');assert.equal(g.proposta.atribuicoes[0].papelId,'gestor');assert.deepEqual(g.proposta.delegacoes,[]);
});
test('análise preserva divisões e sinaliza diferença entre Rules legadas e papel proposto',()=>{
 const r=analisarUsuarioLegado({uid:'c',perfil:'conferente',divisoesAtribuidas:['DA']});assert.equal(r.proposta.atribuicoes[0].moduloId,'da');assert.deepEqual(r.proposta.atribuicoes[0].escopo.ids,['DA']);assert.match(r.avisos.join(' '),/leitura direta/);
 const invalido=analisarUsuarioLegado({uid:'c',perfil:'conferente',divisoesAtribuidas:[]});assert.equal(invalido.proposta.atribuicoes.length,0);assert.equal(invalido.situacao,'revisar');
});
test('funções personalizadas, módulos desconhecidos e versões posteriores não migram silenciosamente',()=>{
 assert.equal(analisarUsuarioLegado({uid:'c',perfil:'gestor',modulos:['dsips'],funcaoId:'x',permissoes:['usuarios.gerenciar']}).situacao,'revisar');
 assert.equal(analisarUsuarioLegado({uid:'c',perfil:'gestor',modulos:['futuro']}).situacao,'bloqueado');assert.equal(analisarUsuarioLegado({uid:'c',perfil:'admin',versao:3}).situacao,'bloqueado');assert.equal(analisarUsuarioLegado({uid:'c',perfil:'gestor',versao:2}).proposta,null);
});
test('perfil básico não ganha módulos e conta inativa permanece bloqueada',()=>{
 const r=analisarUsuarioLegado({uid:'c',perfil:'usuario',modulos:['dsips']});assert.equal(r.proposta.atribuicoes.length,0);const inativo=analisarUsuarioLegado({uid:'c',perfil:'conferente',ativo:false,modulos:['dsips']});assert.equal(inativo.proposta.ativo,false);assert.equal(podeExecutar(inativo.proposta,pedido('consultar',true)),false);
});
test('lote exige ambiente explícito, detecta UID duplicado e reporta somente análise',async()=>{
 assert.throws(()=>analisarLoteLegado({usuarios:[]}));assert.throws(()=>analisarLoteLegado({ambiente:'hml',usuarios:[{uid:'c'},{uid:'c'}]}));
 const input=JSON.parse(await readFile(new URL('../fixtures/acessos-legados-exemplo.json',import.meta.url),'utf8'));const r=analisarLoteLegado(input);assert.equal(r.modo,'somente_analise');assert.equal(r.usuarios.length,6);assert.equal(r.resumo.designacao_manual,1);
});
test('CLI analisa arquivo local, rejeita parâmetro de aplicação e não grava na entrada',async()=>{
 const file=new URL('../fixtures/acessos-legados-exemplo.json',import.meta.url);const antes=await readFile(file,'utf8');const r=spawnSync(process.execPath,['scripts/analisar-acessos-legados.mjs',file.pathname],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).modo,'somente_analise');assert.equal(await readFile(file,'utf8'),antes);const bad=spawnSync(process.execPath,['scripts/analisar-acessos-legados.mjs','--aplicar'],{encoding:'utf8'});assert.equal(bad.status,1);
});

test('comparação de abrangência rejeita formas inválidas mesmo com limite global',()=>{
 for(const escopo of [null,{tipo:'futuro'},{tipo:'divisoes',ids:[]},{tipo:'todos',ids:[]}])assert.equal(escopoContem({tipo:'todos'},escopo),false);
 assert.equal(escopoContem({tipo:'divisoes',ids:['DA','Gabinete']},{tipo:'divisoes',ids:['DA']}),true);
});

test('revogar conta inativa não concede acesso novo nem permite autoelevação',()=>{
 const g=pessoa('g',{delegacoes:[delegacao()]});const alvo=pessoa('b',{ativo:false});
 assert.equal(podeRevogar(g,alvo,atrib()),true);assert.equal(podeConceder(g,alvo,atrib()),false);assert.equal(podeRevogar(g,g,atrib()),false);
});
test('delegação malformada não é aproveitada parcialmente para conceder acesso',()=>{
 const d=delegacao(['consulta','conferente','inexistente']);const g=pessoa('g',{delegacoes:[d]});assert.equal(podeConceder(g,pessoa('b'),atrib()),false);
});
