import type { ComprobanteDePagoDto } from '../dto/comprobante-de-pago.dto.js';

/** Arma el comprobante de un pago como PDF (los mismos datos que imprime la pantalla). */
export interface GeneradorDePdfDelComprobante {
  /** Una hoja por cada rótulo del comprobante («Original», «Copia»); si el contenido es largo, varias páginas. */
  generar(comprobante: ComprobanteDePagoDto): Promise<Buffer>;
}

/** Nombre del archivo adjunto: `comprobante-de-pago-<numero>.pdf`, solo con caracteres seguros. */
export function nombreDelPdfDelComprobante(numeroDePago: string): string {
  const seguro = numeroDePago.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `comprobante-de-pago-${seguro || 'sin-numero'}.pdf`;
}
