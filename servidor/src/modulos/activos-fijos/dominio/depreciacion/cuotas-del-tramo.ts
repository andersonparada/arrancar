import { cuotaContableDelMes } from './libro-contable.js';
import { cuotaFiscalDelMes } from './libro-fiscal.js';
import type { TramoCalculado } from './tramo.js';

/** Tope de meses que se recorren (un porcentaje de 0,01 % no termina nunca): 200 años. */
const MESES_MAXIMOS = 2400;

function cuotaDelMes(tramo: TramoCalculado, mesDelTramo: number, pendienteCentavos: number): number {
  const { cuotaMensualCentavos } = tramo;
  if (tramo.libro === 'fiscal') return cuotaFiscalDelMes({ cuotaMensualCentavos, pendienteCentavos });
  return cuotaContableDelMes({ cuotaMensualCentavos, meses: tramo.meses ?? 0, mesDelTramo, pendienteCentavos });
}

/**
 * Todas las cuotas que daría el tramo, mes a mes desde su primer mes, hasta agotar lo que falta por depreciar. El
 * cierre mensual las irá calculando una por una; aquí salen juntas para revisar el cálculo completo.
 */
export function cuotasDelTramo(tramo: TramoCalculado): number[] {
  const cuotas: number[] = [];
  let pendiente = tramo.porDepreciarCentavos;
  const limite = tramo.meses ?? MESES_MAXIMOS;
  for (let mes = 1; mes <= limite && pendiente > 0; mes++) {
    const cuota = cuotaDelMes(tramo, mes, pendiente);
    cuotas.push(cuota);
    pendiente -= cuota;
  }
  return cuotas;
}
