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
  /**
   * La parte de `pagadoCentavos` con fecha posterior a hoy (cheques posfechados). Quien llama la saca con
   * `pagadoYComprometido`. Sin ella (cero) la deuda sale igual a lo disponible: sirve a quien solo limita un pago.
   */
  comprometidoCentavos?: number;
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
   * Un cargo: lo que se debe hoy (el neto menos lo aplicado, lo ajustado y lo pagado hasta hoy; lo posfechado sigue
   * siendo deuda). Una nota de crédito: su saldo libre, a favor de la empresa (la base menos lo aplicado, lo ajustado y
   * lo reintegrado). Un documento anulado no debe nada ni deja nada a favor.
   */
  deudaCentavos: number;
  /** Un cargo: la parte de la deuda ya cubierta con pagos de fecha posterior a hoy. Cero en una nota. */
  comprometidoCentavos: number;
  /** Lo que aún se puede pagar o aplicar: la deuda menos lo comprometido. Es el tope de un pago, nota o ajuste. */
  disponibleCentavos: number;
}

/** Lo que rebajó cada cosa según el documento sea un cargo o una nota de crédito. */
function rebajasDelDocumento(esCargo: boolean, aplicado: AplicadoAlDocumento) {
  return {
    aplicadoCentavos: esCargo ? aplicado.alCargoCentavos : aplicado.porLaNotaCentavos,
    ajustadoCentavos: aplicado.ajustadoCentavos,
    pagadoCentavos: esCargo ? aplicado.pagadoCentavos : 0,
    reintegradoCentavos: esCargo ? 0 : aplicado.reintegradoCentavos,
  };
}

/** Los saldos de un documento; salen de sus montos y de las aplicaciones, no se guardan. */
export function saldoDe(documento: DocumentoPorPagar, aplicado: AplicadoAlDocumento): SaldoDelDocumento {
  const esCargo = claseDe(documento.tipo) === 'cargo';
  const netoCentavos = esCargo ? netoDe(documento) : (documento.saldoAlInicioCentavos ?? documento.totalCentavos);
  const rebajas = rebajasDelDocumento(esCargo, aplicado);
  const rebajado = Object.values(rebajas).reduce((suma, monto) => suma + monto, 0);
  const anulado = documento.estado === 'anulado';
  const disponibleCentavos = anulado ? 0 : netoCentavos - rebajado;
  const comprometidoCentavos = esCargo && !anulado ? (aplicado.comprometidoCentavos ?? 0) : 0;
  return {
    netoCentavos,
    ...rebajas,
    deudaCentavos: disponibleCentavos + comprometidoCentavos,
    comprometidoCentavos,
    disponibleCentavos,
  };
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

/**
 * Un cargo vence cuando aún se debe algo (también lo comprometido con cheques posfechados) y su fecha de vencimiento
 * ya pasó (`hoy` lo da quien llama).
 */
export function estaVencido(documento: DocumentoPorPagar, deudaCentavos: number, hoy: string): boolean {
  if (claseDe(documento.tipo) !== 'cargo' || documento.estado === 'anulado') return false;
  return deudaCentavos > 0 && documento.vencimiento !== null && documento.vencimiento < hoy;
}
