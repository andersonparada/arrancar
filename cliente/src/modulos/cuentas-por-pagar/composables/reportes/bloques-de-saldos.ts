import type { FilaDeSaldo, Tramos } from '../../servicios/tipos-de-reportes';

/** Los tramos de antigüedad, en el orden en que se leen. */
export const COLUMNAS_DE_TRAMOS: { clave: keyof Tramos; etiqueta: string }[] = [
  { clave: 'porVencer', etiqueta: 'Por vencer' },
  { clave: 'de1a30', etiqueta: '1 a 30 días' },
  { clave: 'de31a60', etiqueta: '31 a 60 días' },
  { clave: 'de61a90', etiqueta: '61 a 90 días' },
  { clave: 'masDe90', etiqueta: 'Más de 90 días' },
  { clave: 'sinVencimiento', etiqueta: 'Sin vencimiento' },
];

export interface TramoConMonto {
  clave: keyof Tramos;
  etiqueta: string;
  monto: string;
}

/** Los montos de una fila (o del bloque) en el orden de las columnas, con su nombre. */
export const tramosDe = (cifras: Tramos): TramoConMonto[] =>
  COLUMNAS_DE_TRAMOS.map(({ clave, etiqueta }) => ({ clave, etiqueta, monto: cifras[clave] }));

/** Solo los tramos con dinero, para la tarjeta del celular (no se llena de ceros). */
export const tramosConSaldo = (cifras: Tramos): TramoConMonto[] =>
  tramosDe(cifras).filter(({ monto }) => Number(monto) !== 0);

/** Un NIT con más de una ficha de proveedor lleva sus fichas como subrenglones. */
export const tieneFichas = (fila: FilaDeSaldo): boolean => (fila.fichas?.length ?? 0) > 1;

/** La ficha cuyos documentos se revisan en R2; un NIT con varias fichas no tiene una sola (se revisa cada ficha). */
export const proveedorParaRevisar = (fila: FilaDeSaldo): string | null => (tieneFichas(fila) ? null : fila.proveedorId);

/** Cuántos proveedores (fichas) hay en un bloque; sirve para el título («3 proveedores»). */
export function cantidadDeFichas(filas: FilaDeSaldo[]): number {
  return filas.reduce((suma, fila) => suma + (tieneFichas(fila) ? fila.fichas!.length : 1), 0);
}

/** La ruta de R2 para ver los documentos de un proveedor al mismo corte. */
export const rutaDeDocumentosDelProveedor = (proveedorId: string, corte: string) => ({
  path: '/cuentas-por-pagar/reportes/documentos',
  query: { proveedorId, corte },
});
