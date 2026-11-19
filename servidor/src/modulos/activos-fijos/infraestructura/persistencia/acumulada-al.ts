import { and, eq, lt, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { LibroDeDepreciacion } from '../../dominio/depreciacion/tramo.js';
import { cuotas } from './cuotas.tablas.js';

export type AcumuladaPorLibro = Record<LibroDeDepreciacion, number>;

/**
 * `acumuladaAl` (§7.6) de todos los activos al cierre del mes anterior al período: la suma de sus cuotas vigentes
 * anteriores. Cuando existan los saldos iniciales (AF-6) y las divisiones (AFI-5), se suman aquí las acumuladas de
 * saldo inicial y las recibidas, y se restan las cedidas: el cierre, las bajas y la ficha leen de este único lugar.
 */
export async function acumuladasAntesDe(periodo: string): Promise<Map<string, AcumuladaPorLibro>> {
  const filas = await transaccionEnCurso()
    .select({ activoId: cuotas.activoId, libro: cuotas.libro, suma: sql<string>`sum(${cuotas.monto})` })
    .from(cuotas)
    .where(and(eq(cuotas.vigente, true), lt(cuotas.periodo, periodo)))
    .groupBy(cuotas.activoId, cuotas.libro);
  const porActivo = new Map<string, AcumuladaPorLibro>();
  for (const { activoId, libro, suma } of filas) {
    const acumulada = porActivo.get(activoId) ?? { contable: 0, fiscal: 0 };
    acumulada[libro] = aCentavos(suma);
    porActivo.set(activoId, acumulada);
  }
  return porActivo;
}
