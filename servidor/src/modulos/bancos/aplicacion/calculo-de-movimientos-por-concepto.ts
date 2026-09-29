import { aCentavos, deCentavos } from '../dominio/centavos.js';
import type {
  ConceptoDelReporteDto,
  ReporteDeMovimientosPorConceptoDto,
  TotalesDeUnConcepto,
} from './dto/reportes-por-concepto.dto.js';

const aConcepto = (totales: TotalesDeUnConcepto): ConceptoDelReporteDto => ({
  conceptoId: totales.conceptoId,
  conceptoNombre: totales.conceptoNombre,
  esDeSistema: totales.claveDeSistema !== null,
  entradas: totales.entradas,
  salidas: totales.salidas,
  neto: deCentavos(aCentavos(totales.entradas) - aCentavos(totales.salidas)),
  cantidad: totales.cantidad,
  cantidadDeInversos: totales.cantidadDeInversos,
});

/** Los conceptos por nombre y el gran total, sumado en centavos enteros. */
export function armarMovimientosPorConcepto(
  totales: readonly TotalesDeUnConcepto[],
  marco: Pick<ReporteDeMovimientosPorConceptoDto, 'desde' | 'hasta' | 'cuentaBancariaId'>,
): ReporteDeMovimientosPorConceptoDto {
  const conceptos = totales.map(aConcepto).sort((a, b) => a.conceptoNombre.localeCompare(b.conceptoNombre, 'es'));
  const suma = (valor: (concepto: TotalesDeUnConcepto) => number) => totales.reduce((s, t) => s + valor(t), 0);
  const entradas = suma((t) => aCentavos(t.entradas));
  const salidas = suma((t) => aCentavos(t.salidas));
  return {
    ...marco,
    conceptos,
    entradas: deCentavos(entradas),
    salidas: deCentavos(salidas),
    neto: deCentavos(entradas - salidas),
    cantidad: suma((t) => t.cantidad),
  };
}
