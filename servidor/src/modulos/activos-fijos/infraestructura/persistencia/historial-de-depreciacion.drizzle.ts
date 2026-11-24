import { and, eq, or, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  HistorialDeDepreciacion,
  LectorDeHistorialDeDepreciacion,
} from '../../aplicacion/puertos/historial-de-depreciacion.js';
import { cuotas } from './cuotas.tablas.js';
import { divisiones } from './divisiones.tablas.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

/** Lo que el saldo inicial del activo traía depreciado en cada libro. */
async function delSaldoInicial(activoId: string): Promise<HistorialDeDepreciacion['acumuladaCentavos']> {
  const [fila] = await transaccionEnCurso()
    .select({
      contable: saldosIniciales.depreciacionAcumuladaContable,
      fiscal: saldosIniciales.depreciacionAcumuladaFiscal,
    })
    .from(saldosIniciales)
    .where(eq(saldosIniciales.activoId, activoId));
  return { contable: fila ? aCentavos(fila.contable) : 0, fiscal: fila ? aCentavos(fila.fiscal) : 0 };
}

/** Lo que el activo recibió (activo nuevo) o cedió (origen) de depreciación acumulada en sus divisiones vigentes. */
async function delasDivisiones(activoId: string): Promise<HistorialDeDepreciacion['acumuladaCentavos']> {
  const filas = await transaccionEnCurso()
    .select({
      origenId: divisiones.activoOrigenId,
      contable: divisiones.acumuladaContableSeparada,
      fiscal: divisiones.acumuladaFiscalSeparada,
    })
    .from(divisiones)
    .where(
      and(
        eq(divisiones.estado, 'vigente'),
        or(eq(divisiones.activoOrigenId, activoId), eq(divisiones.activoNuevoId, activoId)),
      ),
    );
  const ajuste = { contable: 0, fiscal: 0 };
  for (const { origenId, contable, fiscal } of filas) {
    const signo = origenId === activoId ? -1 : 1;
    ajuste.contable += signo * aCentavos(contable);
    ajuste.fiscal += signo * aCentavos(fiscal);
  }
  return ajuste;
}

/** Lo depreciado de un activo en PostgreSQL; la seguridad por empresa (RLS) limita lo que se ve. */
export class HistorialDeDepreciacionDrizzle implements LectorDeHistorialDeDepreciacion {
  async deActivo(activoId: string): Promise<HistorialDeDepreciacion> {
    const filas = await transaccionEnCurso()
      .select({ tramoId: cuotas.tramoId, libro: cuotas.libro, suma: sql<string>`sum(${cuotas.monto})` })
      .from(cuotas)
      .where(and(eq(cuotas.activoId, activoId), eq(cuotas.vigente, true)))
      .groupBy(cuotas.tramoId, cuotas.libro);
    const acumuladaCentavos = await delSaldoInicial(activoId);
    const deDivisiones = await delasDivisiones(activoId);
    acumuladaCentavos.contable += deDivisiones.contable;
    acumuladaCentavos.fiscal += deDivisiones.fiscal;
    const depreciadoPorTramo = new Map<string, number>();
    for (const { tramoId, libro, suma } of filas) {
      depreciadoPorTramo.set(tramoId, aCentavos(suma));
      acumuladaCentavos[libro] += aCentavos(suma);
    }
    return { depreciadoPorTramo, acumuladaCentavos };
  }
}
