import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ReporteDeTiposDeCambioDto } from '../aplicacion/casos-uso/reporte-de-tipos-de-cambio.js';

/** Una fila del Excel: el tipo vigente de un día y de dónde salió. */
export interface FilaExportadaDeTipo {
  fecha: string;
  moneda: string;
  referencia: string;
  compra: string | null;
  venta: string | null;
  fuente: string;
}

const ORIGENES = { banguat: 'Banco de Guatemala', manual: 'Ingreso manual de soporte' } as const;

/** Las filas del reporte; cada una dice su fuente («Banco de Guatemala»), como pide el servicio del Banguat. */
export const aFilasExportadasDeTipos = (reporte: ReporteDeTiposDeCambioDto): FilaExportadaDeTipo[] =>
  reporte.filas.map((fila) => ({
    fecha: fila.fecha,
    moneda: fila.moneda,
    referencia: fila.referencia,
    compra: fila.compra,
    venta: fila.venta,
    fuente: ORIGENES[fila.origen],
  }));

/** Las columnas del Excel de tipos de cambio: solo se exporta, nunca se importa. */
export const columnasDeTiposDeCambio: Columna[] = [
  { clave: 'fecha', titulo: 'Fecha', requerido: true, tipo: 'fecha' },
  { clave: 'moneda', titulo: 'Moneda', requerido: true, tipo: 'texto' },
  { clave: 'referencia', titulo: 'Tipo de cambio (Q por unidad)', requerido: true, tipo: 'decimal' },
  { clave: 'compra', titulo: 'Compra', requerido: false, tipo: 'decimal' },
  { clave: 'venta', titulo: 'Venta', requerido: false, tipo: 'decimal' },
  { clave: 'fuente', titulo: 'Fuente', requerido: true, tipo: 'texto' },
];
