import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioChequeras } from '../../aplicacion/puertos/repositorio-chequeras.js';
import type { Chequera, ChequeraId } from '../../dominio/chequera.js';
import { chequeras } from './chequeras.tablas.js';
import { mapeadorDeChequera } from './chequera.mapeador.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioChequerasDrizzle implements RepositorioChequeras {
  async buscar(id: ChequeraId): Promise<Chequera | null> {
    const [fila] = await transaccionEnCurso().select().from(chequeras).where(eq(chequeras.id, id.valor));
    return fila ? mapeadorDeChequera.aEntidad(fila) : null;
  }

  async agregar(chequera: Chequera): Promise<void> {
    await transaccionEnCurso().insert(chequeras).values(mapeadorDeChequera.aFila(chequera));
  }

  async guardar(chequera: Chequera): Promise<void> {
    await transaccionEnCurso()
      .update(chequeras)
      .set(mapeadorDeChequera.aFila(chequera))
      .where(eq(chequeras.id, chequera.id.valor));
  }

  async rangosDeLaCuenta(cuentaBancariaId: string) {
    return transaccionEnCurso()
      .select({ serie: chequeras.serie, desde: chequeras.desde, hasta: chequeras.hasta })
      .from(chequeras)
      .where(eq(chequeras.cuentaBancariaId, cuentaBancariaId));
  }
}
