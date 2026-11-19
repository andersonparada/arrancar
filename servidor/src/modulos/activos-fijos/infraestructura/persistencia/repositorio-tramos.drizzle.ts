import { and, asc, eq, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioTramos, TramosNuevos } from '../../aplicacion/puertos/repositorio-tramos.js';
import type { TramoCalculado } from '../../dominio/depreciacion/tramo.js';
import { cuotas } from './cuotas.tablas.js';
import { mapeadorDeTramo } from './tramo.mapeador.js';
import { tramos } from './tramos.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioTramosDrizzle implements RepositorioTramos {
  async agregarVarios({ empresaId, activoId, tramos: nuevos }: TramosNuevos): Promise<void> {
    if (nuevos.length === 0) return;
    await transaccionEnCurso()
      .insert(tramos)
      .values(nuevos.map((tramo) => mapeadorDeTramo.aFila(empresaId, activoId, tramo)));
  }

  async vigentesDeActivo(activoId: string): Promise<TramoCalculado[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(tramos)
      .where(and(eq(tramos.activoId, activoId), eq(tramos.vigente, true)))
      .orderBy(asc(tramos.desdePeriodo), asc(tramos.libro));
    return filas.map((fila) => mapeadorDeTramo.aTramo(fila));
  }

  /**
   * Los tramos que ninguna cuota señala se borran; los que una cuota de un mes reabierto aún señala (esa cuota se
   * conserva) dejan de ser vigentes en vez de borrarse.
   */
  async eliminarDeActivo(activoId: string): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion
      .delete(tramos)
      .where(
        and(
          eq(tramos.activoId, activoId),
          sql`not exists (select 1 from ${cuotas} where ${cuotas.tramoId} = ${tramos.id})`,
        ),
      );
    await transaccion
      .update(tramos)
      .set({ vigente: false })
      .where(and(eq(tramos.activoId, activoId), eq(tramos.vigente, true)));
  }
}
