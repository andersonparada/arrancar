import { asc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type { ConceptoParaGasto, ConceptosParaGasto } from '../../aplicacion/puertos/puertos-de-opciones.js';

/** Los conceptos de gasto activos de la empresa, por nombre (lectura; RLS por empresa). */
export class ConceptosParaGastoDrizzle implements ConceptosParaGasto {
  listarActivos(): Promise<ConceptoParaGasto[]> {
    return transaccionEnCurso()
      .select({ id: conceptosDeGasto.id, nombre: conceptosDeGasto.nombre })
      .from(conceptosDeGasto)
      .where(eq(conceptosDeGasto.activo, true))
      .orderBy(asc(conceptosDeGasto.nombre));
  }
}
