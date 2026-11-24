import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioMediciones } from '../../aplicacion/puertos/mediciones.js';
import type { Medicion, MedicionId } from '../../dominio/medicion.js';
import { mapeadorDeMedicion } from './medicion.mapeador.js';
import { mediciones } from './mediciones.tablas.js';

/** La tabla tiene seguridad por empresa (RLS); el caso de uso carga antes la parcela, que sí lleva el alcance por localidad. */
export class RepositorioMedicionesDrizzle implements RepositorioMediciones {
  async buscar(id: MedicionId): Promise<Medicion | null> {
    const [fila] = await transaccionEnCurso().select().from(mediciones).where(eq(mediciones.id, id.valor));
    return fila ? mapeadorDeMedicion.aEntidad(fila) : null;
  }

  async agregar(medicion: Medicion): Promise<void> {
    await transaccionEnCurso().insert(mediciones).values(mapeadorDeMedicion.aFila(medicion));
  }

  async guardar(medicion: Medicion): Promise<void> {
    await transaccionEnCurso()
      .update(mediciones)
      .set(mapeadorDeMedicion.aFila(medicion))
      .where(eq(mediciones.id, medicion.id.valor));
  }

  async eliminarAnuladasDe(parcelaId: string): Promise<void> {
    await transaccionEnCurso()
      .delete(mediciones)
      .where(and(eq(mediciones.parcelaId, parcelaId), eq(mediciones.estado, 'anulada')));
  }
}
