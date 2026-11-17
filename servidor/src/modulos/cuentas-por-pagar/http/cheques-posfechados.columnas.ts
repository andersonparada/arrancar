import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  FilaDeChequePosfechadoDto,
  ReporteDeChequesPosfechadosDto,
} from '../aplicacion/dto/reportes-de-pagos.dto.js';
import { fechaLegible } from '../dominio/avisos.js';
import { dinero, entero, fecha, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de R7: un cheque, un total o una nota (corte y leyendas). */
export interface FilaExportadaDeCheques {
  seccion: string;
  fecha: string | null;
  diasQueFaltan: number | null;
  cuenta: string | null;
  numeroDeCheque: string | null;
  proveedor: string | null;
  pago: string | null;
  monto: string | null;
  cobrado: boolean | null;
  cobradoEn: string | null;
}

const VACIA: FilaExportadaDeCheques = {
  seccion: '',
  fecha: null,
  diasQueFaltan: null,
  cuenta: null,
  numeroDeCheque: null,
  proveedor: null,
  pago: null,
  monto: null,
  cobrado: null,
  cobradoEn: null,
};

const nota = (mensaje: string): FilaExportadaDeCheques => ({ ...VACIA, seccion: 'Nota', proveedor: mensaje });

const filaDeCheque = (cheque: FilaDeChequePosfechadoDto): FilaExportadaDeCheques => ({
  ...VACIA,
  seccion: 'Cheques',
  fecha: cheque.fecha,
  diasQueFaltan: cheque.diasQueFaltan,
  cuenta: cheque.cuenta,
  numeroDeCheque: cheque.numeroDeCheque,
  proveedor: cheque.proveedorNombre,
  pago: cheque.numeroDelPago,
  monto: cheque.monto,
  cobrado: cheque.cobrado,
  cobradoEn: cheque.cobradoEn,
});

/** Los totales por cuenta, por semana de vencimiento y el general. */
function filasDeTotales(reporte: ReporteDeChequesPosfechadosDto): FilaExportadaDeCheques[] {
  return [
    ...reporte.totalesPorCuenta.map((total) => ({
      ...VACIA,
      seccion: 'Total por cuenta',
      cuenta: total.cuenta,
      monto: total.monto,
    })),
    ...reporte.totalesPorSemana.map((total) => ({
      ...VACIA,
      seccion: 'Total por semana',
      proveedor: `${fechaLegible(total.desde)} al ${fechaLegible(total.hasta)}`,
      monto: total.monto,
    })),
    { ...VACIA, seccion: 'Total', proveedor: `${reporte.total.cantidad} cheques`, monto: reporte.total.monto },
  ];
}

/** R7 en filas planas: los cheques, los totales y, al final, el corte y las leyendas. */
export function aFilasExportadasDeCheques(reporte: ReporteDeChequesPosfechadosDto): FilaExportadaDeCheques[] {
  return [
    ...reporte.filas.map(filaDeCheque),
    ...filasDeTotales(reporte),
    nota(`Cheques posfechados al ${fechaLegible(reporte.corte)}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de R7: solo se exporta, nunca se importa. */
export const columnasDeChequesPosfechados: Columna[] = [
  seccion,
  fecha('fecha', 'Fecha del cheque'),
  entero('diasQueFaltan', 'Días que faltan'),
  texto('cuenta', 'Cuenta'),
  texto('numeroDeCheque', 'Número de cheque'),
  { clave: 'proveedor', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  texto('pago', 'Pago'),
  dinero('monto', 'Monto'),
  siNo('cobrado', 'Cobrado'),
  texto('cobradoEn', 'Cobrado en'),
];
