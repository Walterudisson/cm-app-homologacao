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
  function rotulo(item) { return ({ aberta: 'Aberta', parcial: 'Parcialmente devolvida', encerrada: 'Encerrada' })[item.status] || item.status; }
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
  function novaLinha() {
    if (linhas.length >= 20) return;
    const node = document.createElement('div'); node.className = 'dsips-item-editor';
    const material = document.createElement('select'); material.required = true; material.setAttribute('aria-label', 'Material da cautela');
    material.add(new Option('Selecione um material', ''));
    for (const item of dados.materiais || []) {
      const estoque = dados.estoque?.find(posicao => posicao.materialId === item.id);
      if (item.ativo !== false && estoque?.disponivel > 0) material.add(new Option(`${item.nome} · ${estoque.disponivel} ${item.unidade} disponíveis`, item.id));
    }
    const quantidade = document.createElement('input'); quantidade.type = 'number'; quantidade.min = '1'; quantidade.step = '1'; quantidade.required = true;
    quantidade.value = '1'; quantidade.setAttribute('aria-label', 'Quantidade a entregar');
    const unidades = document.createElement('div'); unidades.className = 'dsips-unit-picker hidden';
    const remover = document.createElement('button'); remover.type = 'button'; remover.className = 'app-button app-button-secondary'; remover.textContent = 'Remover material';
    const linha = { node, material, quantidade, unidades, requisicao: 0 };
    remover.addEventListener('click', () => { linhas = linhas.filter(item => item !== linha); node.remove(); });
    material.addEventListener('change', async () => {
      const item = dados.materiais?.find(item => item.id === material.value);
      const individualizado = item?.controle === 'individualizado';
      const atual = ++linha.requisicao; const token = revisao; const uid = obterUsuario()?.uid;
      quantidade.readOnly = individualizado; quantidade.value = individualizado ? '0' : '1';
      quantidade.max = String(dados.estoque?.find(posicao => posicao.materialId === material.value)?.disponivel || 0);
      unidades.classList.toggle('hidden', !individualizado); unidades.replaceChildren();
      if (!individualizado) return;
      unidades.appendChild(texto('p', 'Carregando identificações…'));
      try {
        const lista = await servicos.listarUnidades(item.id);
        if (atual !== linha.requisicao || token !== revisao || uid !== obterUsuario()?.uid || !node.isConnected) return;
        escolherUnidades(unidades, lista.filter(item => item.situacao === 'disponivel' && !item.cautelaId), () => { quantidade.value = String(selecionadas(unidades).length); });
      } catch (erro) {
        if (token === revisao && uid === obterUsuario()?.uid) { unidades.replaceChildren(texto('p', 'Falha ao carregar identificações. Selecione novamente o material.')); notificar(erro.message, 'erro'); }
      }
    });
    const grade = document.createElement('div'); grade.className = 'dsips-form-grid';
    const lMaterial = texto('label', 'Material'); lMaterial.appendChild(material);
    const lQuantidade = texto('label', 'Quantidade'); lQuantidade.appendChild(quantidade);
    grade.append(lMaterial, lQuantidade); node.append(grade, unidades, remover);
    porId('dsips-cautela-rows').appendChild(node); linhas.push(linha);
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
      if (filtro === 'pendentes' ? cautela.status === 'encerrada' : filtro !== 'todas' && cautela.status !== filtro) continue;
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
      const tipos = destino === 'dsips-cautelas' ? ['cautelas','materiais','estoque','responsaveis'] : ['cautelas'];
      const resultado = await Promise.all(tipos.map(async tipo => [tipo, await servicos.listar(tipo)]));
      if (token !== revisao || uid !== obterUsuario()?.uid) return false;
      dados = Object.fromEntries(resultado);
      if (destino === 'dsips-cautelas') {
        form.reset(); form.elements.responsavelId.replaceChildren(new Option('Selecione um responsável', ''));
        for (const pessoa of dados.responsaveis.filter(item => item.ativo !== false)) form.elements.responsavelId.add(new Option(`${pessoa.nome} · ${pessoa.matricula}`, pessoa.id));
        linhas = []; porId('dsips-cautela-rows').replaceChildren(); novaLinha(); renderizarCautelas();
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
      if (!await confirmar({ titulo: tipo === 'cautela' ? 'Confirmar entrega dos materiais?' : 'Confirmar devolução?', mensagem: 'Confira o responsável, os materiais e as quantidades. A operação atualizará o estoque e ficará registrada no histórico.', confirmarTexto: 'Confirmar registro' })) return;
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
      itens: linhas.map(linha => ({ materialId: linha.material.value, quantidade: Number(linha.quantidade.value), unidadeIds: selecionadas(linha.unidades) }))
    }, servicos.registrarCautela, form);
  });
  retorno.addEventListener('submit', evento => {
    evento.preventDefault(); if (!cautelaRetorno) return;
    const itens = linhasRetorno.filter(linha => Number(linha.q.value) > 0).map(linha => ({ materialId: linha.item.materialId, quantidade: Number(linha.q.value), unidadeIds: selecionadas(linha.unidades) }));
    if (!itens.length) { notificar('Informe ao menos um material que está retornando.', 'aviso'); return; }
    void gravar('devolucao', { cautelaId: cautelaRetorno.id, observacoes: retorno.elements.observacoes.value, itens }, servicos.registrarDevolucao, retorno);
  });
  porId('dsips-add-material').addEventListener('click', novaLinha);
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
  return { carregar, sairDaPagina() { ++revisao; pagina = ''; }, limpar() {
    ++revisao; pagina = ''; dados = {}; linhas = []; operacoes.clear(); cancelarRetorno(); form.reset(); status('');
    for (const id of ['dsips-cautela-rows','dsips-cautela-list','dsips-posse-list']) porId(id).replaceChildren();
  } };
}
