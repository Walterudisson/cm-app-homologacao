import {auth,db} from '../js/config/firebase.js';
import {onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {doc,getDocFromServer,onSnapshot} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {consultarMeusAcessosV2} from '../js/services/acessos-v2.service.js';
import * as api from '../js/services/operacoes-v2.service.js';
import {criarOperacoesDsipsV2} from './controller.js';
const id=n=>document.getElementById(n);let sessao=null,revisao=0,parar=null,timer=null;
function notificar(texto){id('toast').textContent=texto;id('toast').classList.remove('hidden');clearTimeout(timer);timer=setTimeout(()=>id('toast').classList.add('hidden'),6000);}
function confirmar({titulo,mensagem,confirmarTexto}) {
  return new Promise(resolve=>{const d=document.createElement('dialog');d.setAttribute('aria-label',titulo);const h=document.createElement('h2');h.textContent=titulo;const p=document.createElement('p');p.textContent=mensagem;const a=document.createElement('div');a.className='actions';const cancelar=document.createElement('button');cancelar.textContent='Cancelar';const sim=document.createElement('button');sim.className='primary';sim.textContent=confirmarTexto||'Confirmar';let encerrado=false;
    const fim=v=>{if(encerrado)return;encerrado=true;d.close();d.remove();resolve(v);};cancelar.onclick=()=>fim(false);sim.onclick=()=>fim(true);d.addEventListener('cancel',e=>{e.preventDefault();fim(false);});d.addEventListener('close',()=>{if(!encerrado){encerrado=true;d.remove();resolve(false);}});a.append(cancelar,sim);d.append(h,p,a);document.body.append(d);d.showModal();});
}
const ui=criarOperacoesDsipsV2({obterSessao:()=>sessao,api,confirmar,notificar});
function bloquear(texto){sessao=null;ui.limpar();document.querySelectorAll('dialog[open]').forEach(d=>d.close());id('session-message').textContent=texto;id('session-gate').classList.remove('hidden');id('operation-shell').classList.add('hidden');}
for(const n of ['logout','gate-logout'])id(n).addEventListener('click',()=>void signOut(auth));
id('theme').value=window.cmappTema.obter();id('theme').addEventListener('change',e=>window.cmappTema.definir(e.target.value));document.addEventListener('cmapp:tema',()=>id('theme').value=window.cmappTema.obter());
onAuthStateChanged(auth,async user=>{
  const token=++revisao;if(parar){parar();parar=null;}bloquear(user?'Validando sessão e permissões…':'Entre no CMAPP para continuar.');if(!user)return;
  try{
    const snap=await getDocFromServer(doc(db,'usuarios',user.uid));if(token!==revisao||user.uid!==auth.currentUser?.uid)return;
    if(!snap.exists()||snap.data().ativo===false||snap.data().autorizacaoVersao!==2){bloquear('Conta indisponível para a operação v2. A habilitação depende de migração administrativa.');return;}
    const acesso=await consultarMeusAcessosV2();if(token!==revisao||user.uid!==auth.currentUser?.uid)return;sessao={conta:{...snap.data(),uid:user.uid},acesso};
    if(!ui.pode('consultar')){bloquear('Sua conta não possui acesso operacional ao DSIPS.');return;}
    const rev=snap.data().autorizacaoRevisao??0;
    parar=onSnapshot(doc(db,'usuarios',user.uid),s=>{if(token!==revisao)return;const u=s.data();if(!s.exists()||u.ativo===false||u.autorizacaoVersao!==2||(u.autorizacaoRevisao??0)!==rev){bloquear('Sua autorização foi alterada. Entre novamente.');void signOut(auth);}},()=>{bloquear('Não foi possível acompanhar a autorização. Entre novamente.');void signOut(auth);});
    await ui.iniciar();if(token!==revisao||!sessao)return;id('session-gate').classList.add('hidden');id('operation-shell').classList.remove('hidden');
  }catch(e){if(token===revisao)bloquear(e.message||'Não foi possível validar a operação DSIPS.');}
});
