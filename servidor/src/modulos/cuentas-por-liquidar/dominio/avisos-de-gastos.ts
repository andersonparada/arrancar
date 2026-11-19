import { quetzales } from './avisos-de-anticipos.js';

/** Por qué un documento no va en el libro (los motivos de Libro de compras), dicho para el aviso. */
const MOTIVOS_FUERA_DEL_LIBRO: Record<string, string> = {
  sin_fel: 'no tiene factura electrónica (FEL)',
  fel_a_consumidor_final: 'la factura electrónica está a nombre de consumidor final',
  fel_a_otro_nit: 'la factura electrónica está a otro NIT',
  recibo_fel: 'es un recibo electrónico, no una compra gravada',
};

/** C6: un documento fuera del libro no da crédito fiscal ni sirve para deducir el gasto. */
export function avisoDeFueraDelLibro(motivo: string | null): string | null {
  if (motivo === null) return null;
  const razon = MOTIVOS_FUERA_DEL_LIBRO[motivo] ?? 'no va en el libro de compras';
  return `No da crédito fiscal ni es deducible: ${razon}.`;
}

/** Al recibir una factura con retención: queda en la bandeja hasta que alguien con el permiso la asigne con un motivo. */
export function avisoDeRetencionEnLaBandeja(retenidoCentavos: number): string {
  return `Quedó en la bandeja de Cuentas por liquidar: lleva retención de ${quetzales(retenidoCentavos)} (la entera la empresa). Para pagarla del anticipo, asígnela con el permiso de excepción y un motivo.`;
}

/** Al recibir un documento que no se pudo asignar al anticipo de la referencia. */
export const avisoDeDocumentoEnLaBandeja = (razon: string): string =>
  `Quedó en la bandeja de Cuentas por liquidar: ${razon}`;

/** Un gasto sin documento no sirve para deducir (y V-6 decide si es renta del trabajo del empleado). */
export const AVISO_DE_GASTO_SIN_DOCUMENTO =
  'Un gasto sin documento no es deducible para la empresa: queda como gasto no sustentado.';
