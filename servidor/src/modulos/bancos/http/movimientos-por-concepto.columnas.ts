import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  ConceptoDelReporteDto,
  ReporteDeMovimientosPorConceptoDto,
} from '../aplicacion/dto/reportes-por-concepto.dto.js';

/** Una fila del Excel de movimientos por concepto: un concepto o el total. */
export interface FilaExportadaPorConcepto {
  conceptoNombre: string;
  entradas: string;
  salidas: string;
  neto: string;
  cantidad: number;
  cantidadDeInversos: number | null;
}

const deConcepto = ({
  conceptoNombre,
  entradas,
  salidas,
  neto,
  cantidad,
  cantidadDeInversos,
}: ConceptoDelReporteDto): FilaExportadaPorConcepto => ({
  conceptoNombre,
  entradas,
  salidas,
  neto,
  cantidad,
  cantidadDeInversos,
});

/** Una fila por concepto y al final la de totales. */
export const aFilasExportadasPorConcepto = (
  reporte: ReporteDeMovimientosPorConceptoDto,
): FilaExportadaPorConcepto[] => [
  ...reporte.conceptos.map(deConcepto),
  {
    conceptoNombre: 'Total',
    entradas: reporte.entradas,
    salidas: reporte.salidas,
    neto: reporte.neto,
    cantidad: reporte.cantidad,
    cantidadDeInversos: null,
  },
];

/** Las columnas del Excel de movimientos por concepto: solo se exporta, nunca se importa. */
export const columnasDeMovimientosPorConcepto: Columna[] = [
  { clave: 'conceptoNombre', titulo: 'Concepto', requerido: true, tipo: 'texto' },
  { clave: 'entradas', titulo: 'Entradas', requerido: true, tipo: 'decimal' },
  { clave: 'salidas', titulo: 'Salidas', requerido: true, tipo: 'decimal' },
  { clave: 'neto', titulo: 'Neto', requerido: true, tipo: 'decimal' },
  { clave: 'cantidad', titulo: 'Movimientos', requerido: true, tipo: 'entero' },
  { clave: 'cantidadDeInversos', titulo: 'Inversos (anulaciones)', requerido: false, tipo: 'entero' },
];
