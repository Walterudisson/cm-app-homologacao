import {podeExecutar} from '../js/platform/access/politica.js';
import {conectarLoginPiloto} from './login-piloto.js';
import {auth,db} from '../js/config/firebase.js';
import {onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,updateProfile} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDocFromServer,onSnapshot,updateDoc} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import * as api from '../js/services/acessos-v2.service.js';
import {criarGestaoV2} from './controller.js';
const loginPiloto=conectarLoginPiloto({auth,entrar:signInWithEmailAndPassword,document});
const id=n=>document.getElementById(n);let sessao=null,revisao=0,parar=null,timer=null;
function mensagem(texto){id('session-message').textContent=texto;id('management-shell').classList.add('hidden');id('session-gate').classList.remove('hidden');}
function notificar(texto){id('toast').textContent=texto;id('toast').classList.remove('hidden');clearTimeout(timer);timer=setTimeout(()=>id('toast').classList.add('hidden'),6000);}
function confirmar(texto){return new Promise(resolve=>{const d=document.createElement('dialog');d.setAttribute('aria-label','Confirmar operação');const h=document.createElement('h2');h.textContent=texto;const p=document.createElement('p');p.textContent='A alteração será aplicada ao cadastro real e ficará registrada no histórico.';const actions=document.createElement('div');actions.className='actions';const nao=document.createElement('button');nao.textContent='Cancelar';const sim=document.createElement('button');sim.textContent='Confirmar';sim.className='primary';let fechado=false;function fim(v){if(fechado)return;fechado=true;d.close();d.remove();resolve(v);}nao.onclick=()=>fim(false);sim.onclick=()=>fim(true);d.addEventListener('cancel',e=>{e.preventDefault();fim(false);});d.addEventListener('close',()=>{if(!fechado){fechado=true;d.remove();resolve(false);}});actions.append(nao,sim);d.append(h,p,actions);document.body.append(d);d.showModal();});}
const ui=criarGestaoV2({obterSessao:()=>sessao,confirmar,notificar,servicos:{
 listar:api.listarUsuariosAcessoV2,divisoes:api.listarDivisoesAcessoV2,consultar:api.consultarAcessosV2,historico:api.consultarAuditoriaAcessoV2,conceder:api.concederAcessoV2,revogar:api.revogarAcessoV2,designar:api.designarDelegacaoV2,removerDelegacao:api.removerDelegacaoV2,criar:api.criarContaV2,atualizar:api.atualizarContaV2,estado:api.alterarEstadoContaV2,sincronizacao:api.consultarSincronizacaoContaV2,reconciliar:api.reconciliarContaV2,
 recuperar:async uid=>{const atual=auth.currentUser?.uid;const dados=await api.prepararRecuperacaoV2(uid);if(!atual||atual!==auth.currentUser?.uid)throw Error('Sessão alterada.');await sendPasswordResetEmail(auth,dados.email);}
},salvarMeuNome:async nome=>{const user=auth.currentUser;if(!user||nome.length<3||nome.length>120)throw Error('Informe um nome válido.');await updateDoc(doc(db,'usuarios',user.uid),{nome});try{await updateProfile(user,{displayName:nome});}catch{}if(sessao?.acesso.uid===user.uid){sessao.conta.nome=nome;id('own-name').textContent=nome;}}});
for(const n of ['logout','gate-logout'])id(n).addEventListener('click',()=>void signOut(auth));
id('theme').value=window.cmappTema.obter();id('theme').addEventListener('change',e=>window.cmappTema.definir(e.target.value));document.addEventListener('cmapp:tema',()=>{id('theme').value=window.cmappTema.obter();});id('switch-theme').addEventListener('click',()=>window.cmappTema.definir(document.documentElement.dataset.theme==='dark'?'claro':'escuro'));
onAuthStateChanged(auth,async user=>{
 const token=++revisao;if(parar){parar();parar=null;}sessao=null;ui.limpar();id('open-dsips').classList.add('hidden');id('open-patrimonios').classList.add('hidden');
 if(!user){mensagem('Entre com sua conta do CMAPP.');loginPiloto.mostrar();return;}
 loginPiloto.ocultar();
 mensagem('Validando a sessão e os acessos no servidor…');
 try{const snap=await getDocFromServer(doc(db,'usuarios',user.uid));if(token!==revisao||user.uid!==auth.currentUser?.uid)return;
  if(!snap.exists()||snap.data().ativo===false){mensagem('Conta desativada ou indisponível.');return;}
  if(snap.data().autorizacaoVersao!==2){mensagem('Sua conta ainda utiliza o modelo anterior. A habilitação v2 será feita por migração administrativa; volte ao CMAPP para continuar.');return;}
  const acesso=await api.consultarMeusAcessosV2();if(token!==revisao||user.uid!==auth.currentUser?.uid)return;sessao={conta:{...snap.data(),uid:user.uid},acesso};
  const versao=snap.data().autorizacaoVersao,rev=snap.data().autorizacaoRevisao??0;
  parar=onSnapshot(doc(db,'usuarios',user.uid),s=>{if(token!==revisao)return;const u=s.data();if(!s.exists()||u.ativo===false||u.autorizacaoVersao!==versao||(u.autorizacaoRevisao??0)!==rev){sessao=null;ui.limpar();mensagem('Sua autorização foi alterada. Entre novamente.');void signOut(auth);}},()=>{sessao=null;ui.limpar();mensagem('Não foi possível acompanhar a autorização. Entre novamente.');void signOut(auth);});
  id('open-dsips').classList.toggle('hidden',!podeExecutar(acesso,{moduloId:'dsips',funcionalidadeId:'materiais_cautelas',acao:'consultar'}));
  await ui.iniciar();if(token!==revisao||!sessao)return;id('session-gate').classList.add('hidden');id('management-shell').classList.remove('hidden');
 }catch(e){if(token===revisao){sessao=null;ui.limpar();mensagem(e.code?.includes('not-found')?'A gestão v2 ainda não está disponível neste ambiente.':(e.message||'Não foi possível validar seus acessos.'));}}
});
