import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioMovimientos } from '../../aplicacion/puertos/repositorio-movimientos.js';
import type { Movimiento, MovimientoId } from '../../dominio/movimiento.js';
import { mapeadorDeMovimiento } from './movimiento.mapeador.js';
import { movimientos } from './movimientos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioMovimientosDrizzle implements RepositorioMovimientos {
  async buscar(id: MovimientoId): Promise<Movimiento | null> {
    const [fila] = await transaccionEnCurso().select().from(movimientos).where(eq(movimientos.id, id.valor));
    return fila ? mapeadorDeMovimiento.aEntidad(fila) : null;
  }

  async agregar(movimiento: Movimiento): Promise<void> {
    await transaccionEnCurso().insert(movimientos).values(mapeadorDeMovimiento.aFila(movimiento));
  }

  async guardar(movimiento: Movimiento): Promise<void> {
    await transaccionEnCurso()
      .update(movimientos)
      .set(mapeadorDeMovimiento.aFila(movimiento))
      .where(eq(movimientos.id, movimiento.id.valor));
  }

  async eliminar(id: MovimientoId): Promise<void> {
    await transaccionEnCurso().delete(movimientos).where(eq(movimientos.id, id.valor));
  }
}
