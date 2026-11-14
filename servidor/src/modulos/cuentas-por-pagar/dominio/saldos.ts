import { netoDe, type DocumentoPorPagar } from './documento-por-pagar.js';
import { claseDe } from './tipos-de-documento.js';

/** Lo que ya rebajaron las notas, los pagos, los ajustes y los reintegros, según el documento sea un cargo o una nota. */
export interface AplicadoAlDocumento {
  /** Lo que las notas de crédito rebajaron de este cargo. */
  alCargoCentavos: number;
  /** Lo que esta nota de crédito rebajó de cargos. */
  porLaNotaCentavos: number;
  /** Lo que se dio de baja con ajustes vigentes: del saldo libre de una nota, o la diferencia menor de un cargo. */
  ajustadoCentavos: number;
  /** Lo que los pagos vigentes entregaron a este cargo, también los posfechados (ya están comprometidos). */
  pagadoCentavos: number;
  /** Lo que los reintegros vigentes devolvieron contra esta nota. */
  reintegradoCentavos: number;
}

/** Los montos que la pantalla muestra de un documento, en centavos. */
export interface SaldoDelDocumento {
  /** Un cargo: total menos retenciones (lo que se le paga al proveedor). Una nota de crédito: su total. */
  netoCentavos: number;
  aplicadoCentavos: number;
  /** Lo dado de baja con ajustes vigentes (en un cargo, la diferencia menor de un pago). */
  ajustadoCentavos: number;
  /** Solo un cargo: lo que los pagos vigentes le entregaron; cero en una nota. */
  pagadoCentavos: number;
  /** Solo una nota: lo que los reintegros vigentes devolvieron; cero en un cargo. */
  reintegradoCentavos: number;
  /**
   * Un cargo: lo que todavía se debe (el neto menos lo aplicado, lo pagado y lo ajustado). Una nota de crédito: su
   * saldo libre, a favor de la empresa (la base menos lo aplicado, lo ajustado y lo reintegrado). Un documento anulado
   * no debe nada ni deja nada a favor.
   */
  saldoCentavos: number;
}

/** Los saldos de un documento; salen de sus montos y de las aplicaciones, no se guardan. */
export function saldoDe(documento: DocumentoPorPagar, aplicado: AplicadoAlDocumento): SaldoDelDocumento {
  const esCargo = claseDe(documento.tipo) === 'cargo';
  const netoCentavos = esCargo ? netoDe(documento) : (documento.saldoAlInicioCentavos ?? documento.totalCentavos);
  const aplicadoCentavos = esCargo ? aplicado.alCargoCentavos : aplicado.porLaNotaCentavos;
  const { ajustadoCentavos } = aplicado;
  const pagadoCentavos = esCargo ? aplicado.pagadoCentavos : 0;
  const reintegradoCentavos = esCargo ? 0 : aplicado.reintegradoCentavos;
  const rebajado = aplicadoCentavos + ajustadoCentavos + pagadoCentavos + reintegradoCentavos;
  const saldoCentavos = documento.estado === 'anulado' ? 0 : netoCentavos - rebajado;
  return { netoCentavos, aplicadoCentavos, ajustadoCentavos, pagadoCentavos, reintegradoCentavos, saldoCentavos };
}

/**
 * Lo que se pagó o se rebajó antes de la fecha de inicio de un saldo inicial: el neto que traía el documento menos
 * lo que faltaba al corte. Es dato derivado (no se guarda); `null` en un documento del libro.
 */
export function anterioresAlInicioDe(documento: DocumentoPorPagar): number | null {
  const { saldoAlInicioCentavos, totalCentavos, retencionesCentavos } = documento;
  if (saldoAlInicioCentavos === null) return null;
  const esCargo = claseDe(documento.tipo) === 'cargo';
  return (esCargo ? totalCentavos - retencionesCentavos : totalCentavos) - saldoAlInicioCentavos;
}

/** Un cargo vence cuando aún se debe algo y su fecha de vencimiento ya pasó (`hoy` lo da quien llama). */
export function estaVencido(documento: DocumentoPorPagar, saldoCentavos: number, hoy: string): boolean {
  if (claseDe(documento.tipo) !== 'cargo' || documento.estado === 'anulado') return false;
  return saldoCentavos > 0 && documento.vencimiento !== null && documento.vencimiento < hoy;
}
