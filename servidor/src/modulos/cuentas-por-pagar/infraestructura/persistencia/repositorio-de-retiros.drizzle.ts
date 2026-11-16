import { eq, or } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeRetiro,
  LiquidacionDeRetiro,
  RepositorioDeRetiros,
  RetiroNuevo,
} from '../../aplicacion/puertos/puertos-de-retiros.js';
import type { RetiroDeEfectivo } from '../../dominio/retiros.js';
import { retirosDeEfectivo } from './retiros-de-efectivo.tablas.js';

/** La fila de la base como el retiro del dominio. */
export const aRetiro = (fila: typeof retirosDeEfectivo.$inferSelect): RetiroDeEfectivo => ({
  id: fila.id,
  numero: fila.numero,
  anioDeNumero: fila.anioDeNumero,
  forma: fila.forma,
  fecha: fila.fecha,
  montoCentavos: aCentavos(fila.monto),
  movimientoId: fila.movimientoId,
  custodio: fila.custodio,
  custodioUsuarioId: fila.custodioUsuarioId,
  observaciones: fila.observaciones,
  estado: fila.estado,
  fechaDeLiquidacion: fila.fechaDeLiquidacion,
  liquidadoPor: fila.liquidadoPor,
  devueltoCentavos: aCentavos(fila.devuelto),
  movimientoDeDevolucionId: fila.movimientoDeDevolucionId,
  faltanteCentavos: aCentavos(fila.faltante),
  motivoDeFaltante: fila.motivoDeFaltante,
  fechaDeAnulacion: fila.fechaDeAnulacion,
  motivoDeAnulacion: fila.motivoDeAnulacion,
});

/** Las tablas tienen seguridad por empresa (RLS). */
export class RepositorioDeRetirosDrizzle implements RepositorioDeRetiros {
  async agregar({ montoCentavos, ...retiro }: RetiroNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(retirosDeEfectivo)
      .values({ ...retiro, empresaId, monto: deCentavos(montoCentavos) });
  }

  async buscar(id: string): Promise<RetiroDeEfectivo | null> {
    const [fila] = await transaccionEnCurso().select().from(retirosDeEfectivo).where(eq(retirosDeEfectivo.id, id));
    return fila ? aRetiro(fila) : null;
  }

  async bloquear(id: string): Promise<RetiroDeEfectivo | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(retirosDeEfectivo)
      .where(eq(retirosDeEfectivo.id, id))
      .for('update');
    return fila ? aRetiro(fila) : null;
  }

  async delMovimiento(movimientoId: string): Promise<RetiroDeEfectivo | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(retirosDeEfectivo)
      .where(
        or(
          eq(retirosDeEfectivo.movimientoId, movimientoId),
          eq(retirosDeEfectivo.movimientoDeDevolucionId, movimientoId),
        ),
      );
    return fila ? aRetiro(fila) : null;
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDeRetiro): Promise<void> {
    await transaccionEnCurso()
      .update(retirosDeEfectivo)
      .set({ estado: 'anulado', anuladoEn: new Date(), anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(retirosDeEfectivo.id, id));
  }

  async liquidar(id: string, liquidacion: LiquidacionDeRetiro): Promise<void> {
    await transaccionEnCurso()
      .update(retirosDeEfectivo)
      .set({
        estado: 'liquidado',
        fechaDeLiquidacion: liquidacion.fechaDeLiquidacion,
        liquidadoEn: new Date(),
        liquidadoPor: liquidacion.liquidadoPor,
        devuelto: deCentavos(liquidacion.devueltoCentavos),
        movimientoDeDevolucionId: liquidacion.movimientoDeDevolucionId,
        faltante: deCentavos(liquidacion.faltanteCentavos),
        motivoDeFaltante: liquidacion.motivoDeFaltante,
      })
      .where(eq(retirosDeEfectivo.id, id));
  }

  async reabrir(id: string): Promise<void> {
    await transaccionEnCurso()
      .update(retirosDeEfectivo)
      .set({
        estado: 'abierto',
        fechaDeLiquidacion: null,
        liquidadoEn: null,
        liquidadoPor: null,
        devuelto: '0',
        movimientoDeDevolucionId: null,
        faltante: '0',
        motivoDeFaltante: null,
      })
      .where(eq(retirosDeEfectivo.id, id));
  }
}
