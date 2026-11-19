import { eq } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeGasto,
  AsignacionDeGasto,
  GastoDeDocumentoNuevo,
  GastoSinDocumentoNuevo,
  RepositorioDeGastos,
} from '../../aplicacion/puertos/puertos-de-gastos.js';
import type { Gasto } from '../../dominio/gastos.js';
import { gastos } from './gastos.tablas.js';

type Fila = typeof gastos.$inferSelect;

/** La fila de la base como el gasto del dominio (`cuenta_id` y la autoría se quedan fuera). */
export const aGasto = (fila: Fila): Gasto => ({
  id: fila.id,
  anticipoId: fila.anticipoId,
  clase: fila.clase,
  documentoDeCompraId: fila.documentoDeCompraId,
  resta: fila.resta,
  proveedorId: fila.proveedorId,
  fecha: fila.fecha,
  montoCentavos: aCentavos(fila.monto),
  montoRetenidoCentavos: aCentavos(fila.montoRetenido),
  conRetencion: fila.conRetencion,
  motivoConRetencion: fila.motivoConRetencion,
  conActivoFijo: fila.conActivoFijo,
  descripcion: fila.descripcion,
  pagadoA: fila.pagadoA,
  conceptoDeGastoId: fila.conceptoDeGastoId,
  motivoSinDocumento: fila.motivoSinDocumento,
  tratamientoSinDocumento: fila.tratamientoSinDocumento,
  sinBancarizar: fila.sinBancarizar,
  asignadoPor: fila.asignadoPor,
  asignadoEn: fila.asignadoEn?.toISOString() ?? null,
  estado: fila.estado,
  fechaDeAnulacion: fila.fechaDeAnulacion,
  motivoDeAnulacion: fila.motivoDeAnulacion,
});

/** Las tablas tienen seguridad por empresa (RLS); la unidad de trabajo pone la cuenta. */
export class RepositorioDeGastosDrizzle implements RepositorioDeGastos {
  async agregarDocumento({ montoCentavos, montoRetenidoCentavos, ...gasto }: GastoDeDocumentoNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(gastos)
      .values({
        ...gasto,
        empresaId,
        clase: 'documento',
        monto: deCentavos(montoCentavos),
        montoRetenido: deCentavos(montoRetenidoCentavos),
        conRetencion: montoRetenidoCentavos > 0,
      });
  }

  async agregarSinDocumento({ montoCentavos, tratamiento, ...gasto }: GastoSinDocumentoNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(gastos)
      .values({
        ...gasto,
        empresaId,
        clase: 'sin_documento',
        monto: deCentavos(montoCentavos),
        tratamientoSinDocumento: tratamiento,
        asignadoEn: new Date(),
      });
  }

  async buscar(id: string): Promise<Gasto | null> {
    const [fila] = await transaccionEnCurso().select().from(gastos).where(eq(gastos.id, id));
    return fila ? aGasto(fila) : null;
  }

  async bloquear(id: string): Promise<Gasto | null> {
    const [fila] = await transaccionEnCurso().select().from(gastos).where(eq(gastos.id, id)).for('update');
    return fila ? aGasto(fila) : null;
  }

  async delDocumento(documentoDeCompraId: string): Promise<Gasto | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(gastos)
      .where(eq(gastos.documentoDeCompraId, documentoDeCompraId));
    return fila ? aGasto(fila) : null;
  }

  async asignar(id: string, { asignadoPor, ...asignacion }: AsignacionDeGasto): Promise<void> {
    await transaccionEnCurso()
      .update(gastos)
      .set({ ...asignacion, asignadoPor, asignadoEn: new Date() })
      .where(eq(gastos.id, id));
  }

  async devolverALaBandeja(id: string, fechaDeEmision: string): Promise<void> {
    await transaccionEnCurso()
      .update(gastos)
      .set({
        anticipoId: null,
        asignadoEn: null,
        asignadoPor: null,
        motivoConRetencion: null,
        sinBancarizar: false,
        fecha: fechaDeEmision,
      })
      .where(eq(gastos.id, id));
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDeGasto): Promise<void> {
    await transaccionEnCurso()
      .update(gastos)
      .set({ estado: 'anulado', anuladoEn: new Date(), anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(gastos.id, id));
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(gastos).where(eq(gastos.id, id));
  }
}
