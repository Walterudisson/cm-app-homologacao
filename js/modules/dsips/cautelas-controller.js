import { modulosDoUsuario } from '../../platform/modules.js';
import { podeGerenciarDsips } from './model.js';
import { pendente, unidadesPendentes, resumirPosse } from './cautelas-model.js';

export function criarInterfaceCautelas({ obterUsuario, servicos, confirmar, notificar }) {
  const porId = id => document.getElementById(id);
  const form = porId('dsips-cautela-form'); const retorno = porId('dsips-devolucao-form');
  let dados = {}; let pagina = ''; let revisao = 0; let gravando = false;
  let linhas = []; let linhasRetorno = []; let cautelaRetorno = null;
  const operacoes = new Map();
  const podeEscrever = () => podeGerenciarDsips(obterUsuario());
  const texto = (tag, valor) => { const node = document.createElement(tag); node.textContent = valor; return node; };
  const normalizar = valor => String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function status(valor) { document.querySelectorAll('.movement-status').forEach(node => { node.textContent = valor; }); }
  function rotulo(item) { return ({ aberta: 'Sem devolução', parcial: 'Parcialmente devolvida', encerrada: 'Encerrada' })[item.status] || item.status; }
  function escolherUnidades(container, unidades, aoMudar) {
    container.replaceChildren();
    for (const unidade of unidades) {
      const label = document.createElement('label'); label.className = 'dsips-unit-choice';
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = unidade.id;
      input.addEventListener('change', aoMudar); label.append(input, texto('span', unidade.identificacao)); container.appendChild(label);
    }
    if (!unidades.length) container.appendChild(texto('p', 'Nenhuma identificação disponível.'));
  }
  const selecionadas = container => [...container.querySelectorAll('input:checked')].map(input => input.value);
  const icones = { caixa: '▣', escudo: '⬡', radio: '▥', chave: '⚿', maleta: '▤', colete: '◈' };
  function resumoCesta() {
    porId('dsips-pdv-resumo').textContent = linhas.length ? `${linhas.length} material(is) na cesta. Confira quantidades e identificações.` : 'Cesta vazia. Toque em um card para começar.';
  }
  function renderizarUsuarios() {
    const select = form.elements.responsavelId; const atual = select.value;
    const busca = normalizar(porId('dsips-usuario-search').value);
    select.replaceChildren(new Option('Selecione o usuário que receberá os materiais', ''));
    for (const pessoa of dados.responsaveis || []) {
      if (pessoa.ativo === false || (pessoa.id !== atual && !normalizar(pessoa.nome).includes(busca))) continue;
      select.add(new Option(pessoa.nome + (pessoa.matricula ? ` · ${pessoa.matricula}` : ''), pessoa.id));
    }
    select.value = atual;
  }
  function renderizarCards() {
    const container = porId('dsips-pdv-cards'); container.replaceChildren();
    const busca = normalizar(porId('dsips-pdv-search').value); const categoria = porId('dsips-pdv-categoria').value;
    for (const material of dados.materiais || []) {
      if (material.ativo === false || !normalizar(material.nome).includes(busca) || (categoria && material.categoriaId !== categoria)) continue;
      const estoque = dados.estoque?.find(item => item.materialId === material.id);
      const saldo = estoque?.disponivel || 0;
      const card = document.createElement('button'); card.type = 'button'; card.className = 'pdv-material'; card.dataset.materialId = material.id;
      card.dataset.cor = ['azul','verde','roxo','ambar'].includes(material.cor) ? material.cor : 'azul';
      const icon = texto('span', icones[material.icone] || icones.caixa); icon.className = 'pdv-icon'; icon.setAttribute('aria-hidden','true');
      card.append(icon, texto('strong',material.nome), texto('span', `${saldo} ${material.unidade} disponíveis`), texto('small', material.controle === 'individualizado' ? 'Selecionar identificação' : 'Toque para adicionar'));
      card.disabled = !podeEscrever() || saldo <= 0;
      card.addEventListener('click', () => adicionarMaterial(material)); container.appendChild(card);
    }
    if (!container.children.length) container.appendChild(texto('p','Nenhum material encontrado. Ajuste a busca ou a categoria.'));
  }
  function adicionarMaterial(item) {
    if (!podeEscrever() || gravando) return;
    const existente = linhas.find(linha => linha.item.id === item.id);
    if (existente) {
      if (item.controle === 'individualizado') existente.unidades.querySelector('input')?.focus();
      else if (Number(existente.quantidade.value) < Number(existente.quantidade.max)) existente.quantidade.value = String(Number(existente.quantidade.value) + 1);
      else notificar('Toda a quantidade disponível já está na cesta.', 'aviso');
      resumoCesta(); return;
    }
    if (linhas.length >= 20) { notificar('Uma cautela permite até 20 materiais.', 'aviso'); return; }
    const node = document.createElement('div'); node.className = 'dsips-item-editor'; node.dataset.materialId = item.id;
    node.appendChild(texto('strong', item.nome));
    const quantidade = document.createElement('input'); quantidade.type = 'number'; quantidade.min = '1'; quantidade.step = '1'; quantidade.required = true;
    quantidade.max = String(dados.estoque?.find(posicao => posicao.materialId === item.id)?.disponivel || 0);
    quantidade.value = item.controle === 'individualizado' ? '0' : '1'; quantidade.readOnly = item.controle === 'individualizado';
    quantidade.setAttribute('aria-label', `Quantidade a entregar de ${item.nome}`); quantidade.addEventListener('input',resumoCesta);
    const label = texto('label', `Quantidade (${item.unidade})`); label.appendChild(quantidade);
    const menos = texto('button','−'); menos.type = 'button'; menos.className = 'app-button app-button-secondary'; menos.setAttribute('aria-label',`Diminuir ${item.nome}`);
    const mais = texto('button','+'); mais.type = 'button'; mais.className = 'app-button app-button-secondary'; mais.setAttribute('aria-label',`Aumentar ${item.nome}`);
    menos.disabled = mais.disabled = quantidade.readOnly;
    menos.addEventListener('click',()=>{quantidade.value=String(Math.max(1,Number(quantidade.value)-1));resumoCesta();});
    mais.addEventListener('click',()=>{quantidade.value=String(Math.min(Number(quantidade.max),Number(quantidade.value)+1));resumoCesta();});
    const controles = document.createElement('div'); controles.className='pdv-quantity'; controles.append(menos,label,mais);
    const unidades = document.createElement('div'); unidades.className = 'dsips-unit-picker';
    const remover = texto('button', 'Remover'); remover.type = 'button'; remover.className = 'app-button app-button-secondary';
    const linha = { node, item, quantidade, unidades };
    remover.addEventListener('click',()=>{if(gravando)return;linhas=linhas.filter(atual=>atual!==linha);node.remove();resumoCesta();});
    node.append(controles,unidades,remover);porId('dsips-cautela-rows').appendChild(node);linhas.push(linha);resumoCesta();
    if (item.controle !== 'individualizado') return;
    const token = revisao; const uid = obterUsuario()?.uid;
    unidades.appendChild(texto('p','Carregando identificações…'));
    servicos.listarUnidades(item.id).then(lista=>{
      if(token!==revisao || uid!==obterUsuario()?.uid || !node.isConnected)return;
      escolherUnidades(unidades,lista.filter(unidade=>unidade.situacao==='disponivel'&&!unidade.cautelaId),()=>{quantidade.value=String(selecionadas(unidades).length);resumoCesta();});
    }).catch(erro=>{if(token===revisao&&uid===obterUsuario()?.uid&&node.isConnected){unidades.replaceChildren(texto('p','Falha ao consultar. Remova o material e tente novamente.'));notificar(erro.message,'erro');}});
  }
  function sairQuiosque() {
    document.body.classList.remove('dsips-quiosque'); porId('dsips-quiosque').setAttribute('aria-pressed','false'); porId('dsips-quiosque').textContent='Modo quiosque';
  }
  function cancelarRetorno() { retorno.classList.add('hidden'); cautelaRetorno = null; linhasRetorno = []; porId('dsips-devolucao-rows').replaceChildren(); retorno.reset(); }
  function prepararRetorno(cautela) {
    if (!podeEscrever()) return;
    cancelarRetorno(); cautelaRetorno = cautela; retorno.classList.remove('hidden');
    porId('dsips-devolucao-title').textContent = `Devolução · ${cautela.responsavelNome} · ${cautela.id.slice(0, 10)}`;
    for (const item of cautela.itens.filter(item => pendente(item) > 0)) {
      const node = document.createElement('div'); node.className = 'dsips-item-editor';
      node.appendChild(texto('strong', `${item.nome} · Pendente: ${pendente(item)} ${item.unidade}`));
      const q = document.createElement('input'); q.type = 'number'; q.min = '0'; q.max = String(pendente(item)); q.step = '1'; q.value = '0'; q.required = true;
      q.setAttribute('aria-label', `Quantidade a devolver de ${item.nome}`);
      const unidades = document.createElement('div'); unidades.className = 'dsips-unit-picker';
      if (item.controle === 'individualizado') { q.readOnly = true; escolherUnidades(unidades, unidadesPendentes(item), () => { q.value = String(selecionadas(unidades).length); }); }
      const label = texto('label', 'Quantidade nesta devolução'); label.appendChild(q); node.append(label, unidades);
      porId('dsips-devolucao-rows').appendChild(node); linhasRetorno.push({ item, q, unidades });
    }
    retorno.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }
  function renderizarCautelas() {
    const container = porId('dsips-cautela-list'); container.replaceChildren();
    const filtro = porId('dsips-cautela-status').value; const busca = normalizar(porId('dsips-cautela-search').value);
    const lista = [...(dados.cautelas || [])].sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0));
    for (const cautela of lista) {
      if (filtro !== 'todas' && cautela.status !== filtro) continue;
      if (!normalizar(`${cautela.responsavelNome} ${cautela.responsavelMatricula} ${cautela.itens.map(item => item.nome).join(' ')}`).includes(busca)) continue;
      const card = document.createElement('article'); card.className = 'module-access-panel';
      card.append(texto('h3', `${cautela.responsavelNome} · ${rotulo(cautela)}`), texto('p', `${cautela.id.slice(0, 10)} · Matrícula ${cautela.responsavelMatricula || 'não informada'}${cautela.criadoEm?.toDate ? ' · ' + cautela.criadoEm.toDate().toLocaleString('pt-BR') : ''}`));
      for (const item of cautela.itens) card.appendChild(texto('p', `${item.nome}: ${item.quantidade} ${item.unidade} entregues · ${item.devolvida} devolvidos · ${pendente(item)} pendentes${unidadesPendentes(item).length ? ' · ' + unidadesPendentes(item).map(unidade => unidade.identificacao).join(', ') : ''}`));
      if (cautela.observacoes) card.appendChild(texto('p', cautela.observacoes));
      if (cautela.status !== 'encerrada' && podeEscrever()) {
        const botao = texto('button', 'Registrar devolução'); botao.type = 'button'; botao.className = 'app-button app-button-primary';
        botao.addEventListener('click', () => prepararRetorno(cautela)); card.appendChild(botao);
      }
      container.appendChild(card);
    }
    if (!container.children.length) container.appendChild(texto('p', 'Nenhuma cautela encontrada para os filtros selecionados.'));
  }
  function renderizarPosse() {
    const container = porId('dsips-posse-list'); container.replaceChildren(); const busca = normalizar(porId('dsips-posse-search').value);
    for (const grupo of resumirPosse(dados.cautelas || [])) {
      if (!normalizar([grupo.nome, grupo.matricula, ...grupo.materiais.map(item => item.nome + ' ' + item.identificacoes.join(' '))].join(' ')).includes(busca)) continue;
      const card = document.createElement('article'); card.className = 'module-access-panel';
      card.append(texto('h3', grupo.nome), texto('p', `Matrícula ${grupo.matricula} · ${grupo.cautelas.length} cautela(s) em aberto`));
      for (const item of grupo.materiais) card.appendChild(texto('p', `${item.nome}: ${item.quantidade} ${item.unidade}${item.identificacoes.length ? ' · ' + item.identificacoes.join(', ') : ''}`));
      container.appendChild(card);
    }
    if (!container.children.length) container.appendChild(texto('p', 'Nenhum material pendente para esta pesquisa.'));
  }
  async function carregar(destino) {
    pagina = destino; const token = ++revisao; const uid = obterUsuario()?.uid;
    if (!modulosDoUsuario(obterUsuario()).some(item => item.id === 'dsips')) return false;
    status('Carregando…'); cancelarRetorno();
    document.querySelectorAll('[data-movement-write]').forEach(node => node.classList.toggle('hidden', !podeEscrever()));
    try {
      const tipos = destino === 'dsips-cautelas' ? (podeEscrever() ? ['cautelas','materiais','estoque','responsaveis','categorias'] : ['cautelas']) : ['cautelas'];
      const resultado = await Promise.all(tipos.map(async tipo => [tipo, await servicos.listar(tipo)]));
      if (token !== revisao || uid !== obterUsuario()?.uid) return false;
      dados = Object.fromEntries(resultado);
      if (destino === 'dsips-cautelas') {
        form.reset();
        porId('dsips-pdv-operador').textContent = `Operador: ${obterUsuario()?.nome || 'Usuário autenticado'}`;
        porId('dsips-usuario-search').value = ''; renderizarUsuarios();
        const categorias = porId('dsips-pdv-categoria'); categorias.replaceChildren(new Option('Todas',''));
        for (const categoria of dados.categorias || []) categorias.add(new Option(categoria.nome,categoria.id));
        linhas = []; porId('dsips-cautela-rows').replaceChildren(); resumoCesta(); renderizarCards(); renderizarCautelas();
      } else renderizarPosse();
      status(''); return true;
    } catch (erro) { if (token === revisao && uid === obterUsuario()?.uid) { status('Falha ao consultar. Use Atualizar para tentar novamente.'); notificar(erro.message, 'erro'); } return false; }
  }
  async function gravar(tipo, payload, funcao, formEnvio) {
    if (gravando || !podeEscrever()) return;
    gravando = true; const uid = obterUsuario()?.uid; const destino = pagina;
    const serializado = JSON.stringify(payload); const anterior = operacoes.get(tipo);
    const operacaoId = anterior?.serializado === serializado ? anterior.id : crypto.randomUUID(); operacoes.set(tipo, { serializado, id: operacaoId });
    const botao = formEnvio.querySelector('button[type="submit"]'); botao.disabled = true;
    try {
      const pessoa = tipo === 'cautela' ? dados.responsaveis?.find(item => item.id === payload.responsavelId)?.nome : cautelaRetorno?.responsavelNome;
      const itensResumo = payload.itens.map(item => { const material = dados.materiais?.find(atual => atual.id === item.materialId); return `${material?.nome || item.materialId}: ${item.quantidade}${item.unidadeIds.length ? ' · ' + item.unidadeIds.length + ' identificação(ões)' : ''}`; }).join('; ');
      if (!await confirmar({ titulo: tipo === 'cautela' ? 'Confirmar entrega dos materiais?' : 'Confirmar devolução?', mensagem: `${pessoa || 'Responsável'} — ${itensResumo}. Confirme a entrega física. O estoque e o histórico serão atualizados.`, confirmarTexto: 'Confirmar registro' })) return;
      if (uid !== obterUsuario()?.uid || !podeEscrever()) return;
      await funcao({ ...payload, operacaoId }); operacoes.delete(tipo);
      if (uid !== obterUsuario()?.uid) return;
      notificar(tipo === 'cautela' ? 'Cautela registrada.' : 'Devolução registrada.', 'sucesso');
      if (destino === pagina) await carregar(destino);
    } catch (erro) { if (uid === obterUsuario()?.uid) notificar(erro.message || 'Não foi possível registrar a operação.', 'erro'); }
    finally { gravando = false; botao.disabled = false; }
  }
  form.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!linhas.length) { notificar('Inclua pelo menos um material.', 'aviso'); return; }
    void gravar('cautela', { responsavelId: form.elements.responsavelId.value, observacoes: form.elements.observacoes.value,
      itens: linhas.map(linha => ({ materialId: linha.item.id, quantidade: Number(linha.quantidade.value), unidadeIds: selecionadas(linha.unidades) }))
    }, servicos.registrarCautela, form);
  });
  retorno.addEventListener('submit', evento => {
    evento.preventDefault(); if (!cautelaRetorno) return;
    const itens = linhasRetorno.filter(linha => Number(linha.q.value) > 0).map(linha => ({ materialId: linha.item.materialId, quantidade: Number(linha.q.value), unidadeIds: selecionadas(linha.unidades) }));
    if (!itens.length) { notificar('Informe ao menos um material que está retornando.', 'aviso'); return; }
    void gravar('devolucao', { cautelaId: cautelaRetorno.id, observacoes: retorno.elements.observacoes.value, itens }, servicos.registrarDevolucao, retorno);
  });
  porId('dsips-usuario-search').addEventListener('input',renderizarUsuarios);
  porId('dsips-pdv-search').addEventListener('input',renderizarCards);
  porId('dsips-pdv-categoria').addEventListener('change',renderizarCards);
  porId('dsips-pdv-limpar').addEventListener('click',()=>{if(gravando)return;linhas=[];porId('dsips-cautela-rows').replaceChildren();resumoCesta();});
  porId('dsips-pdv-devolucoes').addEventListener('click',()=>porId('dsips-cautelas-consulta').scrollIntoView?.({block:'start',behavior:'smooth'}));
  porId('dsips-quiosque').addEventListener('click',()=>{
    if(!podeEscrever())return;
    const ativo=document.body.classList.toggle('dsips-quiosque');porId('dsips-quiosque').setAttribute('aria-pressed',String(ativo));porId('dsips-quiosque').textContent=ativo?'Sair do quiosque':'Modo quiosque';
  });
  document.addEventListener('keydown',evento=>{if(evento.key==='Escape')sairQuiosque();});
  porId('dsips-cancelar-devolucao').addEventListener('click', cancelarRetorno);
  porId('dsips-devolver-tudo').addEventListener('click', () => {
    for (const linha of linhasRetorno) {
      linha.q.value = String(pendente(linha.item));
      linha.unidades.querySelectorAll('input').forEach(input => { input.checked = true; });
    }
  });
  porId('dsips-cautela-search').addEventListener('input', renderizarCautelas);
  porId('dsips-cautela-status').addEventListener('change', renderizarCautelas);
  porId('dsips-posse-search').addEventListener('input', renderizarPosse);
  document.querySelectorAll('[data-movement-refresh]').forEach(botao => botao.addEventListener('click', () => carregar(pagina)));
  return { carregar, sairDaPagina() { ++revisao; pagina = ''; sairQuiosque(); }, limpar() {
    sairQuiosque(); ++revisao; pagina = ''; dados = {}; linhas = []; operacoes.clear(); cancelarRetorno(); form.reset(); status('');
    for (const id of ['dsips-cautela-rows','dsips-cautela-list','dsips-posse-list']) porId(id).replaceChildren();
  } };
}
