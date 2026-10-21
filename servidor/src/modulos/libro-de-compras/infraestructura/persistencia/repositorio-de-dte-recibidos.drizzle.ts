import { and, asc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioDeDteRecibidos } from '../../aplicacion/puertos/repositorio-de-dte-recibidos.js';
import type { DteRecibido, DteRecibidoId } from '../../dominio/dte-recibido.js';
import { mapeadorDeDteRecibido } from './dte-recibido.mapeador.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDteRecibidosDrizzle implements RepositorioDeDteRecibidos {
  buscar(id: DteRecibidoId): Promise<DteRecibido | null> {
    return this.buscarDonde(eq(dteRecibidos.id, id.valor), false);
  }

  bloquear(id: DteRecibidoId): Promise<DteRecibido | null> {
    return this.buscarDonde(eq(dteRecibidos.id, id.valor), true);
  }

  async buscarVarias(ids: readonly string[]): Promise<DteRecibido[]> {
    if (ids.length === 0) return [];
    const filas = await transaccionEnCurso()
      .select()
      .from(dteRecibidos)
      .where(inArray(dteRecibidos.id, [...ids]))
      .orderBy(asc(dteRecibidos.fechaEmision), asc(dteRecibidos.serie), asc(dteRecibidos.numero));
    return filas.map((fila) => mapeadorDeDteRecibido.aEntidad(fila));
  }

  buscarPorAutorizacion(autorizacionFel: string, bloquear = false): Promise<DteRecibido | null> {
    return this.buscarDonde(eq(dteRecibidos.autorizacionFel, autorizacionFel), bloquear);
  }

  buscarPorDocumento(documentoId: string, bloquear = false): Promise<DteRecibido | null> {
    return this.buscarDonde(eq(dteRecibidos.documentoId, documentoId), bloquear);
  }

  async agregar(dte: DteRecibido): Promise<void> {
    await transaccionEnCurso().insert(dteRecibidos).values(mapeadorDeDteRecibido.aFila(dte));
  }

  async asignarProveedorALasPendientes(nitEmisor: string, proveedorId: string): Promise<void> {
    await transaccionEnCurso()
      .update(dteRecibidos)
      .set({ proveedorId })
      .where(
        and(
          eq(dteRecibidos.nitEmisor, nitEmisor),
          eq(dteRecibidos.estado, 'pendiente'),
          isNull(dteRecibidos.proveedorId),
        ),
      );
  }

  async guardar(dte: DteRecibido): Promise<void> {
    await transaccionEnCurso()
      .update(dteRecibidos)
      .set(mapeadorDeDteRecibido.aCambios(dte))
      .where(eq(dteRecibidos.id, dte.id.valor));
  }

  private async buscarDonde(condicion: SQL, bloquear: boolean): Promise<DteRecibido | null> {
    const consulta = transaccionEnCurso().select().from(dteRecibidos).where(condicion);
    const [fila] = await (bloquear ? consulta.for('update') : consulta);
    return fila ? mapeadorDeDteRecibido.aEntidad(fila) : null;
  }
}
