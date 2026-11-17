// Timestamps do SDK e do transporte JSON das callables compartilham a mesma apresentação.
export function dataDoServidor(valor) {
  if (typeof valor?.toDate === 'function') return valor.toDate();
  const segundos = valor?.seconds ?? valor?._seconds;
  const nanos = valor?.nanoseconds ?? valor?._nanoseconds ?? 0;
  if (!Number.isFinite(segundos) || !Number.isFinite(nanos)) return null;
  const data = new Date(segundos * 1000 + nanos / 1e6);
  return Number.isFinite(data.getTime()) ? data : null;
}
export const milissegundosDoServidor = valor => dataDoServidor(valor)?.getTime() || 0;
