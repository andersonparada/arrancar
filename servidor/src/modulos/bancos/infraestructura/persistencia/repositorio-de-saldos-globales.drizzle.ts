import { and, eq, notExists } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { Movimiento, MovimientoId } from '../../dominio/movimiento.js';
import { mapeadorDeMovimiento } from './movimiento.mapeador.js';
import { movimientos } from './movimientos.tablas.js';
import { RepositorioMovimientosDrizzle } from './repositorio-movimientos.drizzle.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

/**
 * HEREDADO, hasta que el cliente use la pantalla nueva de saldos iniciales (BS-5): el cliente actual todavía registra
 * el saldo inicial «de antes» (un solo movimiento, sin partidas). Este repositorio lo guarda como `saldo_global`
 * colgado de la cabecera de su cuenta, que crea si falta, y se lleva la cabecera cuando se va su último movimiento.
 * Solo lo usan las rutas heredadas `/bancos/saldos-iniciales/global`.
 */
export class RepositorioDeMovimientosConSaldoGlobal extends RepositorioMovimientosDrizzle {
  override async agregar(movimiento: Movimiento): Promise<void> {
    const fila = mapeadorDeMovimiento.aFila(movimiento);
    if (!fila.saldoInicial) return super.agregar(movimiento);
    const saldoInicialId = await this.cabeceraDeLaCuenta(fila.empresaId, fila.cuentaBancariaId);
    await transaccionEnCurso()
      .insert(movimientos)
      .values({ ...fila, parteDeApertura: 'saldo_global', saldoInicialId });
  }

  override async eliminar(id: MovimientoId): Promise<void> {
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
