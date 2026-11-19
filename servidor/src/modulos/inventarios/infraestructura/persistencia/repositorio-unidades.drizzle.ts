import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioUnidades } from '../../aplicacion/puertos/repositorio-unidades.js';
import type { Unidad, UnidadId } from '../../dominio/unidad.js';
import { articulos } from './articulos.tablas.js';
import { conversiones } from './conversiones.tablas.js';
import { mapeadorDeUnidad } from './unidad.mapeador.js';
import { unidades } from './unidades.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioUnidadesDrizzle implements RepositorioUnidades {
  async buscar(id: UnidadId): Promise<Unidad | null> {
    const [fila] = await transaccionEnCurso().select().from(unidades).where(eq(unidades.id, id.valor));
    return fila ? mapeadorDeUnidad.aEntidad(fila) : null;
  }

  async agregar(unidad: Unidad): Promise<void> {
    await transaccionEnCurso().insert(unidades).values(mapeadorDeUnidad.aFila(unidad));
  }

  async guardar(unidad: Unidad): Promise<void> {
    await transaccionEnCurso()
      .update(unidades)
      .set(mapeadorDeUnidad.aFila(unidad))
      .where(eq(unidades.id, unidad.id.valor));
  }

  async eliminar(unidad: Unidad): Promise<void> {
    await transaccionEnCurso().delete(unidades).where(eq(unidades.id, unidad.id.valor));
  }

  async enUso(id: UnidadId): Promise<boolean> {
    const [comoBase] = await transaccionEnCurso()
      .select({ id: articulos.id })
      .from(articulos)
      .where(eq(articulos.unidadBaseId, id.valor))
      .limit(1);
    if (comoBase) return true;
    const [enConversion] = await transaccionEnCurso()
      .select({ articuloId: conversiones.articuloId })
      .from(conversiones)
      .where(eq(conversiones.unidadId, id.valor))
      .limit(1);
    return enConversion !== undefined;
  }

  async hayAlguna(): Promise<boolean> {
    const [fila] = await transaccionEnCurso().select({ id: unidades.id }).from(unidades).limit(1);
    return fila !== undefined;
  }

  async sembrar(nuevas: readonly Unidad[]): Promise<void> {
    if (nuevas.length === 0) return;
    const filas = nuevas.map((unidad) => mapeadorDeUnidad.aFila(unidad));
    await transaccionEnCurso().insert(unidades).values(filas).onConflictDoNothing();
  }
}
