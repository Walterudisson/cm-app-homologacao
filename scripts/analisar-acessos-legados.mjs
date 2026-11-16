import { readFile } from 'node:fs/promises';
import { analisarLoteLegado } from '../js/platform/access/legado.js';
const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith('--')) {
  process.stderr.write('Uso: node scripts/analisar-acessos-legados.mjs arquivo.json\nEntrada: { ambiente: "hml"|"prd", usuarios: [{ uid, ...dadosLegados }] }. Apenas lê e imprime análise.\n');
  process.exitCode = 1;
} else {
  try { process.stdout.write(JSON.stringify(analisarLoteLegado(JSON.parse(await readFile(args[0], 'utf8'))), null, 2)+'\n'); }
  catch (erro) { process.stderr.write('Análise interrompida: '+erro.message+'\n'); process.exitCode = 1; }
}
