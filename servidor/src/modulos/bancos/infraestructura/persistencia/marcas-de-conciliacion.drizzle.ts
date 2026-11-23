import { and, desc, eq, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { finDelMesDe } from '../../dominio/conciliacion.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/** Fin de mes de la última conciliación autorizada de la cuenta; `null` si no tiene ninguna. */
export async function conciliadaHastaDe(cuentaBancariaId: string): Promise<string | null> {
  const [fila] = await transaccionEnCurso()
    .select({ anio: conciliaciones.anio, mes: conciliaciones.mes })
    .from(conciliaciones)
    .where(and(eq(conciliaciones.cuentaBancariaId, cuentaBancariaId), eq(conciliaciones.estado, 'autorizada')))
    .orderBy(desc(conciliaciones.anio), desc(conciliaciones.mes))
    .limit(1);
  return fila ? finDelMesDe(fila) : null;
}

/** Si el movimiento está marcado en una conciliación ya autorizada. */
export async function marcadoEnConciliacionAutorizadaDe(movimientoId: string): Promise<boolean> {
  const [fila] = await transaccionEnCurso()
    .select({ id: conciliaciones.id })
    .from(movimientos)
    .innerJoin(conciliaciones, eq(conciliaciones.id, movimientos.conciliacionId))
    .where(and(eq(movimientos.id, movimientoId), eq(conciliaciones.estado, 'autorizada')));
  return fila !== undefined;
}

/** Si el movimiento está marcado en la primera conciliación de su cuenta (ninguna de un mes anterior). */
export async function marcadoEnLaPrimeraConciliacionDe(movimientoId: string): Promise<boolean> {
  const [fila] = await transaccionEnCurso()
    .select({ id: conciliaciones.id })
    .from(movimientos)
    .innerJoin(conciliaciones, eq(conciliaciones.id, movimientos.conciliacionId))
    .where(
      and(
        eq(movimientos.id, movimientoId),
        sql`not exists (
          select 1 from ${conciliaciones} as anterior
          where anterior.cuenta_bancaria_id = ${conciliaciones.cuentaBancariaId}
            and make_date(anterior.anio, anterior.mes, 1) < make_date(${conciliaciones.anio}, ${conciliaciones.mes}, 1)
        )`,
      ),
    );
  return fila !== undefined;
}
