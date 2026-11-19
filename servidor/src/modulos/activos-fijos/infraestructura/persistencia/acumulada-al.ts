import { and, eq, lt, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { LibroDeDepreciacion } from '../../dominio/depreciacion/tramo.js';
import { cuotas } from './cuotas.tablas.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

export type AcumuladaPorLibro = Record<LibroDeDepreciacion, number>;

type PorActivo = Map<string, AcumuladaPorLibro>;

function sumar(porActivo: PorActivo, donde: { activoId: string; libro: LibroDeDepreciacion }, monto: number) {
  const acumulada = porActivo.get(donde.activoId) ?? { contable: 0, fiscal: 0 };
  acumulada[donde.libro] += monto;
  porActivo.set(donde.activoId, acumulada);
}

/** Lo que cada activo traía depreciado en sus dos libros al día de corte (saldos iniciales). */
async function sumarSaldosIniciales(porActivo: PorActivo): Promise<void> {
  const filas = await transaccionEnCurso()
    .select({
      activoId: saldosIniciales.activoId,
      contable: saldosIniciales.depreciacionAcumuladaContable,
      fiscal: saldosIniciales.depreciacionAcumuladaFiscal,
    })
    .from(saldosIniciales);
  for (const { activoId, contable, fiscal } of filas) {
    sumar(porActivo, { activoId, libro: 'contable' }, aCentavos(contable));
    sumar(porActivo, { activoId, libro: 'fiscal' }, aCentavos(fiscal));
  }
}

/** Lo que las cuotas vigentes anteriores al período depreciaron de cada activo y libro. */
async function sumarCuotas(porActivo: PorActivo, periodo: string): Promise<void> {
  const filas = await transaccionEnCurso()
    .select({ activoId: cuotas.activoId, libro: cuotas.libro, suma: sql<string>`sum(${cuotas.monto})` })
    .from(cuotas)
    .where(and(eq(cuotas.vigente, true), lt(cuotas.periodo, periodo)))
    .groupBy(cuotas.activoId, cuotas.libro);
  for (const { activoId, libro, suma } of filas) sumar(porActivo, { activoId, libro }, aCentavos(suma));
}

/**
 * `acumuladaAl` (§7.6) de todos los activos al cierre del mes anterior al período: la depreciación acumulada de su saldo
 * inicial (AF-6) más la suma de sus cuotas vigentes anteriores. Cuando existan las divisiones (AFI-5), se suman aquí las
 * acumuladas recibidas y se restan las cedidas: el cierre, las bajas y la ficha leen de este único lugar.
 */
export async function acumuladasAntesDe(periodo: string): Promise<Map<string, AcumuladaPorLibro>> {
  const porActivo: PorActivo = new Map();
  await sumarSaldosIniciales(porActivo);
  await sumarCuotas(porActivo, periodo);
  return porActivo;
}
