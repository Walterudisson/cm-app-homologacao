// Adaptador temporário: os serviços existentes são injetados pelo ponto de entrada.
// A plataforma não conhece Firestore, ciclos de inventário ou a fila patrimonial.
export function criarCarregadorPatrimonios(servicos) {
  const carregadores = Object.freeze({
    dashboard: () => servicos.carregarDashboard(),
    scanner: () => servicos.carregarCatalogoDivisoes(),
    lista: () => servicos.carregarRelacaoPatrimonial(),
    transferencias: () => {
      if (!servicos.temOuvinteTransferencias()) servicos.iniciarOuvinteTransferencias();
    },
    inventarios: async () => {
      await servicos.carregarCatalogoDivisoes();
      await Promise.all([
        servicos.carregarProgressoInventarios(),
        servicos.carregarHistoricoInventarios(),
        servicos.carregarHistoricoGeral()
      ]);
      if (servicos.obterUsuario()?.perfil !== 'conferente') {
        await servicos.atualizarEstadoDivisaoInventario();
      }
    }
  });

  return async pagina => {
    if (!Object.hasOwn(carregadores, pagina)) return false;
    await carregadores[pagina]();
    return true;
  };
}
