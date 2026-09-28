import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioBancos } from '../../aplicacion/puertos/repositorio-bancos.js';
import type { Banco, BancoId } from '../../dominio/banco.js';
import { mapeadorDeBanco } from './banco.mapeador.js';
import { bancos } from './bancos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioBancosDrizzle implements RepositorioBancos {
  async buscar(id: BancoId): Promise<Banco | null> {
    const [fila] = await transaccionEnCurso().select().from(bancos).where(eq(bancos.id, id.valor));
    return fila ? mapeadorDeBanco.aEntidad(fila) : null;
  }

  async agregar(banco: Banco): Promise<void> {
    await transaccionEnCurso().insert(bancos).values(mapeadorDeBanco.aFila(banco));
  }

  async guardar(banco: Banco): Promise<void> {
    await transaccionEnCurso().update(bancos).set(mapeadorDeBanco.aFila(banco)).where(eq(bancos.id, banco.id.valor));
  }
}
