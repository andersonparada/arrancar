import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioCombustibles } from '../../aplicacion/puertos/repositorio-combustibles.js';
import type { Combustible, CombustibleId } from '../../dominio/combustible.js';
import { mapeadorDeCombustible } from './combustible.mapeador.js';
import { combustibles } from './combustibles.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioCombustiblesDrizzle implements RepositorioCombustibles {
  async buscar(id: CombustibleId): Promise<Combustible | null> {
    const [fila] = await transaccionEnCurso().select().from(combustibles).where(eq(combustibles.id, id.valor));
    return fila ? mapeadorDeCombustible.aEntidad(fila) : null;
  }

  async agregar(combustible: Combustible): Promise<void> {
    await transaccionEnCurso().insert(combustibles).values(mapeadorDeCombustible.aFila(combustible));
  }

  async guardar(combustible: Combustible): Promise<void> {
    await transaccionEnCurso()
      .update(combustibles)
      .set(mapeadorDeCombustible.aFila(combustible))
      .where(eq(combustibles.id, combustible.id.valor));
  }
}
