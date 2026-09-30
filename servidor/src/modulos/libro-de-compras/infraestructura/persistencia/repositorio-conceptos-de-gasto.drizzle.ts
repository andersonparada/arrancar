import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioConceptosDeGasto } from '../../aplicacion/puertos/repositorio-conceptos-de-gasto.js';
import type { ConceptoDeGasto, ConceptoDeGastoId } from '../../dominio/concepto-de-gasto.js';
import { mapeadorDeConceptoDeGasto } from './concepto-de-gasto.mapeador.js';
import { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioConceptosDeGastoDrizzle implements RepositorioConceptosDeGasto {
  async buscar(id: ConceptoDeGastoId): Promise<ConceptoDeGasto | null> {
    const [fila] = await transaccionEnCurso().select().from(conceptosDeGasto).where(eq(conceptosDeGasto.id, id.valor));
    return fila ? mapeadorDeConceptoDeGasto.aEntidad(fila) : null;
  }

  async agregar(conceptoDeGasto: ConceptoDeGasto): Promise<void> {
    await transaccionEnCurso().insert(conceptosDeGasto).values(mapeadorDeConceptoDeGasto.aFila(conceptoDeGasto));
  }

  async guardar(conceptoDeGasto: ConceptoDeGasto): Promise<void> {
    await transaccionEnCurso()
      .update(conceptosDeGasto)
      .set(mapeadorDeConceptoDeGasto.aFila(conceptoDeGasto))
      .where(eq(conceptosDeGasto.id, conceptoDeGasto.id.valor));
  }
}
