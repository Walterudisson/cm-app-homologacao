import {ErroOrgaoGabinete} from './orgaos-model.js';
import {normalizarBusca} from './agenda-model.js';
import {situacaoRevisaoGabinete} from './cadastro-model.js';

// GAB-07.1: CRUD de órgãos externos só em memória; nenhuma escrita no Firebase.
export function criarOrgaosGabineteUI({orgaos,contatos,obterUsuario,podeGerenciar,notificar}){
 const painel=document.getElementById('gab-org-painel');
 const lista=document.getElementById('gab-org-lista');
 const buscar=document.getElementById('gab-org-busca');
 const filtro=document.getElementById('gab-org-estado');
 const total=document.getElementById('gab-org-total');
 const novo=document.getElementById('gab-org-novo');
 const vazio=document.getElementById('gab-org-vazio');
 const dialogo=document.getElementById('gab-org-dialogo');
 const form=document.getElementById('gab-org-form');
 const titulo=document.getElementById('gab-org-dialogo-titulo');
 const erro=document.getElementById('gab-org-erro');
 const inputs=Object.fromEntries(['nome','sigla','categoria','cidade','telefone','email'].map(c=>[c,document.getElementById('gab-org-'+c)]));
 const cancelar=document.getElementById('gab-org-cancelar');
 const fechar=document.getElementById('gab-org-fechar');
 const decisao=document.getElementById('gab-org-confirmacao');
 const decisaoTexto=document.getElementById('gab-org-confirmacao-texto');
 const decisaoExecutar=document.getElementById('gab-org-confirmacao-executar');
 const decisaoCancelar=document.getElementById('gab-org-confirmacao-cancelar');
 const decisaoFechar=document.getElementById('gab-org-confirmacao-fechar');
 let editando=null,pendente=null,inicializado=false;
 const permitido=()=>Boolean(obterUsuario()?.uid&&podeGerenciar()&&orgaos.usuarioAtual()===obterUsuario().uid);
 const criar=(tag,classe='',texto)=>{const e=document.createElement(tag);if(classe)e.className=classe;if(texto!==undefined)e.textContent=String(texto);return e;};
 const botao=(texto,acao,classe='cm-gab-action')=>{const e=criar('button',classe,texto);e.type='button';e.addEventListener('click',acao);return e;};
 const abrir=d=>{if(typeof d.showModal==='function'){if(!d.open)d.showModal();}else d.setAttribute('open','');};
 const fecharDialogo=d=>{if(d.open&&typeof d.close==='function')d.close();else d.removeAttribute('open');};
 const limparErros=()=>{
   erro.hidden=true;erro.textContent='';
   for(const input of Object.values(inputs)){
     input.removeAttribute('aria-invalid');
     input.removeAttribute('aria-describedby');
   }
 };
 const mensagemErro=e=>{
   limparErros();
   erro.hidden=false;
   erro.textContent=e instanceof ErroOrgaoGabinete?e.message:'Não foi possível salvar o órgão. Confira os dados.';
   const campo=inputs[e.campo];
   if(campo){
     campo.setAttribute('aria-invalid','true');
     campo.setAttribute('aria-describedby','gab-org-erro');
     campo.focus();
   }else erro.focus();
 };
 function formulario(id=null){
   if(!permitido())return;
   const org=id?orgaos.obter(id):null;
   if(id&&!org?.ativo)return;
   editando=org?.id||null;form.reset();limparErros();
   for(const [campo,input] of Object.entries(inputs))input.value=org?.[campo]||'';
   titulo.textContent=org?'Editar órgão externo':'Novo órgão externo';
   abrir(dialogo);inputs.nome.focus();
 }
 function dados(){return Object.fromEntries(Object.entries(inputs).map(([c,i])=>[c,i.value]));}
 function salvar(e){
   e.preventDefault();if(!permitido())return;
   try{
     if(editando)orgaos.editar(editando,dados());else orgaos.criar(dados());
     fecharDialogo(dialogo);editando=null;buscar.value='';filtro.value='ativos';renderizar();
     notificar('Cadastro de órgão externo atualizado apenas nesta sessão.','sucesso');
   }catch(err){mensagemErro(err);}
 }
 function quantidadeVinculos(id){
   return contatos.listar().filter(c=>c.tipo==='externo'&&c.orgaoId===id).length;
 }
 function perguntar(id,acao){
   if(!permitido())return;
   const org=orgaos.obter(id);if(!org)return;
   pendente={id,acao,uid:obterUsuario().uid};
   decisaoTexto.textContent=acao==='arquivar'
    ?'Arquivar o órgão "'+org.nome+'"? Se houver contatos vinculados, será necessário desvinculá-los antes.'
    :acao==='restaurar'?'Restaurar o órgão "'+org.nome+'"?'
     :'Confirmar revisão do órgão "'+org.nome+'" nesta data?';
   decisaoExecutar.textContent=({arquivar:'Arquivar',restaurar:'Restaurar',revisar:'Confirmar revisão'})[acao];
   decisaoExecutar.dataset.destrutivo=String(acao==='arquivar');abrir(decisao);
 }
 function executar(){
   if(!pendente||!permitido()||pendente.uid!==obterUsuario()?.uid){fecharDialogo(decisao);return;}
   const {id,acao}=pendente;pendente=null;
   try{
     if(acao==='arquivar')orgaos.arquivar(id,{vinculosAtivos:quantidadeVinculos(id)});
     if(acao==='restaurar')orgaos.restaurar(id);
     if(acao==='revisar')orgaos.revisar(id);
     fecharDialogo(decisao);renderizar();notificar('Órgão atualizado nesta sessão.','sucesso');
   }catch(err){fecharDialogo(decisao);notificar(err.message||'Não foi possível concluir.','aviso');}
 }
 function card(org,contatosVinculados){
   const li=criar('li','cm-gab-cad-row');li.dataset.id=org.id;
   if(!org.ativo)li.dataset.inativo='true';
   const info=criar('div','cm-gab-cad-info');
   info.append(criar('strong','',org.nome),criar('span','',[org.sigla,org.categoria,org.cidade].filter(Boolean).join(' · ')));
   const contato=criar('small','',[org.telefone,org.email].filter(Boolean).join(' · ')||'Sem contato informado');
   info.append(contato);
   const situacao=criar('div','cm-gab-cad-status');
   const revisao=situacaoRevisaoGabinete(org.revisadoEm);
   const tag=criar('span','cm-gab-cad-badge',org.ativo?revisao.rotulo:'Arquivado');
   tag.dataset.estado=org.ativo?revisao.codigo:'excluido';
   situacao.append(tag,criar('small','',contatosVinculados+' contatos vinculados'));
   const acoes=criar('div','cm-gab-cad-actions');
   if(org.ativo)acoes.append(botao('Editar',()=>formulario(org.id)),botao('Revisar hoje',()=>perguntar(org.id,'revisar')),botao('Arquivar',()=>perguntar(org.id,'arquivar'),'cm-gab-action cm-gab-cad-danger'));
   else acoes.append(botao('Restaurar',()=>perguntar(org.id,'restaurar'),'cm-gab-action cm-gab-primary'));
   li.append(info,situacao,acoes);return li;
 }
 function renderizar(){
   lista.replaceChildren();
   if(!permitido()){painel.dataset.bloqueado='true';total.textContent='';vazio.hidden=true;return;}
   painel.dataset.bloqueado='false';
   const q=normalizarBusca(buscar.value);
   const dados=orgaos.listar({incluirInativos:true}).filter(org=>{
     if(filtro.value==='arquivados'?org.ativo:!org.ativo)return false;
     return normalizarBusca([org.nome,org.sigla,org.categoria,org.cidade,org.email].join(' ')).includes(q);
   }).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
   // Uma única passagem sobre contatos, evitando N consultas a cada card de órgão.
   const vinculos=new Map();
   for(const contato of contatos.listar()){
     if(contato.tipo==='externo'&&contato.orgaoId)
       vinculos.set(contato.orgaoId,(vinculos.get(contato.orgaoId)||0)+1);
   }
   for(const org of dados)lista.append(card(org,vinculos.get(org.id)||0));
   total.textContent=dados.length===1?'1 órgão externo':dados.length+' órgãos externos';
   vazio.hidden=dados.length>0;
 }
 function fecharDialogs(){
   fecharDialogo(dialogo);fecharDialogo(decisao);
   editando=null;pendente=null;limparErros();
 }
 function limpar(){
   fecharDialogs();buscar.value='';filtro.value='ativos';
   lista.replaceChildren();total.textContent='';vazio.hidden=true; 
 }
 function inicializar(){
   if(inicializado)return;inicializado=true;
   novo.addEventListener('click',()=>formulario());
   form.addEventListener('submit',salvar);
   buscar.addEventListener('input',renderizar);filtro.addEventListener('change',renderizar);
   cancelar.addEventListener('click',()=>fecharDialogo(dialogo));fechar.addEventListener('click',()=>fecharDialogo(dialogo));
   decisaoCancelar.addEventListener('click',()=>{pendente=null;fecharDialogo(decisao);});
   decisaoFechar.addEventListener('click',()=>{pendente=null;fecharDialogo(decisao);});
   decisaoExecutar.addEventListener('click',executar);
   dialogo.addEventListener('close',()=>{editando=null;limparErros();});
   decisao.addEventListener('close',()=>{pendente=null;});
 }
 return {inicializar,renderizar,limpar,fecharDialogs};
}
