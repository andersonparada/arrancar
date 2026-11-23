import type { CifrasDeBaja } from '../tipos-de-baja.js';
import { acumuladaAntesDe, type EstadoDeLosLibros } from './estado-de-los-libros.js';
import { periodoDe, sumarMeses, type PrimerMes } from './meses.js';
import type { LibroDeDepreciacion } from './tramo.js';

export interface EntradaDeCifrasDeBaja {
  /** Lo depreciado del activo hasta su último mes cerrado, con sus tramos vigentes. */
  estado: EstadoDeLosLibros;
  fechaDeBaja: string;
  primerMes: PrimerMes;
  /** Σ de los costos vigentes. */
  costoCentavos: number;
  /** El costo que se recupera al vender: todos los costos fiscales, sin tope del inmueble ni ganado común (A1). */
  costoFiscalCentavos: number;
  /** La base fiscal con que se depreciaba (con el tope del inmueble y sin el ganado común). */
  baseFiscalCentavos: number;
}

/** La depreciación del libro al día de la baja y la cuota del propio mes, si la convención lo deprecia. */
function depreciacionDelLibro(entrada: EntradaDeCifrasDeBaja, libro: LibroDeDepreciacion) {
  const { estado, fechaDeBaja, primerMes } = entrada;
  const mes = periodoDe(fechaDeBaja);
  const antes = acumuladaAntesDe(estado, libro, mes);
  if (primerMes !== 'mes_siguiente') return { acumuladaCentavos: antes, cuotaDelMesCentavos: 0 };
  const cuotaDelMesCentavos = acumuladaAntesDe(estado, libro, sumarMeses(mes, 1)) - antes;
  return { acumuladaCentavos: antes + cuotaDelMesCentavos, cuotaDelMesCentavos };
}

/**
 * Lo que se congela al dar de baja (§6.8): la acumulada de cada libro al día de la baja —lo cerrado más lo que darían los
 * meses abiertos que van antes, que se cerrarán con esos mismos tramos— y, con `mes_siguiente`, la cuota del propio mes
 * (que el cierre de ese mes toma tal cual). Sin tramos (terrenos, bienes de control) la depreciación es cero.
 */
export function cifrasDeBaja(entrada: EntradaDeCifrasDeBaja): CifrasDeBaja {
  const contable = depreciacionDelLibro(entrada, 'contable');
  const fiscal = depreciacionDelLibro(entrada, 'fiscal');
  const { costoCentavos, costoFiscalCentavos, baseFiscalCentavos } = entrada;
  return {
    costoCentavos,
    depreciacionAcumuladaContableCentavos: contable.acumuladaCentavos,
    valorEnLibrosCentavos: costoCentavos - contable.acumuladaCentavos,
    costoFiscalCentavos,
    baseFiscalCentavos,
    depreciacionAcumuladaFiscalCentavos: fiscal.acumuladaCentavos,
    valorFiscalPorDepreciarCentavos: baseFiscalCentavos - fiscal.acumuladaCentavos,
    cuotaDelMesContableCentavos: contable.cuotaDelMesCentavos,
    cuotaDelMesFiscalCentavos: fiscal.cuotaDelMesCentavos,
  };
}
