import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { TramoCalculado } from '../../dominio/depreciacion/tramo.js';
import type { tramos } from './tramos.tablas.js';

type Fila = typeof tramos.$inferSelect;

const centavosOpcional = (monto: string | null): number | null => (monto === null ? null : aCentavos(monto));
const montoOpcional = (centavos: number | null): string | null => (centavos === null ? null : deCentavos(centavos));

/** Traduce entre la fila (montos con dos decimales) y el tramo del dominio (centavos enteros). */
export const mapeadorDeTramo = {
  aTramo(fila: Fila): TramoCalculado {
    return {
      libro: fila.libro,
      desdePeriodo: fila.desdePeriodo,
      causa: fila.causa,
      porDepreciarCentavos: aCentavos(fila.porDepreciar),
      valorResidualCentavos: aCentavos(fila.valorResidual),
      meses: fila.meses,
      porcentaje: fila.porcentaje,
      baseDelPorcentajeCentavos: centavosOpcional(fila.baseDelPorcentaje),
      cuotaMensualCentavos: aCentavos(fila.cuotaMensual),
      excesoDeNotaDeCreditoCentavos: aCentavos(fila.excesoDeNotaDeCredito),
    };
  },

  aFila(empresaId: string, activoId: string, tramo: TramoCalculado): typeof tramos.$inferInsert {
    return {
      empresaId,
      activoId,
      libro: tramo.libro,
      desdePeriodo: tramo.desdePeriodo,
      causa: tramo.causa,
      porDepreciar: deCentavos(tramo.porDepreciarCentavos),
      valorResidual: deCentavos(tramo.valorResidualCentavos),
      meses: tramo.meses,
      porcentaje: tramo.porcentaje,
      baseDelPorcentaje: montoOpcional(tramo.baseDelPorcentajeCentavos),
      cuotaMensual: deCentavos(tramo.cuotaMensualCentavos),
      excesoDeNotaDeCredito: deCentavos(tramo.excesoDeNotaDeCreditoCentavos),
    };
  },
};
