import { and, eq, gt, inArray } from 'drizzle-orm';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { PagoNuevo, RepositorioDePagos } from '../../aplicacion/puertos/puertos-de-pagos.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { pagos } from './pagos.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS). */
export class RepositorioDePagosDrizzle implements RepositorioDePagos {
  async agregar(pago: PagoNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    const { lineas, ...datos } = pago;
    const monto = lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);
    await transaccionEnCurso()
      .insert(pagos)
      .values({ ...datos, empresaId, monto: deCentavos(monto) });
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
