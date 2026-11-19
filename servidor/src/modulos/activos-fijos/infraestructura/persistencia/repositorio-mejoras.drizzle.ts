import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioMejoras } from '../../aplicacion/puertos/repositorio-mejoras.js';
import type { Mejora, MejoraId } from '../../dominio/mejora.js';
import { mapeadorDeMejora } from './mejora.mapeador.js';
import { mejoras } from './mejoras.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioMejorasDrizzle implements RepositorioMejoras {
  async agregar(mejora: Mejora): Promise<void> {
    await transaccionEnCurso().insert(mejoras).values(mapeadorDeMejora.aFila(mejora));
  }

  async buscar(id: MejoraId): Promise<Mejora | null> {
    const [fila] = await transaccionEnCurso().select().from(mejoras).where(eq(mejoras.id, id.valor));
    return fila ? mapeadorDeMejora.aEntidad(fila) : null;
  }

  async guardar(mejora: Mejora): Promise<void> {
    await transaccionEnCurso()
      .update(mejoras)
      .set(mapeadorDeMejora.aFila(mejora))
      .where(eq(mejoras.id, mejora.id.valor));
  }
}
