import {elegivelAjuste,unidadesDisponiveis,preverAjuste,prepararAjuste} from './ajustes-model.js?v=1.13.19-h.1';
import {listarUnidadesDsips,registrarAjusteEstoqueDsips} from './service.js?v=1.13.34-h.1';
export function criarAjustesDsips({obterUsuario,podeGravar,ativo,confirmar,notificar,carregar,secao,fecharSaldoInicial,podeAbrir}) {
  let editor=null, epoca=0, ocupado=false;
  const pendencias=new Map();
  const storageKey=k=>'cmapp-hml-ajuste-pendente:'+k;
  function ler(k){if(pendencias.has(k))return pendencias.get(k);try{const raw=sessionStorage.getItem(storageKey(k));return raw?JSON.parse(raw):null;}catch(_){return null;}}
  function guardar(k,pedido){pendencias.set(k,pedido);try{sessionStorage.setItem(storageKey(k),JSON.stringify(pedido));}catch(_){} }
  function remover(k){pendencias.delete(k);try{sessionStorage.removeItem(storageKey(k));}catch(_){} }
  const el=(tag,classe,texto)=>{const n=document.createElement(tag);if(classe)n.className=classe;if(texto!==undefined)n.textContent=texto;return n;};
  const botao=(texto,classe='app-button app-button-secondary')=>{const b=el('button',classe,texto);b.type='button';return b;};
  const chave=(uid,materialId)=>JSON.stringify([uid,materialId]);
  const valido=(uid,t)=>t===epoca&&obterUsuario()?.uid===uid&&podeGravar()&&ativo();
  function fechar(){epoca++;editor?.remove();editor=null;}
  function limpar(){fechar();}
  function anexar(rodape,material,local,posicao){
    if(!podeGravar()||!material||!local||(!ler(chave(obterUsuario()?.uid,material.id))&&!elegivelAjuste(material,local,posicao)))return;
    const b=botao('Ajustar estoque');b.addEventListener('click',()=>{if(!ocupado&&podeAbrir())void abrir(material,local,posicao);});rodape.append(b);
  }
  async function abrir(material,local,posicao){
    if(!podeGravar()||!ativo()||ocupado||!podeAbrir())return;
    fecharSaldoInicial();fechar();const t=epoca,uid=obterUsuario()?.uid,k=chave(uid,material.id);
    const box=el('article','app-card dsips-editor');editor=box;
    box.append(el('h3','','Ajustar estoque: '+material.nome),el('p','','Local: '+local.nome));
    secao.prepend(box);box.scrollIntoView({block:'start'});
    const status=el('p','dsips-editor-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const cancelar=botao('Fechar');cancelar.addEventListener('click',()=>{if(!ocupado)fechar();});
    const pendente=ler(k);
    if(pendente){
      const retry=botao('Reenviar mesma operação','app-button app-button-primary');
      box.append(el('p','','Há um ajuste sem confirmação de resultado. Não crie outro antes de resolver este registro.'),el('p','',(pendente.tipo==='entrada'?'Entrada':'Baixa')+': '+pendente.quantidade+' · '+pendente.motivo),retry,cancelar,status);
      retry.addEventListener('click',()=>{void enviar(pendente,retry);});return;
    }
    const form=el('form','dsips-editor-form');
    function campo(rotulo,node){const label=el('label','',rotulo);label.append(node);form.append(label);return label;}
    const tipo=el('select');for(const [v,l] of [['entrada','Entrada'],['baixa','Baixa definitiva']])tipo.add(new Option(l,v));campo('Tipo de ajuste',tipo);
    const q=el('input');q.type='number';q.min='1';q.step='1';q.max='1000000';q.required=true;campo('Quantidade',q);
    const ids=el('textarea');ids.rows=4;ids.placeholder='Uma identificação por linha';const idsLabel=campo('Novas identificações',ids);
    const unidades=el('fieldset');unidades.append(el('legend','','Unidades disponíveis para baixa'));form.append(unidades);
    const motivo=el('textarea');motivo.required=true;motivo.maxLength=500;motivo.rows=3;campo('Justificativa obrigatória',motivo);
    const previa=el('p','');previa.setAttribute('aria-live','polite');form.append(previa);
    const salvar=botao('Confirmar ajuste','app-button app-button-primary');salvar.type='submit';form.append(salvar,cancelar,status);box.append(form);
    const individual=material.controle==='individualizado';let carregadas=[],pronto=!individual;
    const selecionadas=()=>[...unidades.querySelectorAll('input:checked')].map(x=>x.value);
    const entradas=()=>ids.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    function atualizar(){
      idsLabel.classList.toggle('hidden',!(individual&&tipo.value==='entrada'));unidades.classList.toggle('hidden',!(individual&&tipo.value==='baixa'));
      q.readOnly=individual;if(individual)q.value=String(tipo.value==='entrada'?entradas().length:selecionadas().length);
      try{const depois=preverAjuste(posicao,tipo.value,Number(q.value));previa.textContent='Total: '+posicao.total+' → '+depois.total+' | Disponível: '+posicao.disponivel+' → '+depois.disponivel+' | Em cautela: '+posicao.emCautela+' → '+depois.emCautela;salvar.disabled=ocupado||!pronto;}
      catch(e){previa.textContent=e.message;salvar.disabled=true;}
    }
    form.addEventListener('input',atualizar);form.addEventListener('change',atualizar);atualizar();
    if(individual){
      status.textContent='Consultando identificações…';
      try{carregadas=await listarUnidadesDsips(material.id);if(!valido(uid,t))return;for(const u of unidadesDisponiveis(carregadas,posicao)){const label=el('label','');const ck=el('input');ck.type='checkbox';ck.value=u.id;label.append(ck,document.createTextNode(' '+u.identificacao));unidades.append(label);}pronto=true;status.textContent='';}
      catch(e){if(!valido(uid,t))return;status.textContent='Falha na consulta. Feche e tente novamente.';}atualizar();
    }
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(ocupado||!pronto||!valido(uid,t))return;
      let pedido;try{pedido=prepararAjuste({material,local,posicao,tipo:tipo.value,quantidade:q.value,motivo:motivo.value,identificadores:entradas(),unidadeIds:selecionadas(),unidades:carregadas});}catch(e){status.textContent=e.message;return;}
      ocupado=true;salvar.disabled=true;cancelar.disabled=true;
      const camposEditaveis=[...form.querySelectorAll('input,select,textarea')];for(const c of camposEditaveis)c.disabled=true;
      let ok=false;try{ok=await confirmar({titulo:'Confirmar '+(pedido.tipo==='entrada'?'entrada':'baixa definitiva')+'?',mensagem:material.nome+' · '+pedido.quantidade+' · '+previa.textContent+' · '+pedido.motivo,confirmarTexto:'Registrar ajuste'});}catch(e){status.textContent='Não foi possível abrir a confirmação.';}finally{ocupado=false;cancelar.disabled=false;for(const c of camposEditaveis)c.disabled=false;atualizar();}
      if(!ok||!valido(uid,t))return;
      pedido={...pedido,operacaoId:crypto.randomUUID()};guardar(k,pedido);await enviar(pedido,salvar);
    });
    async function enviar(pedido,controle){
      if(ocupado||!valido(uid,t))return;
      ocupado=true;controle.disabled=true;cancelar.disabled=true;status.textContent='Registrando ajuste…';
      try{await registrarAjusteEstoqueDsips(pedido);remover(k);if(!valido(uid,t))return;fechar();notificar('Ajuste de estoque registrado no HML.','sucesso');await carregar();}
      catch(e){const code=String(e?.code||'').replace(/^functions\//,'');
        if(['invalid-argument','failed-precondition','already-exists'].includes(code)){remover(k);if(valido(uid,t)){fechar();notificar(e.message||'Ajuste recusado. Atualize o estoque.','erro');await carregar();}}
        else if(valido(uid,t)){fechar();notificar('Resultado não confirmado. Reabra Ajustar estoque e reenvie a mesma operação.','erro');}
      }finally{ocupado=false;controle.disabled=false;cancelar.disabled=false;}
    }
  }
  return {anexar,fechar,limpar,ocupado:()=>ocupado};
}
