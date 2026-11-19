import { dividirRedondeando } from './redondeo.js';
import type { CausaDeTramo, TramoCalculado } from './tramo.js';

export interface EntradaDeTramoContable {
  desdePeriodo: string;
  causa: CausaDeTramo;
  /** Σ de los costos vigentes. */
  costoCentavos: number;
  /** Depreciación contable acumulada al cierre anterior. */
  acumuladaCentavos: number;
  valorResidualCentavos: number;
  /** Meses que faltan por depreciar. */
  meses: number;
}

/**
 * Abre un tramo contable (NIIF para las Pymes 17, §7.2): `por_depreciar = (costo − acumulada) − residual` y la cuota es
 * esa suma entre los meses que faltan. Si el valor en libros ya está por debajo del residual (una nota de crédito),
 * no hay nada que depreciar y la diferencia queda como exceso (§7.4).
 * @throws RangeError si los meses no son un entero positivo.
 */
export function abrirTramoContable(entrada: EntradaDeTramoContable): TramoCalculado {
  const { desdePeriodo, causa, costoCentavos, acumuladaCentavos, valorResidualCentavos, meses } = entrada;
  if (!Number.isInteger(meses) || meses < 1) throw new RangeError('Los meses del tramo son un entero positivo.');
  const diferencia = costoCentavos - acumuladaCentavos - valorResidualCentavos;
  const porDepreciarCentavos = Math.max(diferencia, 0);
  return {
    libro: 'contable',
    desdePeriodo,
    causa,
    porDepreciarCentavos,
    valorResidualCentavos,
    meses,
    porcentaje: null,
    baseDelPorcentajeCentavos: null,
    cuotaMensualCentavos: dividirRedondeando(porDepreciarCentavos, meses),
    excesoDeNotaDeCreditoCentavos: Math.max(-diferencia, 0),
  };
}

export interface EntradaDeCuotaContable {
  cuotaMensualCentavos: number;
  meses: number;
  /** El mes del tramo que se calcula: 1 es el primero. */
  mesDelTramo: number;
  /** Lo que falta por depreciar del tramo antes de este mes. */
  pendienteCentavos: number;
}

/** La cuota contable del mes `k` del tramo: la mensual sin pasar del pendiente, y en el último mes, todo el pendiente. */
export function cuotaContableDelMes(entrada: EntradaDeCuotaContable): number {
  const { cuotaMensualCentavos, meses, mesDelTramo, pendienteCentavos } = entrada;
  if (pendienteCentavos <= 0 || mesDelTramo > meses) return 0;
  return mesDelTramo === meses ? pendienteCentavos : Math.min(cuotaMensualCentavos, pendienteCentavos);
}
