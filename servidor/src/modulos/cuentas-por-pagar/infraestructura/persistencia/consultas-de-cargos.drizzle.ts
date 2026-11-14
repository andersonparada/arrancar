import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDeCargos } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { CargoConSaldo } from '../../dominio/reparto-de-nota-de-credito.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { documentos } from './documentos.tablas.js';

/** Lo que se le paga al proveedor: el saldo al inicio de un saldo inicial, o el total menos las retenciones. */
const netoDelCargo = (cargo: typeof documentos.$inferSelect): number =>
  cargo.saldoAlInicio === null ? aCentavos(cargo.total) - aCentavos(cargo.retenciones) : aCentavos(cargo.saldoAlInicio);

/** Los cargos a los que se aplica una nota de crédito. La tabla tiene seguridad por empresa (RLS). */
export class ConsultasDeCargosDrizzle implements ConsultasDeCargos {
  async paraAplicarUnaNota(facturaId: string): Promise<CargoConSaldo[]> {
    const transaccion = transaccionEnCurso();
    const vigente = ne(documentos.estado, 'anulado');
    const [factura] = await transaccion
      .select()
      .from(documentos)
      .where(and(eq(documentos.id, facturaId), vigente))
      .for('update');
    if (!factura) return [];
    const debitos = await transaccion
      .select()
      .from(documentos)
      .where(and(eq(documentos.documentoAfectadoId, facturaId), eq(documentos.tipo, 'nota_de_debito'), vigente))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
    const cargos = [factura, ...debitos];
    const aplicado = await this.rebajadoPorCargo(cargos.map(({ id }) => id));
    return cargos.map((cargo) => ({
      id: cargo.id,
      saldoCentavos: netoDelCargo(cargo) - (aplicado.get(cargo.id) ?? 0),
    }));
  }

  /** Lo que ya rebajaron de cada cargo las notas de crédito, los pagos vigentes y los ajustes vigentes, en centavos. */
  private async rebajadoPorCargo(cargoIds: string[]): Promise<Map<string, number>> {
    const transaccion = transaccionEnCurso();
    const filas = [
      ...(await transaccion
        .select({ cargoId: aplicacionesDeNotas.cargoId, monto: aplicacionesDeNotas.monto })
        .from(aplicacionesDeNotas)
        .where(inArray(aplicacionesDeNotas.cargoId, cargoIds))),
      ...(await transaccion
        .select({ cargoId: aplicacionesDePagos.cargoId, monto: aplicacionesDePagos.monto })
        .from(aplicacionesDePagos)
        .where(and(inArray(aplicacionesDePagos.cargoId, cargoIds), eq(aplicacionesDePagos.vigente, true)))),
      ...(await transaccion
        .select({ cargoId: ajustesDeSaldo.documentoId, monto: ajustesDeSaldo.monto })
        .from(ajustesDeSaldo)
        .where(and(inArray(ajustesDeSaldo.documentoId, cargoIds), eq(ajustesDeSaldo.estado, 'vigente')))),
    ];
    const total = new Map<string, number>();
    for (const { cargoId, monto } of filas) total.set(cargoId, (total.get(cargoId) ?? 0) + aCentavos(monto));
    return total;
  }
}
