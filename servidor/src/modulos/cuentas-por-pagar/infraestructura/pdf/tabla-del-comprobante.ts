import { COLUMNAS_DE_LA_TABLA, type FilaDelPdf, type TablaDelPdf } from './contenido-del-comprobante.js';
import type { PincelDelComprobante } from './pincel-del-comprobante.js';

export const MARGEN = 40;
export const ANCHO_UTIL = 532;
const ANCHOS = [190, 68, 68, 62, 68, 76];
const TAMANO = 8;
const RELLENO = 3;
const ALTO_DE_ENCABEZADO = 16;

/** Dónde va el dibujo y cómo pedir una hoja nueva si lo que sigue no cabe. */
export interface Cursor {
  y: number;
  asegurar(alto: number): void;
}

function posiciones(): number[] {
  return ANCHOS.map((_, indice) => MARGEN + ANCHOS.slice(0, indice).reduce((suma, ancho) => suma + ancho, 0));
}

function dibujarEncabezado(pincel: PincelDelComprobante, cursor: Cursor): void {
  const x = posiciones();
  pincel.relleno({ x: MARGEN, y: cursor.y, ancho: ANCHO_UTIL, alto: ALTO_DE_ENCABEZADO }, '#DDDDDD');
  COLUMNAS_DE_LA_TABLA.forEach((titulo, indice) => {
    const caja = { x: (x[indice] ?? 0) + RELLENO, y: cursor.y + RELLENO, ancho: (ANCHOS[indice] ?? 0) - 2 * RELLENO };
    pincel.texto(titulo, caja, { tamano: 7, negrita: true, alinear: indice === 0 ? 'left' : 'right', maximo: 40 });
  });
  cursor.y += ALTO_DE_ENCABEZADO;
}

/** La fila mide lo que el documento y sus constancias, una debajo de otra. */
function altoDeLaFila(pincel: PincelDelComprobante, fila: FilaDelPdf): number {
  const ancho = (ANCHOS[0] ?? 0) - 2 * RELLENO;
  const nombre = pincel.alto(fila.documento, ancho, { tamano: TAMANO, negrita: true });
  const constancias = fila.constancias.reduce((suma, texto) => suma + pincel.alto(texto, ancho, { tamano: 7 }), 0);
  return nombre + constancias + 2 * RELLENO;
}

function dibujarFila(pincel: PincelDelComprobante, cursor: Cursor, fila: FilaDelPdf): void {
  const x = posiciones();
  const alto = altoDeLaFila(pincel, fila);
  cursor.asegurar(alto);
  const ancho = (ANCHOS[0] ?? 0) - 2 * RELLENO;
  let y = cursor.y + RELLENO;
  y += pincel.texto(fila.documento, { x: MARGEN + RELLENO, y, ancho }, { tamano: TAMANO, negrita: true });
  for (const constancia of fila.constancias) {
    y += pincel.texto(constancia, { x: MARGEN + RELLENO, y, ancho }, { tamano: 7 });
  }
  fila.montos.forEach((monto, indice) => {
    const columna = indice + 1;
    const caja = { x: (x[columna] ?? 0) + RELLENO, y: cursor.y + RELLENO, ancho: (ANCHOS[columna] ?? 0) - 2 * RELLENO };
    pincel.texto(monto, caja, { tamano: TAMANO, alinear: 'right', numero: true, negrita: indice === 3 });
  });
  cursor.y += alto;
  pincel.linea({ x: MARGEN, y: cursor.y }, ANCHO_UTIL, 0.3);
}

/** Una contraseña: su título, los documentos pagados con sus constancias y, si hay varios, lo pagado en total. */
export function dibujarTabla(pincel: PincelDelComprobante, cursor: Cursor, tabla: TablaDelPdf): void {
  cursor.asegurar(40);
  cursor.y += pincel.texto(tabla.titulo, { x: MARGEN, y: cursor.y, ancho: ANCHO_UTIL }, { tamano: 9, negrita: true });
  cursor.y += 3;
  dibujarEncabezado(pincel, cursor);
  for (const fila of tabla.filas) dibujarFila(pincel, cursor, fila);
  if (tabla.pie) {
    cursor.asegurar(14);
    cursor.y += 3;
    cursor.y += pincel.texto(
      tabla.pie,
      { x: MARGEN, y: cursor.y, ancho: ANCHO_UTIL },
      { tamano: 8, negrita: true, alinear: 'right' },
    );
  }
  cursor.y += 10;
}
