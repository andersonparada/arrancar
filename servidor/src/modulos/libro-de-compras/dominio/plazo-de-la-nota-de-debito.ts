import { MESES_DE_PLAZO_DEL_CREDITO } from './periodo-del-libro.js';
import { venceLaVispera } from './plazo-en-meses.js';

/**
 * La nota de débito se emitió después de los dos meses desde la fecha de su factura (Ley del IVA art. 17): el
 * comprador pierde el crédito aunque la registre a tiempo según el art. 20.
 */
export function esNotaDeDebitoTardia(fechaDeEmisionDeLaNota: string, fechaDeEmisionDeLaFactura: string): boolean {
  return fechaDeEmisionDeLaNota > venceLaVispera(fechaDeEmisionDeLaFactura, MESES_DE_PLAZO_DEL_CREDITO);
}

export const AVISO_DE_NOTA_DE_DEBITO_TARDIA =
  'La nota de débito se emitió más de dos meses después de su factura (art. 17 de la Ley del IVA): no da crédito fiscal y el IVA se suma al costo de cada línea.';
