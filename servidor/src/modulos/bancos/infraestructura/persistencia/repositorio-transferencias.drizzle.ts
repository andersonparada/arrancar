import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioTransferencias } from '../../aplicacion/puertos/repositorio-transferencias.js';
import type { Transferencia, TransferenciaId } from '../../dominio/transferencia.js';
import { mapeadorDeTransferencia } from './transferencia.mapeador.js';
import { transferencias } from './transferencias.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioTransferenciasDrizzle implements RepositorioTransferencias {
  async buscar(id: TransferenciaId): Promise<Transferencia | null> {
    const [fila] = await transaccionEnCurso().select().from(transferencias).where(eq(transferencias.id, id.valor));
    return fila ? mapeadorDeTransferencia.aEntidad(fila) : null;
  }

  async agregar(transferencia: Transferencia): Promise<void> {
    await transaccionEnCurso().insert(transferencias).values(mapeadorDeTransferencia.aFila(transferencia));
  }

  async guardar(transferencia: Transferencia): Promise<void> {
    await transaccionEnCurso()
      .update(transferencias)
      .set(mapeadorDeTransferencia.aFila(transferencia))
      .where(eq(transferencias.id, transferencia.id.valor));
  }
}
