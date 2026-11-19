import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioBodegas } from '../../aplicacion/puertos/repositorio-bodegas.js';
import type { Bodega, BodegaId } from '../../dominio/bodega.js';
import { mapeadorDeBodega } from './bodega.mapeador.js';
import { bodegas } from './bodegas.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioBodegasDrizzle implements RepositorioBodegas {
  async buscar(id: BodegaId): Promise<Bodega | null> {
    const [fila] = await transaccionEnCurso().select().from(bodegas).where(eq(bodegas.id, id.valor));
    return fila ? mapeadorDeBodega.aEntidad(fila) : null;
  }

  async agregar(bodega: Bodega): Promise<void> {
    await transaccionEnCurso().insert(bodegas).values(mapeadorDeBodega.aFila(bodega));
  }

  async guardar(bodega: Bodega): Promise<void> {
    await transaccionEnCurso()
      .update(bodegas)
      .set(mapeadorDeBodega.aFila(bodega))
      .where(eq(bodegas.id, bodega.id.valor));
  }

  async eliminar(bodega: Bodega): Promise<void> {
    await transaccionEnCurso().delete(bodegas).where(eq(bodegas.id, bodega.id.valor));
  }
}
