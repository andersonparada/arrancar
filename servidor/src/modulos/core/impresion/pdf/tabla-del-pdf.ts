import { montoParaElPdf } from './monto-del-pdf.js';
import type { PaginaConSubtotales } from './paginacion-con-subtotales.js';
import type { PincelDelPdf } from './pincel-del-pdf.js';

export const MARGEN = 30;
export const ANCHO_UTIL = 936 - 2 * MARGEN;
const ALTO_DE_FILA = 12;
const ALTO_DEL_ENCABEZADO = 28;
const TAMANO = 6.5;
const PRIMERA_FILA = 124 + ALTO_DE_FILA;
const ULTIMA_LINEA = 124 + ALTO_DE_FILA * 34;

/**
 * Una columna de la tabla de un libro, ya con su lugar en la hoja. `texto` (columna de texto) o `monto` (centavos)
 * dicen de dónde sale lo que se dibuja; la columna `etiqueta` lleva «Vienen», «Van» y «Total del período».
 * `monto` también lee los subtotales, por eso las filas son un caso de los montos (`F extends M`).
 */
export interface ColumnaDeTabla<F extends M, M> {
  titulo: string;
  x: number;
  ancho: number;
  etiqueta?: boolean;
  alinear?: 'left' | 'right';
  maximo?: number;
  texto?: (fila: F) => string;
  monto?: (origen: M) => number;
}

/** Los títulos de las columnas, que son del programa. */
export function dibujarEncabezadoDeLaTabla<F extends M, M>(
  pincel: PincelDelPdf,
  columnas: ColumnaDeTabla<F, M>[],
): void {
  for (const c of columnas) {
    pincel.titulo(c.titulo, { x: c.x + 1, y: 92, ancho: c.ancho - 2, alto: ALTO_DEL_ENCABEZADO }, 5.5);
  }
  pincel.linea({ x: MARGEN, y: 92 + ALTO_DEL_ENCABEZADO + 2 }, ANCHO_UTIL, 0.6);
}

function dibujarFila<F extends M, M>(
  pincel: PincelDelPdf,
  columnas: ColumnaDeTabla<F, M>[],
  { fila, y }: { fila: F; y: number },
): void {
  for (const c of columnas) {
    const caja = { x: c.x + 1, y, ancho: c.ancho - 2 };
    if (c.texto) {
      const alinear = c.alinear ?? 'left';
      pincel.texto(c.texto(fila), caja, { tamano: TAMANO, alinear, ...(c.maximo ? { maximo: c.maximo } : {}) });
    } else if (c.monto && c.monto(fila) !== 0) {
      pincel.texto(montoParaElPdf(c.monto(fila)), caja, { tamano: TAMANO, alinear: 'right', numero: true });
    }
  }
  pincel.linea({ x: MARGEN, y: y + ALTO_DE_FILA - 1.5 }, ANCHO_UTIL, 0.15);
}

/** Una línea de subtotal («Vienen», «Van» o «Total del período»): la etiqueta junto al nombre y los montos en su columna. */
function dibujarSubtotal<F extends M, M>(
  pincel: PincelDelPdf,
  columnas: ColumnaDeTabla<F, M>[],
  { montos, y, etiqueta }: { montos: M; y: number; etiqueta: string },
): void {
  for (const c of columnas) {
    const caja = { x: c.x + 1, y, ancho: c.ancho - 2 };
    if (c.etiqueta) pincel.texto(etiqueta, caja, { tamano: TAMANO, negrita: true, alinear: 'right' });
    else if (c.monto) {
      pincel.texto(montoParaElPdf(c.monto(montos)), caja, {
        tamano: TAMANO,
        negrita: true,
        alinear: 'right',
        numero: true,
      });
    }
  }
}

/** Las filas de una hoja entre su «Vienen» (arriba) y su «Van» o «Total del período» (abajo). */
export function dibujarFilasDeLaHoja<F extends M, M>(
  pincel: PincelDelPdf,
  columnas: ColumnaDeTabla<F, M>[],
  pagina: PaginaConSubtotales<F, M>,
): void {
  if (pagina.vienen) {
    dibujarSubtotal<F, M>(pincel, columnas, {
      montos: pagina.vienen,
      y: PRIMERA_FILA - ALTO_DE_FILA,
      etiqueta: 'Vienen',
    });
  }
  pagina.filas.forEach((fila, indice) =>
    dibujarFila(pincel, columnas, { fila, y: PRIMERA_FILA + indice * ALTO_DE_FILA }),
  );
  const etiqueta = pagina.esUltima ? 'Total del período' : 'Van';
  dibujarSubtotal<F, M>(pincel, columnas, { montos: pagina.acumulado, y: ULTIMA_LINEA, etiqueta });
}
