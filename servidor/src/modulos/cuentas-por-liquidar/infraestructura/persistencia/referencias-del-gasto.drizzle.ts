import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type { ReferenciasDelGasto } from '../../aplicacion/puertos/puertos-de-gastos.js';

/** Lo que el gasto valida de otras tablas (lectura): los conceptos de gasto son de la empresa (RLS). */
export class ReferenciasDelGastoDrizzle implements ReferenciasDelGasto {
  async conceptoDeGastoActivo(conceptoId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: conceptosDeGasto.id })
      .from(conceptosDeGasto)
      .where(and(eq(conceptosDeGasto.id, conceptoId), eq(conceptosDeGasto.activo, true)));
    return fila !== undefined;
  }
}
