import type { PincelDelPdf } from './pincel-del-pdf.js';

/** Oficio horizontal, en puntos. */
export const TAMANO_DE_HOJA: [number, number] = [936, 612];
export const MARGEN = 30;
export const ANCHO_UTIL = TAMANO_DE_HOJA[0] - 2 * MARGEN;

/** Una hoja de un libro: su lugar entre las del libro y su folio (nulo mientras es un borrador). */
export interface HojaConFolio {
  numero: number;
  total: number;
  folio: number | null;
}

/** La hoja que está en `indice` (desde 0) de un libro de `total` hojas, cuyo primer folio es `primerFolio`. */
export function hojaConFolio(indice: number, total: number, primerFolio: number | null): HojaConFolio {
  return { numero: indice + 1, total, folio: primerFolio === null ? null : primerFolio + indice };
}

/** El folio de la hoja arriba a la derecha, o «BORRADOR — sin folio» en rojo si todavía no se emite. */
export function dibujarSelloDeFolio(pincel: PincelDelPdf, hoja: HojaConFolio): void {
  const folio = hoja.folio === null ? 'BORRADOR — sin folio' : `Folio ${hoja.folio}`;
  const color = hoja.folio === null ? '#B00020' : '#000000';
  pincel.texto(
    folio,
    { x: MARGEN + ANCHO_UTIL - 250, y: 30, ancho: 250 },
    { tamano: 13, negrita: true, alinear: 'right', color },
  );
}

/** El pie «Hoja N de M de este libro». */
export function dibujarPieDeHoja(pincel: PincelDelPdf, hoja: HojaConFolio): void {
  const texto = `Hoja ${hoja.numero} de ${hoja.total} de este libro`;
  pincel.texto(texto, { x: MARGEN, y: 584, ancho: ANCHO_UTIL }, { tamano: 7, alinear: 'center', color: '#444444' });
}
