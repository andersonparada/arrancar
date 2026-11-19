import { asc } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';

/**
 * Los conceptos de gasto del libro de compras que un artículo puede proponer a sus salidas a gasto (lectura de la
 * tabla de Libro de compras, permitida porque Inventarios depende de él). La seguridad por empresa (RLS) limita
 * lo que se ve.
 */
export class ConceptosParaArticulosDrizzle {
  listar(): Promise<{ id: string; nombre: string }[]> {
    return transaccionEnCurso()
      .select({ id: conceptosDeGasto.id, nombre: conceptosDeGasto.nombre })
      .from(conceptosDeGasto)
      .orderBy(asc(conceptosDeGasto.nombre));
  }
}
