import {CONTATOS_DEMONSTRACAO} from './agenda-model.js';
import {dataLocalHoje,listarAniversariantes,normalizarPreferencias,PREFERENCIAS_PADRAO} from './aniversarios-model.js';

// GAB-06: prévia local, sem push, agendamentos, listeners externos ou Firebase.
export function criarAniversariantesGabinete({obterUsuario,podeConsultar,abrirContato,notificar,hoje=()=>dataLocalHoje()}){
  const painel=document.getElementById('gabinete-aniversarios');
  const lista=document.getElementById('gabinete-aniversarios-lista');
  const vazio=document.getElementById('gabinete-aniversarios-vazio');
  const totalHoje=document.getElementById('gabinete-aniversarios-hoje');
  const totalSemana=document.getElementById('gabinete-aniversarios-semana');
  const totalMes=document.getElementById('gabinete-aniversarios-mes');
  const totalFiltro=document.getElementById('gabinete-aniversarios-total');
  const seletor=document.getElementById('gabinete-aniversarios-periodo');
  const avisos=document.getElementById('gabinete-aniversarios-avisos');
  const observacao=document.getElementById('gabinete-aniversarios-local');
  const dados=CONTATOS_DEMONSTRACAO;
  let uidAtual='',preferencias={...PREFERENCIAS_PADRAO},inicializado=false;
  const autorizado=()=>Boolean(obterUsuario()?.uid&&podeConsultar());
  const chave=uid=>'cmapp-gab06-aniversarios-demo-'+uid;
  const criar=(tag,classe='',texto)=>{
    const el=document.createElement(tag);
    if(classe)el.className=classe;
    if(texto!==undefined)el.textContent=String(texto);
    return el;
  };

  function sincronizarUsuario(){
    const uid=autorizado()?obterUsuario().uid:'';
    if(uid===uidAtual)return;
    uidAtual=uid;preferencias={...PREFERENCIAS_PADRAO};
    if(!uid)return;
    try{preferencias=normalizarPreferencias(JSON.parse(localStorage.getItem(chave(uid))||'null'));}
    catch(_){preferencias={...PREFERENCIAS_PADRAO};}
  }
  function persistir(){
    if(!uidAtual||!autorizado())return;
    try{localStorage.setItem(chave(uidAtual),JSON.stringify(preferencias));}
    catch(_){notificar('Não foi possível salvar as preferências neste dispositivo.','aviso');}
  }
  function renderizar(){
    sincronizarUsuario();
    const permitido=autorizado();
    painel.hidden=!permitido;
    lista.replaceChildren();
    if(!permitido){
      totalHoje.textContent='—';totalSemana.textContent='—';totalMes.textContent='—';
      totalFiltro.textContent='';vazio.textContent='';vazio.hidden=true;
      return;
    }
    avisos.checked=preferencias.exibirPainel;
    seletor.value=preferencias.periodo;
    const ativos=preferencias.exibirPainel;
    totalHoje.textContent=ativos?String(listarAniversariantes(dados,{hoje:hoje(),periodo:'hoje'}).length):'—';
    totalSemana.textContent=ativos?String(listarAniversariantes(dados,{hoje:hoje(),periodo:'7'}).length):'—';
    totalMes.textContent=ativos?String(listarAniversariantes(dados,{hoje:hoje(),periodo:'30'}).length):'—';
    const encontrados=ativos?listarAniversariantes(dados,{hoje:hoje(),periodo:preferencias.periodo}):[];
    totalFiltro.textContent=ativos?encontrados.length===1?'1 aniversariante':`${encontrados.length} aniversariantes`:'Avisos no Painel desativados';
    observacao.textContent=ativos?'Preferências salvas apenas neste dispositivo.':'Os aniversariantes foram ocultados por sua preferência local.';
    vazio.hidden=Boolean(encontrados.length);
    vazio.textContent=!ativos?'Ative os avisos no Painel para ver os aniversariantes.':'Nenhum aniversariante no período selecionado.';
    for(const contato of encontrados){
      const li=criar('li','cm-gab-birthday-entry');
      const icone=criar('span','cm-gab-birthday-symbol',contato.dias===0?'🎉':'🎂');
      icone.setAttribute('aria-hidden','true');
      const corpo=criar('div','cm-gab-birthday-copy');
      const nome=criar('strong','',contato.nome);
      const unidade=criar('span','',contato.unidade||'Contato institucional');
      const detalhe=contato.ajustado?'29/02 (referência em 01/03)':'Dia '+contato.diaMes;
      const data=criar('small','',detalhe);
      corpo.append(nome,unidade,data);
      const acao=criar('div','cm-gab-birthday-actions');
      const dia=criar('span',contato.dias===0?'cm-gab-birthday-today':'cm-gab-birthday-countdown',contato.dias===0?'Hoje':contato.dias===1?'Amanhã':`Em ${contato.dias} dias`);
      const abrir=criar('button','cm-gab-action','Ver ficha');abrir.type='button';
      abrir.setAttribute('aria-label','Ver ficha de '+contato.nome);
      const id=contato.id,uid=uidAtual;
      abrir.addEventListener('click',()=>{
        if(!autorizado()||uid!==obterUsuario()?.uid)return;
        void Promise.resolve(abrirContato(id)).catch(()=>notificar('Não foi possível abrir este contato.','aviso'));
      });
      acao.append(dia,abrir);li.append(icone,corpo,acao);lista.append(li);
    }
  }
  function limpar(){
    uidAtual='';preferencias={...PREFERENCIAS_PADRAO};
    lista.replaceChildren();totalFiltro.textContent='';vazio.hidden=true;
    totalHoje.textContent='—';totalSemana.textContent='—';totalMes.textContent='—';
    painel.hidden=true;
  }
  function inicializar(){
    if(inicializado)return;
    inicializado=true;
    seletor.addEventListener('change',()=>{
      if(!autorizado())return;
      sincronizarUsuario();
      preferencias.periodo=['hoje','7','30','todos'].includes(seletor.value)?seletor.value:'30';
      persistir();renderizar();
    });
    avisos.addEventListener('change',()=>{
      if(!autorizado())return;
      sincronizarUsuario();preferencias.exibirPainel=Boolean(avisos.checked);
      persistir();renderizar();
    });
  }
  return {inicializar,renderizar,limpar};
}
