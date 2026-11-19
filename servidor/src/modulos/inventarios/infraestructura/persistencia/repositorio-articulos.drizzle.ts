import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioArticulos } from '../../aplicacion/puertos/repositorio-articulos.js';
import type { Articulo, ArticuloId } from '../../dominio/articulo.js';
import { mapeadorDeArticulo } from './articulo.mapeador.js';
import { articulos } from './articulos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioArticulosDrizzle implements RepositorioArticulos {
  async buscar(id: ArticuloId): Promise<Articulo | null> {
    const [fila] = await transaccionEnCurso().select().from(articulos).where(eq(articulos.id, id.valor));
    return fila ? mapeadorDeArticulo.aEntidad(fila) : null;
  }

  async agregar(articulo: Articulo): Promise<void> {
    await transaccionEnCurso().insert(articulos).values(mapeadorDeArticulo.aFila(articulo));
  }

  async guardar(articulo: Articulo): Promise<void> {
    await transaccionEnCurso()
      .update(articulos)
      .set(mapeadorDeArticulo.aFila(articulo))
      .where(eq(articulos.id, articulo.id.valor));
  }

  async eliminar(articulo: Articulo): Promise<void> {
    await transaccionEnCurso().delete(articulos).where(eq(articulos.id, articulo.id.valor));
  }
}
