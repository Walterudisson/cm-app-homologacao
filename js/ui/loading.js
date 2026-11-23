/**
 * Feedback visual progressivo para consultas sem métricas de progresso.
 *
 * - Indica imediatamente a ocupação da região para tecnologias assistivas.
 * - Exibe skeleton apenas quando a consulta ultrapassa o atraso configurado.
 * - Uma consulta substituída ou encerrada não pode exibir um skeleton atrasado.
 * - Não manipula dados, permissões, cache ou serviços.
 */
export function criarIndicadorCarregamento({
  elemento,
  ocupado = elemento,
  atrasoMs = 160,
  podeExibir = () => true
} = {}) {
  if (!elemento) throw new Error('O elemento do indicador é obrigatório.');
  let temporizador = null;
  let geracao = 0;

  function ocultar() {
    elemento.hidden = true;
    elemento.classList.add('hidden');
  }
  function cancelarTemporizador() {
    if (temporizador !== null) {
      clearTimeout(temporizador);
      temporizador = null;
    }
  }
  function encerrar() {
    ++geracao;
    cancelarTemporizador();
    ocultar();
    ocupado?.setAttribute('aria-busy', 'false');
  }
  function iniciar() {
    const atual = ++geracao;
    cancelarTemporizador();
    ocultar();
    ocupado?.setAttribute('aria-busy', 'true');
    temporizador = setTimeout(() => {
      temporizador = null;
      if (atual !== geracao || !podeExibir()) return;
      elemento.hidden = false;
      elemento.classList.remove('hidden');
    }, Math.max(0, Number(atrasoMs) || 0));
  }
  ocultar();
  return { iniciar, encerrar };
}
