import { fechaLegible } from '../retenciones/fechas-de-retenciones.js';
import type { FacturaQueCorrigeLaNota } from './documento-del-libro.js';

/** «SERIE-NÚMERO del dd/mm/aaaa» (o «NÚMERO del dd/mm/aaaa» sin serie); vacío si no es una nota. */
export function textoDeLaFacturaQueCorrige(factura: FacturaQueCorrigeLaNota | null): string | null {
  if (factura === null) return null;
  const numero = factura.serie ? `${factura.serie}-${factura.numero}` : factura.numero;
  return `${numero} del ${fechaLegible(factura.fechaEmision)}`;
}
