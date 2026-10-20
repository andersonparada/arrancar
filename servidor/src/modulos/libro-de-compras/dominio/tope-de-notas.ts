import { NotaSuperaLaFactura } from './errores-de-documento.js';
import { NotaDeDebitoSostieneNotasDeCredito } from './errores-de-baja.js';
import type { TipoDeNota } from './tipos-de-documento.js';

/** La factura con lo que ya corrigieron sus notas vigentes, por familia de nota. Montos en centavos. */
export interface FacturaConNotas {
  total: number;
  iva: number;
  totalDeNotasDeCredito: number;
  ivaDeNotasDeCredito: number;
  totalDeNotasDeDebito: number;
  ivaDeNotasDeDebito: number;
}

/**
 * El tope del total de las notas de crédito: su suma no pasa de la factura más sus notas de débito vigentes. La nota
 * de débito aumenta la factura, así que no tiene tope propio. El tope del IVA es el mismo, con
 * `exigirNotaCoherenteConLaFactura`. La fila de la factura debe estar bloqueada (`for update`) para que dos notas a la
 * vez no se pasen.
 * @throws NotaSuperaLaFactura.
 */
export function exigirQueLaNotaNoSupereLaFactura(
  factura: FacturaConNotas,
  nota: { tipo: TipoDeNota; total: number },
): void {
  if (nota.tipo !== 'nota_de_credito') return;
  if (factura.totalDeNotasDeCredito + nota.total > factura.total + factura.totalDeNotasDeDebito) {
    throw new NotaSuperaLaFactura();
  }
}

/**
 * Anular o eliminar una nota de débito: las notas de crédito vigentes deben seguir cabiendo sin ella, es decir en la
 * factura más las demás notas de débito, en total y en IVA.
 * @throws NotaDeDebitoSostieneNotasDeCredito.
 */
export function exigirQueLasNotasDeCreditoSigaCabiendo(
  factura: FacturaConNotas,
  notaDeDebitoQueSeQuita: { total: number; iva: number },
): void {
  const totalQueQueda = factura.total + factura.totalDeNotasDeDebito - notaDeDebitoQueSeQuita.total;
  const ivaQueQueda = factura.iva + factura.ivaDeNotasDeDebito - notaDeDebitoQueSeQuita.iva;
  if (factura.totalDeNotasDeCredito > totalQueQueda || factura.ivaDeNotasDeCredito > ivaQueQueda) {
    throw new NotaDeDebitoSostieneNotasDeCredito();
  }
}
