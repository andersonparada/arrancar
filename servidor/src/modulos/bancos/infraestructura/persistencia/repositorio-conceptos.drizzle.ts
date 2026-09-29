import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioConceptos } from '../../aplicacion/puertos/repositorio-conceptos.js';
import type { Concepto, ConceptoId } from '../../dominio/concepto.js';
import { mapeadorDeConcepto } from './concepto.mapeador.js';
import { conceptos } from './conceptos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioConceptosDrizzle implements RepositorioConceptos {
  async buscar(id: ConceptoId): Promise<Concepto | null> {
    const [fila] = await transaccionEnCurso().select().from(conceptos).where(eq(conceptos.id, id.valor));
    return fila ? mapeadorDeConcepto.aEntidad(fila) : null;
  }

  async agregar(concepto: Concepto): Promise<void> {
    await transaccionEnCurso().insert(conceptos).values(mapeadorDeConcepto.aFila(concepto));
  }

  async guardar(concepto: Concepto): Promise<void> {
    await transaccionEnCurso()
      .update(conceptos)
      .set(mapeadorDeConcepto.aFila(concepto))
      .where(eq(conceptos.id, concepto.id.valor));
  }

  async eliminar(id: ConceptoId): Promise<void> {
    await transaccionEnCurso().delete(conceptos).where(eq(conceptos.id, id.valor));
  }

  async hayAlguno(): Promise<boolean> {
    const [fila] = await transaccionEnCurso().select({ id: conceptos.id }).from(conceptos).limit(1);
    return fila !== undefined;
  }

  async sembrar(nuevos: readonly Concepto[]): Promise<void> {
    if (nuevos.length === 0) return;
    const filas = nuevos.map((concepto) => mapeadorDeConcepto.aFila(concepto));
    await transaccionEnCurso().insert(conceptos).values(filas).onConflictDoNothing();
  }
}
