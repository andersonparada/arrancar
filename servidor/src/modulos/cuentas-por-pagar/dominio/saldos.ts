import { netoDe, type DocumentoPorPagar } from './documento-por-pagar.js';
import { claseDe } from './tipos-de-documento.js';

/** Lo que ya rebajaron las notas de crédito, según el documento sea un cargo o una nota. */
export interface AplicadoAlDocumento {
  /** Lo que las notas de crédito rebajaron de este cargo. */
  alCargoCentavos: number;
  /** Lo que esta nota de crédito rebajó de cargos. */
  porLaNotaCentavos: number;
}

/** Los tres montos que la pantalla muestra de un documento, en centavos. */
export interface SaldoDelDocumento {
  /** Un cargo: total menos retenciones (lo que se le paga al proveedor). Una nota de crédito: su total. */
  netoCentavos: number;
  aplicadoCentavos: number;
  /**
   * Un cargo: lo que todavía se debe. Una nota de crédito: su saldo libre, a favor de la empresa. Un documento
   * anulado no debe nada ni deja nada a favor.
   */
  saldoCentavos: number;
}

/** Los saldos de un documento; salen de sus montos y de las aplicaciones, no se guardan. */
export function saldoDe(documento: DocumentoPorPagar, aplicado: AplicadoAlDocumento): SaldoDelDocumento {
  const esCargo = claseDe(documento.tipo) === 'cargo';
  const netoCentavos = esCargo ? netoDe(documento) : documento.totalCentavos;
  const aplicadoCentavos = esCargo ? aplicado.alCargoCentavos : aplicado.porLaNotaCentavos;
  const saldoCentavos = documento.estado === 'anulado' ? 0 : netoCentavos - aplicadoCentavos;
  return { netoCentavos, aplicadoCentavos, saldoCentavos };
}

/** Un cargo vence cuando aún se debe algo y su fecha de vencimiento ya pasó (`hoy` lo da quien llama). */
export function estaVencido(documento: DocumentoPorPagar, saldoCentavos: number, hoy: string): boolean {
  if (claseDe(documento.tipo) !== 'cargo' || documento.estado === 'anulado') return false;
  return saldoCentavos > 0 && documento.vencimiento !== null && documento.vencimiento < hoy;
}
