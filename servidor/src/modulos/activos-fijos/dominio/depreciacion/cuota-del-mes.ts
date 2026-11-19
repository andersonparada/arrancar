import { cuotaContableDelMes } from './libro-contable.js';
import { cuotaFiscalDelMes } from './libro-fiscal.js';
import { mesesEntre } from './meses.js';
import type { TramoCalculado } from './tramo.js';

/** El tramo que rige un mes: el de mayor `desdePeriodo` que no pase de él (§5.8); `undefined` si ninguno ha empezado. */
export function tramoQueRige<T extends Pick<TramoCalculado, 'desdePeriodo'>>(
  tramos: readonly T[],
  periodo: string,
): T | undefined {
  return tramos
    .filter((tramo) => tramo.desdePeriodo <= periodo)
    .sort((a, b) => b.desdePeriodo.localeCompare(a.desdePeriodo))
    .at(0);
}

export interface EntradaDeCuotaDelMes {
  tramo: TramoCalculado;
  periodo: string;
  /** Lo que las cuotas vigentes de este tramo ya depreciaron en los meses anteriores. */
  depreciadoDelTramoCentavos: number;
}

/**
 * La cuota que el tramo da en el mes (§7.2 y §7.3): la mensual sin pasar de lo que falta, y la última contable, todo
 * lo que falta. Nunca es negativa; sale cero si el tramo todavía no empieza o ya se agotó.
 */
export function cuotaDelTramoEnElMes({ tramo, periodo, depreciadoDelTramoCentavos }: EntradaDeCuotaDelMes): number {
  const mesDelTramo = mesesEntre(tramo.desdePeriodo, periodo) + 1;
  const pendienteCentavos = tramo.porDepreciarCentavos - depreciadoDelTramoCentavos;
  if (mesDelTramo < 1 || pendienteCentavos <= 0) return 0;
  const { cuotaMensualCentavos } = tramo;
  if (tramo.libro === 'fiscal') return cuotaFiscalDelMes({ cuotaMensualCentavos, pendienteCentavos });
  return cuotaContableDelMes({ cuotaMensualCentavos, meses: tramo.meses ?? 0, mesDelTramo, pendienteCentavos });
}
