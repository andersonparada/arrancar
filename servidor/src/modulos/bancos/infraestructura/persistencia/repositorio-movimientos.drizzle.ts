import { and, eq, notExists } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioMovimientos } from '../../aplicacion/puertos/repositorio-movimientos.js';
import type { Movimiento, MovimientoId } from '../../dominio/movimiento.js';
import { mapeadorDeMovimiento } from './movimiento.mapeador.js';
import { movimientos } from './movimientos.tablas.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioMovimientosDrizzle implements RepositorioMovimientos {
  async buscar(id: MovimientoId): Promise<Movimiento | null> {
    const [fila] = await transaccionEnCurso().select().from(movimientos).where(eq(movimientos.id, id.valor));
    return fila ? mapeadorDeMovimiento.aEntidad(fila) : null;
  }

  async buscarInversoDe(id: MovimientoId): Promise<Movimiento | null> {
    const [fila] = await transaccionEnCurso().select().from(movimientos).where(eq(movimientos.revierteAId, id.valor));
    return fila ? mapeadorDeMovimiento.aEntidad(fila) : null;
  }

  /**
   * Un saldo inicial (la única forma que hay hasta BS-2) nace como «global» y cuelga de la cabecera de su cuenta, que
   * se crea si falta: así cumple los checks de apertura de la `0034`.
   */
  async agregar(movimiento: Movimiento): Promise<void> {
    const fila = mapeadorDeMovimiento.aFila(movimiento);
    if (!fila.saldoInicial) {
      await transaccionEnCurso().insert(movimientos).values(fila);
      return;
    }
    const saldoInicialId = await this.cabeceraDeLaCuenta(fila.empresaId, fila.cuentaBancariaId);
    await transaccionEnCurso()
      .insert(movimientos)
      .values({ ...fila, parteDeApertura: 'saldo_global', saldoInicialId });
  }

  async guardar(movimiento: Movimiento): Promise<void> {
    await transaccionEnCurso()
      .update(movimientos)
      .set(mapeadorDeMovimiento.aFila(movimiento))
      .where(eq(movimientos.id, movimiento.id.valor));
  }

  /** Si era el último de su cabecera, la cabecera se va con él (una cabecera sin partidas no significa nada). */
  async eliminar(id: MovimientoId): Promise<void> {
    const tx = transaccionEnCurso();
    const [borrado] = await tx
      .delete(movimientos)
      .where(eq(movimientos.id, id.valor))
      .returning({ saldoInicialId: movimientos.saldoInicialId });
    if (!borrado?.saldoInicialId) return;
    const partidas = tx.select().from(movimientos).where(eq(movimientos.saldoInicialId, borrado.saldoInicialId));
    await tx.delete(saldosIniciales).where(and(eq(saldosIniciales.id, borrado.saldoInicialId), notExists(partidas)));
  }

  private async cabeceraDeLaCuenta(empresaId: string, cuentaBancariaId: string): Promise<string> {
    const [cabecera] = await transaccionEnCurso()
      .insert(saldosIniciales)
      .values({ empresaId, cuentaBancariaId })
      .onConflictDoUpdate({ target: saldosIniciales.cuentaBancariaId, set: { cuentaBancariaId } })
      .returning({ id: saldosIniciales.id });
    return cabecera!.id;
  }
}
