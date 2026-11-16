import { and, asc, eq, gt, inArray, sql, type SQL } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { LigadoAUnaNota } from '../../aplicacion/puertos/puertos-de-notas-para-ligar.js';
import type {
  AnulacionDePago,
  LineaDePagoNueva,
  PagoNuevo,
  RepositorioDePagos,
} from '../../aplicacion/puertos/puertos-de-pagos.js';
import type { LineaGuardadaDePago, PagoConLineas } from '../../dominio/pago-con-lineas.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { documentos } from './documentos.tablas.js';
import { pagos } from './pagos.tablas.js';

const aLinea = (fila: typeof aplicacionesDePagos.$inferSelect): LineaGuardadaDePago => ({
  cargoId: fila.cargoId,
  contrasenaId: fila.contrasenaId,
  montoCentavos: aCentavos(fila.monto),
  retencionDescontadaCentavos: aCentavos(fila.retencionDescontada),
});

const aPago = (
  fila: typeof pagos.$inferSelect,
  lineas: Array<typeof aplicacionesDePagos.$inferSelect>,
): PagoConLineas => ({
  id: fila.id,
  proveedorId: fila.proveedorId,
  numero: fila.numero,
  anioDeNumero: fila.anioDeNumero,
  forma: fila.forma,
  fecha: fila.fecha,
  montoCentavos: aCentavos(fila.monto),
  movimientoId: fila.movimientoId,
  retiroId: fila.retiroId,
  observaciones: fila.observaciones,
  motivo: fila.motivo,
  conCargaCerrada: fila.conCargaCerrada,
  estado: fila.estado,
  fechaDeAnulacion: fila.fechaDeAnulacion,
  motivoDeAnulacion: fila.motivoDeAnulacion,
  lineas: lineas.map(aLinea),
});

/** Las tablas tienen seguridad por empresa (RLS). */
export class RepositorioDePagosDrizzle implements RepositorioDePagos {
  async agregar(pago: PagoNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    const { lineas, ...datos } = pago;
    const monto = lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);
    await transaccionEnCurso()
      .insert(pagos)
      .values({ ...datos, empresaId, monto: deCentavos(monto) });
    await this.insertarLineas(pago, lineas);
  }

  async reemplazarLineas(pago: Pick<PagoConLineas, 'id' | 'proveedorId'>, lineas: LineaDePagoNueva[]): Promise<void> {
    await transaccionEnCurso().delete(aplicacionesDePagos).where(eq(aplicacionesDePagos.pagoId, pago.id));
    await this.insertarLineas({ id: pago.id, proveedorId: pago.proveedorId }, lineas);
  }

  private async insertarLineas(
    pago: Pick<PagoConLineas, 'id' | 'proveedorId'>,
    lineas: LineaDePagoNueva[],
  ): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(aplicacionesDePagos)
      .values(
        lineas.map((linea) => ({
          empresaId,
          proveedorId: pago.proveedorId,
          pagoId: pago.id,
          contrasenaId: linea.contrasenaId,
          cargoId: linea.cargoId,
          monto: deCentavos(linea.montoCentavos),
          retencionDescontada: deCentavos(linea.retencionDescontadaCentavos),
        })),
      );
  }

  buscar(id: string): Promise<PagoConLineas | null> {
    return this.leer(eq(pagos.id, id), false).then(([pago]) => pago ?? null);
  }

  bloquear(id: string): Promise<PagoConLineas | null> {
    return this.leer(eq(pagos.id, id), true).then(([pago]) => pago ?? null);
  }

  async ligadoAlMovimiento(movimientoId: string): Promise<LigadoAUnaNota> {
    const [fila] = await transaccionEnCurso()
      .select({
        total: sql<string>`coalesce(sum(${aplicacionesDePagos.monto}), 0)::text`,
        deActivo: sql<string>`coalesce(sum(${aplicacionesDePagos.monto}) filter (where ${documentos.tieneActivoFijo}), 0)::text`,
      })
      .from(aplicacionesDePagos)
      .innerJoin(pagos, eq(pagos.id, aplicacionesDePagos.pagoId))
      .innerJoin(documentos, eq(documentos.id, aplicacionesDePagos.cargoId))
      .where(
        and(
          eq(pagos.movimientoId, movimientoId),
          eq(pagos.forma, 'nota_ligada'),
          eq(pagos.estado, 'vigente'),
          eq(aplicacionesDePagos.vigente, true),
        ),
      );
    return { totalCentavos: aCentavos(fila!.total), deActivoCentavos: aCentavos(fila!.deActivo) };
  }

  delMovimiento(movimientoId: string): Promise<PagoConLineas[]> {
    return this.leer(eq(pagos.movimientoId, movimientoId), false);
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDePago): Promise<void> {
    await transaccionEnCurso()
      .update(pagos)
      .set({ estado: 'anulado', anuladoEn: new Date(), anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(pagos.id, id));
    await transaccionEnCurso()
      .update(aplicacionesDePagos)
      .set({ vigente: false })
      .where(eq(aplicacionesDePagos.pagoId, id));
  }

  /** Los pagos que cumplen la condición, con sus líneas; con `bloquear`, deja sus filas para este caso de uso. */
  private async leer(condicion: SQL, bloquear: boolean): Promise<PagoConLineas[]> {
    const consulta = transaccionEnCurso().select().from(pagos).where(condicion).orderBy(asc(pagos.id));
    const filas = await (bloquear ? consulta.for('update') : consulta);
    if (filas.length === 0) return [];
    const lineas = await transaccionEnCurso()
      .select()
      .from(aplicacionesDePagos)
      .where(
        inArray(
          aplicacionesDePagos.pagoId,
          filas.map(({ id }) => id),
        ),
      )
      .orderBy(asc(aplicacionesDePagos.cargoId));
    return filas.map((fila) =>
      aPago(
        fila,
        lineas.filter(({ pagoId }) => pagoId === fila.id),
      ),
    );
  }

  async conRetencionYaDescontada(cargoIds: readonly string[]): Promise<Set<string>> {
    if (cargoIds.length === 0) return new Set();
    const filas = await transaccionEnCurso()
      .select({ cargoId: aplicacionesDePagos.cargoId })
      .from(aplicacionesDePagos)
      .where(
        and(
          inArray(aplicacionesDePagos.cargoId, [...cargoIds]),
          eq(aplicacionesDePagos.vigente, true),
          gt(aplicacionesDePagos.retencionDescontada, '0'),
        ),
      );
    return new Set(filas.map(({ cargoId }) => cargoId));
  }
}
