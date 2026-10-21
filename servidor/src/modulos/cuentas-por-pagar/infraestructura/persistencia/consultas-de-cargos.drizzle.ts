import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDeCargos } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { CargoConSaldo } from '../../dominio/reparto-de-nota-de-credito.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { documentos } from './documentos.tablas.js';

/** Los cargos a los que se aplica una nota de crédito. La tabla tiene seguridad por empresa (RLS). */
export class ConsultasDeCargosDrizzle implements ConsultasDeCargos {
  async paraAplicarUnaNota(facturaDeCompraId: string): Promise<CargoConSaldo[]> {
    const transaccion = transaccionEnCurso();
    const vigente = ne(documentos.estado, 'anulado');
    const [factura] = await transaccion
      .select()
      .from(documentos)
      .where(and(eq(documentos.documentoId, facturaDeCompraId), vigente))
      .for('update');
    if (!factura) return [];
    const debitos = await transaccion
      .select()
      .from(documentos)
      .where(and(eq(documentos.documentoAfectadoId, facturaDeCompraId), eq(documentos.tipo, 'nota_de_debito'), vigente))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
    const cargos = [factura, ...debitos];
    const aplicado = await this.aplicadoPorCargo(cargos.map(({ id }) => id));
    return cargos.map((cargo) => ({
      id: cargo.id,
      saldoCentavos: aCentavos(cargo.total) - aCentavos(cargo.retenciones) - (aplicado.get(cargo.id) ?? 0),
    }));
  }

  /** Lo que las notas de crédito ya rebajaron de cada cargo, en centavos. */
  private async aplicadoPorCargo(cargoIds: string[]): Promise<Map<string, number>> {
    const filas = await transaccionEnCurso()
      .select({ cargoId: aplicacionesDeNotas.cargoId, monto: aplicacionesDeNotas.monto })
      .from(aplicacionesDeNotas)
      .where(inArray(aplicacionesDeNotas.cargoId, cargoIds));
    const total = new Map<string, number>();
    for (const { cargoId, monto } of filas) total.set(cargoId, (total.get(cargoId) ?? 0) + aCentavos(monto));
    return total;
  }
}
