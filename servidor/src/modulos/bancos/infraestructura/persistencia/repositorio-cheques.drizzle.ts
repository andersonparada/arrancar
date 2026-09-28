import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioCheques } from '../../aplicacion/puertos/repositorio-cheques.js';
import type { Cheque, ChequeId } from '../../dominio/cheque.js';
import { mapeadorDeCheque } from './cheque.mapeador.js';
import { cheques } from './cheques.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioChequesDrizzle implements RepositorioCheques {
  async buscar(id: ChequeId): Promise<Cheque | null> {
    const [fila] = await transaccionEnCurso().select().from(cheques).where(eq(cheques.id, id.valor));
    return fila ? mapeadorDeCheque.aEntidad(fila) : null;
  }

  /** Inserción masiva: una sola sentencia para toda la chequera (hasta el máximo configurado). */
  async agregarVarios(varios: Cheque[]): Promise<void> {
    if (varios.length === 0) return;
    await transaccionEnCurso().insert(cheques).values(varios.map(mapeadorDeCheque.aFila));
  }

  async guardar(cheque: Cheque): Promise<void> {
    await transaccionEnCurso()
      .update(cheques)
      .set(mapeadorDeCheque.aFila(cheque))
      .where(eq(cheques.id, cheque.id.valor));
  }
}
