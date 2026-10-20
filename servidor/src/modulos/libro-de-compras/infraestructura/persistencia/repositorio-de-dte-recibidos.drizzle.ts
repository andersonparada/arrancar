import { eq, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioDeDteRecibidos } from '../../aplicacion/puertos/repositorio-de-dte-recibidos.js';
import type { DteRecibido, DteRecibidoId } from '../../dominio/dte-recibido.js';
import { mapeadorDeDteRecibido } from './dte-recibido.mapeador.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDteRecibidosDrizzle implements RepositorioDeDteRecibidos {
  buscar(id: DteRecibidoId): Promise<DteRecibido | null> {
    return this.buscarDonde(eq(dteRecibidos.id, id.valor));
  }

  buscarPorAutorizacion(autorizacionFel: string): Promise<DteRecibido | null> {
    return this.buscarDonde(eq(dteRecibidos.autorizacionFel, autorizacionFel));
  }

  buscarPorDocumento(documentoId: string): Promise<DteRecibido | null> {
    return this.buscarDonde(eq(dteRecibidos.documentoId, documentoId));
  }

  async agregar(dte: DteRecibido): Promise<void> {
    await transaccionEnCurso().insert(dteRecibidos).values(mapeadorDeDteRecibido.aFila(dte));
  }

  async guardar(dte: DteRecibido): Promise<void> {
    await transaccionEnCurso()
      .update(dteRecibidos)
      .set(mapeadorDeDteRecibido.aCambios(dte))
      .where(eq(dteRecibidos.id, dte.id.valor));
  }

  private async buscarDonde(condicion: SQL): Promise<DteRecibido | null> {
    const [fila] = await transaccionEnCurso().select().from(dteRecibidos).where(condicion);
    return fila ? mapeadorDeDteRecibido.aEntidad(fila) : null;
  }
}
