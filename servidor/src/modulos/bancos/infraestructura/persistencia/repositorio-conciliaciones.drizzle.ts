import { and, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  RepositorioConciliaciones,
  ResumenDeLaUltimaConciliacion,
} from '../../aplicacion/puertos/repositorio-conciliaciones.js';
import type { Conciliacion, ConciliacionId } from '../../dominio/conciliacion.js';
import { mapeadorDeConciliacion } from './conciliacion.mapeador.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioConciliacionesDrizzle implements RepositorioConciliaciones {
  async buscar(id: ConciliacionId): Promise<Conciliacion | null> {
    const [fila] = await transaccionEnCurso().select().from(conciliaciones).where(eq(conciliaciones.id, id.valor));
    return fila ? mapeadorDeConciliacion.aEntidad(fila) : null;
  }

  async agregar(conciliacion: Conciliacion): Promise<void> {
    await transaccionEnCurso().insert(conciliaciones).values(mapeadorDeConciliacion.aFila(conciliacion));
  }

  async guardar(conciliacion: Conciliacion): Promise<void> {
    await transaccionEnCurso()
      .update(conciliaciones)
      .set(mapeadorDeConciliacion.aFila(conciliacion))
      .where(eq(conciliaciones.id, conciliacion.id.valor));
  }

  async eliminar(id: ConciliacionId): Promise<void> {
    await transaccionEnCurso().delete(conciliaciones).where(eq(conciliaciones.id, id.valor));
  }

  async ultimaDeLaCuenta(cuentaBancariaId: string): Promise<ResumenDeLaUltimaConciliacion | null> {
    const [fila] = await transaccionEnCurso()
      .select({
        id: conciliaciones.id,
        anio: conciliaciones.anio,
        mes: conciliaciones.mes,
        estado: conciliaciones.estado,
      })
      .from(conciliaciones)
      .where(eq(conciliaciones.cuentaBancariaId, cuentaBancariaId))
      .orderBy(desc(conciliaciones.anio), desc(conciliaciones.mes))
      .limit(1);
    return fila
      ? {
          id: fila.id,
          anio: fila.anio,
          mes: fila.mes,
          estado: fila.estado as 'en_proceso' | 'elaborada' | 'autorizada',
        }
      : null;
  }

  async guardarMarcas(conciliacionId: string, movimientoIds: string[]): Promise<void> {
    const transaccion = transaccionEnCurso();
    if (movimientoIds.length > 0) {
      await transaccion.update(movimientos).set({ conciliacionId }).where(inArray(movimientos.id, movimientoIds));
    }
    await transaccion
      .update(movimientos)
      .set({ conciliacionId: null })
      .where(
        and(
          eq(movimientos.conciliacionId, conciliacionId),
          movimientoIds.length > 0 ? notInArray(movimientos.id, movimientoIds) : undefined,
        ),
      );
  }
}
