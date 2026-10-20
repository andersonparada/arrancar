import { COLUMNAS_DEL_LIBRO, esCampoDeTexto } from '../../dominio/libro/columnas-del-libro.js';
import type { ColumnaDeDinero } from '../../dominio/libro/fila-del-libro.js';
import type { DatosDelPdfDelLibro } from '../../aplicacion/puertos/generador-de-pdf-del-libro.js';
import { montoParaElPdf } from './monto-del-pdf.js';
import type { PincelDelPdf } from './pincel-del-pdf.js';
import { MARGEN } from './tabla-del-pdf.js';

interface LineaDeResumen {
  etiqueta: string;
  valor?: string;
  titulo?: boolean;
}

const ALTO_DE_LINEA = 12;
const ANCHO_DE_BLOQUE = 400;
const SEGUNDO_BLOQUE = MARGEN + 450;

const titulo = (etiqueta: string): LineaDeResumen => ({ etiqueta, titulo: true });

function bloqueIzquierdo({ resumen, tipoDeLibro }: DatosDelPdfDelLibro): LineaDeResumen[] {
  const montos = COLUMNAS_DEL_LIBRO[tipoDeLibro].filter((c) => !esCampoDeTexto(c.campo));
  return [
    titulo('Totales del período'),
    ...montos.map((c) => ({ etiqueta: c.titulo, valor: montoParaElPdf(resumen.totales[c.campo as ColumnaDeDinero]) })),
    titulo('Crédito fiscal del período'),
    { etiqueta: 'IVA con derecho a crédito', valor: montoParaElPdf(resumen.creditoFiscalDelPeriodo) },
    titulo('Combustibles'),
    { etiqueta: 'Base', valor: montoParaElPdf(resumen.combustibles.base) },
    { etiqueta: 'IDP', valor: montoParaElPdf(resumen.combustibles.idp) },
    { etiqueta: 'IVA', valor: montoParaElPdf(resumen.combustibles.iva) },
    { etiqueta: 'Exento por el Decreto 22-2026', valor: montoParaElPdf(resumen.combustibles.exentoPorDecreto) },
  ];
}

function bloqueDerecho({ resumen, leyenda }: DatosDelPdfDelLibro): LineaDeResumen[] {
  return [
    titulo('Documentos por tipo (cantidad y total)'),
    ...resumen.porTipoDte.map((g) => ({
      etiqueta: `${g.tipoDte ?? 'Sin tipo'}  (${g.cantidad})`,
      valor: montoParaElPdf(g.total),
    })),
    titulo('IVA sin crédito por motivo (va al costo)'),
    ...resumen.ivaSinCreditoPorMotivo.map((g) => ({ etiqueta: g.motivo, valor: montoParaElPdf(g.ivaSinCredito) })),
    titulo('Motivos'),
    ...leyenda.map((l) => ({ etiqueta: `${l.sigla}: ${l.descripcion}` })),
  ];
}

function dibujarBloque(pincel: PincelDelPdf, lineas: LineaDeResumen[], x: number): void {
  lineas.forEach((linea, indice) => {
    const y = 100 + indice * ALTO_DE_LINEA;
    const negrita = linea.titulo === true;
    const caja = { x, y, ancho: ANCHO_DE_BLOQUE };
    pincel.texto(linea.etiqueta, caja, { tamano: 7.5, negrita, maximo: 120 });
    if (linea.valor) pincel.texto(linea.valor, caja, { tamano: 7.5, alinear: 'right', numero: true });
  });
}

/** La hoja final del libro: el resumen mensual y la leyenda de motivos. */
export function dibujarHojaDeResumen(pincel: PincelDelPdf, datos: DatosDelPdfDelLibro): void {
  pincel.texto('Resumen mensual', { x: MARGEN, y: 80, ancho: 400 }, { tamano: 9, negrita: true });
  dibujarBloque(pincel, bloqueIzquierdo(datos), MARGEN);
  dibujarBloque(pincel, bloqueDerecho(datos), SEGUNDO_BLOQUE);
}
