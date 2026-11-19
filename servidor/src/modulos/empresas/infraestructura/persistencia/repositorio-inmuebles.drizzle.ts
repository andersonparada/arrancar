import { eq } from 'drizzle-orm';
import { RecursoEnUso } from '../../../core/compartido/aplicacion/errores.js';
import { interpretarErrorDePostgres } from '../../../core/compartido/infraestructura/errores-de-postgres.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { InmuebleEnUso } from '../../aplicacion/errores-de-inmueble.js';
import type { RepositorioInmuebles } from '../../aplicacion/puertos/repositorio-inmuebles.js';
import type { Inmueble, InmuebleId } from '../../dominio/inmueble.js';
import { mapeadorDeInmueble } from './inmueble.mapeador.js';
import { inmuebles } from './inmuebles.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioInmueblesDrizzle implements RepositorioInmuebles {
  async buscar(id: InmuebleId): Promise<Inmueble | null> {
    const [fila] = await transaccionEnCurso().select().from(inmuebles).where(eq(inmuebles.id, id.valor));
    return fila ? mapeadorDeInmueble.aEntidad(fila) : null;
  }

  async agregar(inmueble: Inmueble): Promise<void> {
    await transaccionEnCurso().insert(inmuebles).values(mapeadorDeInmueble.aFila(inmueble));
  }

  async guardar(inmueble: Inmueble): Promise<void> {
    await transaccionEnCurso()
      .update(inmuebles)
      .set(mapeadorDeInmueble.aFila(inmueble))
      .where(eq(inmuebles.id, inmueble.id.valor));
  }

  /** @throws InmuebleEnUso si algo lo usa: las llaves de Parcelas y Activos fijos hacia el inmueble son `no action`. */
  async eliminar(inmueble: Inmueble): Promise<void> {
    try {
      await transaccionEnCurso().delete(inmuebles).where(eq(inmuebles.id, inmueble.id.valor));
    } catch (error) {
      if (interpretarErrorDePostgres(error) instanceof RecursoEnUso) throw new InmuebleEnUso();
      throw error;
    }
  }
}
