import {
  COLUMNAS_DEL_LIBRO,
  esCampoDeTexto,
  textoDelCampo,
  type CampoDelLibro,
} from '../../dominio/libro/columnas-del-libro.js';
import type { FilaDelLibro, MontosDelLibro } from '../../dominio/libro/fila-del-libro.js';
import type { PaginaDelLibro } from '../../dominio/libro/paginacion-del-libro.js';
import type { TipoDeLibro } from '../../dominio/libro/tipo-de-libro.js';
import { montoParaElPdf } from './monto-del-pdf.js';
import type { PincelDelPdf } from './pincel-del-pdf.js';

export const MARGEN = 30;
export const ANCHO_UTIL = 936 - 2 * MARGEN;
const ALTO_DE_FILA = 12;
const ALTO_DEL_ENCABEZADO = 28;
const TAMANO = 6.5;

const ANCHO_DE_TEXTO: Partial<Record<CampoDelLibro, number>> = {
  numeroDeFila: 24,
  fecha: 46,
  tipoDte: 28,
  serie: 32,
  numero: 48,
  nit: 52,
  siglaDelMotivo: 24,
};
const MAXIMO_DE_TEXTO: Partial<Record<CampoDelLibro, number>> = { serie: 20, numero: 30, nit: 20, siglaDelMotivo: 6 };

interface ColumnaPosicionada {
  titulo: string;
  campo: CampoDelLibro;
  x: number;
  ancho: number;
}

/** Reparte el ancho útil: columnas fijas, dinero parejo y el nombre del proveedor con lo que sobra. */
export function columnasDeLaTabla(tipo: TipoDeLibro): ColumnaPosicionada[] {
  const columnas = COLUMNAS_DEL_LIBRO[tipo];
  const anchoDeDinero = tipo === 'completo' ? 50 : 60;
  const anchoFijo = (campo: CampoDelLibro) => (esCampoDeTexto(campo) ? (ANCHO_DE_TEXTO[campo] ?? 0) : anchoDeDinero);
  const fijos = columnas.reduce((suma, c) => suma + anchoFijo(c.campo), 0);
  let x = MARGEN;
  return columnas.map(({ titulo, campo }) => {
    const ancho = campo === 'nombre' ? ANCHO_UTIL - fijos : anchoFijo(campo);
    const columna = { titulo, campo, x, ancho };
    x += ancho;
    return columna;
  });
}

export const filasPorHoja = (): { primeraFila: number; ultimaLinea: number } => ({
  primeraFila: 124 + ALTO_DE_FILA,
  ultimaLinea: 124 + ALTO_DE_FILA * 34,
});

/** Los títulos de las columnas, que son del programa. */
export function dibujarEncabezadoDeLaTabla(pincel: PincelDelPdf, columnas: ColumnaPosicionada[]): void {
  for (const c of columnas) {
    pincel.titulo(c.titulo, { x: c.x + 1, y: 92, ancho: c.ancho - 2, alto: ALTO_DEL_ENCABEZADO }, 5.5);
  }
  pincel.linea({ x: MARGEN, y: 92 + ALTO_DEL_ENCABEZADO + 2 }, ANCHO_UTIL, 0.6);
}

function dibujarFila(
  pincel: PincelDelPdf,
  columnas: ColumnaPosicionada[],
  { fila, y }: { fila: FilaDelLibro; y: number },
): void {
  for (const c of columnas) {
    const caja = { x: c.x + 1, y, ancho: c.ancho - 2 };
    if (esCampoDeTexto(c.campo)) {
      const maximo = MAXIMO_DE_TEXTO[c.campo];
      const alinear = c.campo === 'numeroDeFila' ? 'right' : 'left';
      pincel.texto(textoDelCampo(fila, c.campo), caja, { tamano: TAMANO, alinear, ...(maximo ? { maximo } : {}) });
    } else if (fila[c.campo] !== 0) {
      pincel.texto(montoParaElPdf(fila[c.campo]), caja, { tamano: TAMANO, alinear: 'right', numero: true });
    }
  }
  pincel.linea({ x: MARGEN, y: y + ALTO_DE_FILA - 1.5 }, ANCHO_UTIL, 0.15);
}

/** Una línea de subtotal («Vienen», «Van» o «Total del período»): la etiqueta junto al nombre y los montos en su columna. */
function dibujarSubtotal(
  pincel: PincelDelPdf,
  columnas: ColumnaPosicionada[],
  { montos, y, etiqueta }: { montos: MontosDelLibro; y: number; etiqueta: string },
): void {
  for (const c of columnas) {
    const caja = { x: c.x + 1, y, ancho: c.ancho - 2 };
    if (c.campo === 'nombre') pincel.texto(etiqueta, caja, { tamano: TAMANO, negrita: true, alinear: 'right' });
    else if (!esCampoDeTexto(c.campo)) {
      pincel.texto(montoParaElPdf(montos[c.campo]), caja, {
        tamano: TAMANO,
        negrita: true,
        alinear: 'right',
        numero: true,
      });
    }
  }
}

/** Las filas de una hoja entre su «Vienen» (arriba) y su «Van» o «Total del período» (abajo). */
export function dibujarFilasDeLaHoja(pincel: PincelDelPdf, tipo: TipoDeLibro, pagina: PaginaDelLibro): void {
  const columnas = columnasDeLaTabla(tipo);
  const { primeraFila, ultimaLinea } = filasPorHoja();
  if (pagina.vienen) {
    dibujarSubtotal(pincel, columnas, { montos: pagina.vienen, y: primeraFila - ALTO_DE_FILA, etiqueta: 'Vienen' });
  }
  pagina.filas.forEach((fila, indice) =>
    dibujarFila(pincel, columnas, { fila, y: primeraFila + indice * ALTO_DE_FILA }),
  );
  const etiqueta = pagina.esUltima ? 'Total del período' : 'Van';
  dibujarSubtotal(pincel, columnas, { montos: pagina.acumulado, y: ultimaLinea, etiqueta });
}
