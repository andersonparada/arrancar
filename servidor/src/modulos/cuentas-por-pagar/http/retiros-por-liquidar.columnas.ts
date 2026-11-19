import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  FilaDeRetiroPorLiquidarDto,
  ReporteDeRetirosPorLiquidarDto,
} from '../aplicacion/dto/reportes-de-efectivo.dto.js';
import { fechaLegible } from '../dominio/avisos.js';
import { dinero, entero, fecha, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de R10: un retiro, el total o una nota (corte y leyendas). */
export interface FilaExportadaDeRetiros {
  seccion: string;
  numero: string | null;
  fecha: string | null;
  forma: string | null;
  documento: number | null;
  custodio: string | null;
  monto: string | null;
  pagado: string | null;
  disponible: string | null;
  diasAbierto: number | null;
  deMesAnterior: boolean | null;
}

const VACIA: FilaExportadaDeRetiros = {
  seccion: '',
  numero: null,
  fecha: null,
  forma: null,
  documento: null,
  custodio: null,
  monto: null,
  pagado: null,
  disponible: null,
  diasAbierto: null,
  deMesAnterior: null,
};

const nota = (mensaje: string): FilaExportadaDeRetiros => ({ ...VACIA, seccion: 'Nota', custodio: mensaje });

const filaDeRetiro = (retiro: FilaDeRetiroPorLiquidarDto): FilaExportadaDeRetiros => ({
  ...VACIA,
  seccion: 'Retiros',
  numero: retiro.numero,
  fecha: retiro.fecha,
  forma: retiro.forma === 'cheque' ? 'Cheque' : 'Nota de débito',
  documento: retiro.documento,
  custodio: retiro.custodio,
  monto: retiro.monto,
  pagado: retiro.pagado,
  disponible: retiro.disponible,
  diasAbierto: retiro.diasAbierto,
  deMesAnterior: retiro.deMesAnterior,
});

/** R10 en filas planas: los retiros, el total y, al final, el corte y las leyendas. */
export function aFilasExportadasDeRetiros(reporte: ReporteDeRetirosPorLiquidarDto): FilaExportadaDeRetiros[] {
  const { total } = reporte;
  return [
    ...reporte.filas.map(filaDeRetiro),
    {
      ...VACIA,
      seccion: 'Total',
      custodio: `${total.cantidad} retiros`,
      monto: total.monto,
      pagado: total.pagado,
      disponible: total.disponible,
    },
    nota(`Retiros de efectivo por liquidar al ${fechaLegible(reporte.corte)}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de R10: solo se exporta, nunca se importa. */
export const columnasDeRetirosPorLiquidar: Columna[] = [
  seccion,
  texto('numero', 'Retiro'),
  fecha('fecha', 'Fecha'),
  texto('forma', 'Forma'),
  entero('documento', 'Cheque o nota'),
  { clave: 'custodio', titulo: 'Custodio', requerido: true, tipo: 'texto' },
  dinero('monto', 'Monto'),
  dinero('pagado', 'Pagado al corte'),
  dinero('disponible', 'Disponible al corte'),
  entero('diasAbierto', 'Días abierto'),
  siNo('deMesAnterior', 'De un mes anterior'),
];
