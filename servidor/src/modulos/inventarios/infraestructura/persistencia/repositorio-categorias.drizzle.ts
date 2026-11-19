import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioCategorias } from '../../aplicacion/puertos/repositorio-categorias.js';
import type { Categoria, CategoriaId } from '../../dominio/categoria.js';
import { articulos } from './articulos.tablas.js';
import { mapeadorDeCategoria } from './categoria.mapeador.js';
import { categorias } from './categorias.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioCategoriasDrizzle implements RepositorioCategorias {
  async buscar(id: CategoriaId): Promise<Categoria | null> {
    const [fila] = await transaccionEnCurso().select().from(categorias).where(eq(categorias.id, id.valor));
    return fila ? mapeadorDeCategoria.aEntidad(fila) : null;
  }

  async agregar(categoria: Categoria): Promise<void> {
    await transaccionEnCurso().insert(categorias).values(mapeadorDeCategoria.aFila(categoria));
  }

  async guardar(categoria: Categoria): Promise<void> {
    await transaccionEnCurso()
      .update(categorias)
      .set(mapeadorDeCategoria.aFila(categoria))
      .where(eq(categorias.id, categoria.id.valor));
  }

  async eliminar(categoria: Categoria): Promise<void> {
    await transaccionEnCurso().delete(categorias).where(eq(categorias.id, categoria.id.valor));
  }

  async enUso(id: CategoriaId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: articulos.id })
      .from(articulos)
      .where(eq(articulos.categoriaId, id.valor))
      .limit(1);
    return fila !== undefined;
  }
}
