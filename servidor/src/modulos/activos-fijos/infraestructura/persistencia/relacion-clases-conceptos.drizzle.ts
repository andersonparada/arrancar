import { and, asc, eq, inArray } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type { ConceptoDeClaseDto } from '../../aplicacion/dto/concepto-de-clase.dto.js';
import type { RelacionClasesConceptos } from '../../aplicacion/puertos/relacion-clases-conceptos.js';
import { clasesPorConcepto } from './clases-por-concepto.tablas.js';

/** Las dos tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RelacionClasesConceptosDrizzle implements RelacionClasesConceptos {
  async deLaClase(claseId: string): Promise<ConceptoDeClaseDto[]> {
    return transaccionEnCurso()
      .select({
        conceptoDeGastoId: clasesPorConcepto.conceptoDeGastoId,
        nombre: conceptosDeGasto.nombre,
        claseId: clasesPorConcepto.claseId,
      })
      .from(clasesPorConcepto)
      .innerJoin(conceptosDeGasto, eq(conceptosDeGasto.id, clasesPorConcepto.conceptoDeGastoId))
      .where(eq(clasesPorConcepto.claseId, claseId))
      .orderBy(asc(conceptosDeGasto.nombre));
  }

  async actuales(conceptoIds: readonly string[]): Promise<ConceptoDeClaseDto[]> {
    if (conceptoIds.length === 0) return [];
    return transaccionEnCurso()
      .select({
        conceptoDeGastoId: conceptosDeGasto.id,
        nombre: conceptosDeGasto.nombre,
        claseId: clasesPorConcepto.claseId,
      })
      .from(conceptosDeGasto)
      .leftJoin(clasesPorConcepto, eq(clasesPorConcepto.conceptoDeGastoId, conceptosDeGasto.id))
      .where(inArray(conceptosDeGasto.id, [...conceptoIds]));
  }

  async poner(empresaId: string, claseId: string, conceptoIds: readonly string[]): Promise<void> {
    if (conceptoIds.length === 0) return;
    const filas = conceptoIds.map((conceptoDeGastoId) => ({ empresaId, conceptoDeGastoId, claseId }));
    await transaccionEnCurso()
      .insert(clasesPorConcepto)
      .values(filas)
      .onConflictDoUpdate({
        target: [clasesPorConcepto.empresaId, clasesPorConcepto.conceptoDeGastoId],
        set: { claseId },
      });
  }

  async quitar(claseId: string, conceptoIds: readonly string[]): Promise<void> {
    if (conceptoIds.length === 0) return;
    await transaccionEnCurso()
      .delete(clasesPorConcepto)
      .where(
        and(eq(clasesPorConcepto.claseId, claseId), inArray(clasesPorConcepto.conceptoDeGastoId, [...conceptoIds])),
      );
  }
}
