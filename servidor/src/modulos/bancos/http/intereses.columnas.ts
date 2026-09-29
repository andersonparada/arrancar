import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { InteresDelReporteDto, ReporteDeInteresesDto } from '../aplicacion/dto/intereses.dto.js';

/** Una fila del Excel de intereses: una nota, y al final la de totales. */
export interface FilaExportadaDeInteres {
  fecha: string | null;
  cuentaBancariaNombre: string;
  numero: number | null;
  referencia: string | null;
  interesBruto: string;
  isrRetenido: string;
  neto: string;
}

const deNota = ({ movimientoId: _id, cuentaBancariaId: _cuenta, ...nota }: InteresDelReporteDto) => nota;

/** Una fila por nota y al final el total, con las columnas de la pantalla. */
export const aFilasExportadasDeIntereses = (reporte: ReporteDeInteresesDto): FilaExportadaDeInteres[] => [
  ...reporte.intereses.map(deNota),
  {
    fecha: null,
    cuentaBancariaNombre: 'Total',
    numero: null,
    referencia: null,
    interesBruto: reporte.interesBruto,
    isrRetenido: reporte.isrRetenido,
    neto: reporte.neto,
  },
];

/** Las columnas del Excel de Intereses y retenciones: solo se exporta, nunca se importa. */
export const columnasDeIntereses: Columna[] = [
  { clave: 'fecha', titulo: 'Fecha', requerido: false, tipo: 'fecha' },
  { clave: 'cuentaBancariaNombre', titulo: 'Cuenta', requerido: true, tipo: 'texto' },
  { clave: 'numero', titulo: 'Nota de crédito', requerido: false, tipo: 'entero' },
  { clave: 'referencia', titulo: 'Referencia', requerido: false, tipo: 'texto' },
  { clave: 'interesBruto', titulo: 'Interés bruto', requerido: true, tipo: 'decimal' },
  { clave: 'isrRetenido', titulo: 'ISR retenido', requerido: true, tipo: 'decimal' },
  { clave: 'neto', titulo: 'Neto acreditado', requerido: true, tipo: 'decimal' },
];
