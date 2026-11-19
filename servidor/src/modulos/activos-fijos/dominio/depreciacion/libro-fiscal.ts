import { aCentesimas, dividirRedondeando } from './redondeo.js';
import type { CausaDeTramo, TramoCalculado } from './tramo.js';

export interface EntradaDeTramoFiscal {
  desdePeriodo: string;
  causa: CausaDeTramo;
  /** Base fiscal total `B` (con el tope del inmueble y sin el ganado común, §7.3). */
  baseFiscalCentavos: number;
  /** Depreciación fiscal acumulada al cierre anterior. */
  acumuladaCentavos: number;
  /** Porcentaje anual del activo, con dos decimales. */
  porcentaje: string;
  /** Sobre qué se aplica el porcentaje; por omisión, la base fiscal (inicio de uso, costo posterior, matrícula). */
  baseDelPorcentajeCentavos?: number;
}

/** `round(base × % / 1200)`: la cuota de un mes con el porcentaje anual. */
function cuotaMensualFiscal(baseCentavos: number, porcentaje: string): number {
  return dividirRedondeando(BigInt(baseCentavos) * BigInt(aCentesimas(porcentaje)), 120000);
}

/**
 * Abre un tramo fiscal (ISR arts. 25 a 33, §7.3): `por_depreciar = B − A` y `cuota = round(base × % / 1200)`. Si la base
 * quedó por debajo de lo ya depreciado, no hay cuotas y la diferencia queda como exceso (§7.4).
 */
export function abrirTramoFiscal(entrada: EntradaDeTramoFiscal): TramoCalculado {
  const { desdePeriodo, causa, baseFiscalCentavos, acumuladaCentavos, porcentaje } = entrada;
  const diferencia = baseFiscalCentavos - acumuladaCentavos;
  const porDepreciarCentavos = Math.max(diferencia, 0);
  const base = entrada.baseDelPorcentajeCentavos ?? baseFiscalCentavos;
  return {
    libro: 'fiscal',
    desdePeriodo,
    causa,
    porDepreciarCentavos,
    valorResidualCentavos: 0,
    meses: null,
    porcentaje,
    baseDelPorcentajeCentavos: base,
    cuotaMensualCentavos: porDepreciarCentavos === 0 ? 0 : cuotaMensualFiscal(base, porcentaje),
    excesoDeNotaDeCreditoCentavos: Math.max(-diferencia, 0),
  };
}

/** La cuota fiscal del mes: la mensual sin pasar de lo que falta; el tramo termina cuando el pendiente llega a cero. */
export function cuotaFiscalDelMes(entrada: { cuotaMensualCentavos: number; pendienteCentavos: number }): number {
  return Math.max(Math.min(entrada.cuotaMensualCentavos, entrada.pendienteCentavos), 0);
}
