/** La serie y el número de un documento como se leen en la factura: `A-1234`, o solo el número si no hay serie. */
export const numeroDelDocumento = ({ serie, numero }: { serie: string | null; numero: string }): string =>
  serie ? `${serie}-${numero}` : numero;
