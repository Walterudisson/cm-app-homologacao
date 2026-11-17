import {podeExecutar} from '../js/platform/access/politica.js';
import {criarInterfaceDsips} from '../js/modules/dsips/controller.js';
import {criarInterfaceCautelas} from '../js/modules/dsips/cautelas-controller.js';
import {criarServicosDsipsV2} from './servicos.js';
export function criarOperacoesDsipsV2({obterSessao,api,confirmar,notificar}) {
  const id=n=>document.getElementById(n);let pagina='',revisao=0,carregandoMais=false;
  const pode=acao=>{const s=obterSessao();return Boolean(s?.conta.ativo!==false&&s?.conta.autorizacaoVersao===2&&s.conta.uid===s.acesso.uid&&podeExecutar(s.acesso,{moduloId:'dsips',funcionalidadeId:'materiais_cautelas',acao}));};
  const servicos=criarServicosDsipsV2({api,obterUid:()=>obterSessao()?.acesso.uid});
  const deps={obterUsuario:()=>obterSessao()?.conta,servicos,confirmar,notificar,pode,aoAtualizar:()=>void navegar(pagina)};
  const cad=criarInterfaceDsips(deps),mov=criarInterfaceCautelas(deps);
  const permitePagina=p=>pode(p==='dsips-historico'?'historico':'consultar');
  const controlador=p=>['dsips-cautelas','dsips-posse'].includes(p)?mov:cad;
  function botaoHistorico(){id('history-more').classList.toggle('hidden',pagina!=='dsips-historico'||!servicos.temMaisHistorico());}
  async function navegar(destino) {
    if(!document.getElementById('sec-'+destino)||!permitePagina(destino))return false;
    const token=++revisao;carregandoMais=false;id('history-more').disabled=false;servicos.invalidar();cad.sairDaPagina();mov.sairDaPagina();pagina=destino;
    document.querySelectorAll('.module-page').forEach(s=>s.classList.toggle('hidden',s.id!=='sec-'+destino));
    document.querySelectorAll('[data-nav-page]').forEach(b=>{if(b.dataset.navPage===destino)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    id('history-more').classList.add('hidden');id('operation-title').textContent=({ 'dsips-inicio':'Visão geral','dsips-materiais':'Materiais','dsips-cadastros':'Categorias e locais','dsips-estoque':'Estoque','dsips-cautelas':'Cautelas e devoluções','dsips-posse':'Quem está com o quê','dsips-historico':'Histórico'})[destino];
    const ok=await controlador(destino).carregar(destino);if(token===revisao)botaoHistorico();return ok;
  }
  document.querySelectorAll('[data-nav-page]').forEach(b=>b.addEventListener('click',()=>void navegar(b.dataset.navPage)));
  id('history-more').addEventListener('click',async()=>{
    if(carregandoMais||pagina!=='dsips-historico'||!pode('historico'))return;carregandoMais=true;id('history-more').disabled=true;const token=revisao;
    try{await servicos.carregarMaisHistorico();if(token!==revisao)return;await cad.carregar('dsips-historico');botaoHistorico();}catch(e){if(token===revisao)notificar(e.message,'erro');}finally{if(token===revisao){carregandoMais=false;id('history-more').disabled=false;}}
  });
  return {pode,async iniciar(){const s=obterSessao();id('operation-user').textContent=s.conta.nome;document.querySelectorAll('[data-nav-page=dsips-historico]').forEach(b=>b.classList.toggle('hidden',!pode('historico')));return navegar('dsips-cautelas');},limpar(){++revisao;pagina='';carregandoMais=false;servicos.invalidar();cad.limpar();mov.limpar();id('history-more').disabled=false;id('history-more').classList.add('hidden');document.querySelectorAll('.module-page').forEach(p=>p.classList.add('hidden'));}};
}
