import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ReporteDeTiposDeCambioDto } from '../aplicacion/casos-uso/reporte-de-tipos-de-cambio.js';

/** Una fila del Excel: el tipo vigente de un día y de dónde salió. */
export interface FilaExportadaDeTipo {
  fecha: string;
  moneda: string;
  referencia: string;
  compra: string | null;
  venta: string | null;
  convencion: string;
  dolarUsado: string | null;
  fuente: string;
}

const CONVENCIONES = {
  quetzales_por_unidad: 'Quetzales por unidad',
  usd_por_unidad: 'Dólares por unidad',
  unidades_por_usd: 'Unidades por dólar',
} as const;

/** La política contable de la instalación (adenda B.5): va en la nota del Excel y en la impresión. */
export const NOTA_DE_LA_POLITICA_DE_CRUCES =
  'Q por unidad = promedio del cruce publicado × referencia USD (o referencia USD ÷ promedio del cruce publicado en las monedas de unidades por dólar). Es una política contable de la instalación, no un valor publicado por el Banco de Guatemala; el dólar sí lo es.';

const ORIGENES = { banguat: 'Banco de Guatemala', manual: 'Ingreso manual de soporte' } as const;

/** Las filas del reporte; cada una dice su fuente («Banco de Guatemala»), como pide el servicio del Banguat. */
export const aFilasExportadasDeTipos = (reporte: ReporteDeTiposDeCambioDto): FilaExportadaDeTipo[] =>
  reporte.filas.map((fila) => ({
    fecha: fila.fecha,
    moneda: fila.moneda,
    referencia: fila.referencia,
    compra: fila.compra,
    venta: fila.venta,
    convencion: fila.convencion ? CONVENCIONES[fila.convencion] : '',
    dolarUsado: fila.dolarUsado,
    fuente: ORIGENES[fila.origen],
  }));

/** Las columnas del Excel de tipos de cambio: solo se exporta, nunca se importa. */
export const columnasDeTiposDeCambio: Columna[] = [
  { clave: 'fecha', titulo: 'Fecha', requerido: true, tipo: 'fecha' },
  { clave: 'moneda', titulo: 'Moneda', requerido: true, tipo: 'texto' },
  { clave: 'referencia', titulo: 'Tipo de cambio (Q por unidad)', requerido: true, tipo: 'decimal' },
  { clave: 'compra', titulo: 'Compra publicada', requerido: false, tipo: 'decimal' },
  { clave: 'venta', titulo: 'Venta publicada', requerido: false, tipo: 'decimal' },
  { clave: 'convencion', titulo: 'Convención', requerido: false, tipo: 'texto' },
  { clave: 'dolarUsado', titulo: 'Dólar usado', requerido: false, tipo: 'decimal' },
  { clave: 'fuente', titulo: 'Fuente', requerido: true, tipo: 'texto' },
];
