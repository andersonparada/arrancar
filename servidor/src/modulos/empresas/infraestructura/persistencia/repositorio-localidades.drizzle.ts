import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioLocalidades } from '../../aplicacion/puertos/repositorio-localidades.js';
import type { Localidad, LocalidadId } from '../../dominio/localidad.js';
import { mapeadorDeLocalidad } from './localidad.mapeador.js';
import { localidades } from './localidades.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioLocalidadesDrizzle implements RepositorioLocalidades {
  async buscar(id: LocalidadId): Promise<Localidad | null> {
    const [fila] = await transaccionEnCurso().select().from(localidades).where(eq(localidades.id, id.valor));
    return fila ? mapeadorDeLocalidad.aEntidad(fila) : null;
  }

  async agregar(localidad: Localidad): Promise<void> {
    await transaccionEnCurso().insert(localidades).values(mapeadorDeLocalidad.aFila(localidad));
  }

  async guardar(localidad: Localidad): Promise<void> {
    await transaccionEnCurso()
      .update(localidades)
      .set(mapeadorDeLocalidad.aFila(localidad))
      .where(eq(localidades.id, localidad.id.valor));
  }

  async eliminar(localidad: Localidad): Promise<void> {
    await transaccionEnCurso().delete(localidades).where(eq(localidades.id, localidad.id.valor));
  }
}
