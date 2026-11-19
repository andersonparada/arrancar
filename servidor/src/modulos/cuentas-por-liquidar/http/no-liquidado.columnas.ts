import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ReporteDeNoLiquidadoDto } from '../aplicacion/dto/reportes.dto.js';
import { fechaLegible } from '../dominio/fechas.js';
import { dinero, entero, fecha, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de CL-R2: un anticipo con lo no liquidado, el total de un destino o una nota. */
export interface FilaExportadaDeNoLiquidado {
  seccion: string;
  destino: string | null;
  numero: string | null;
  beneficiario: string | null;
  esEmpleado: boolean | null;
  fechaDeLiquidacion: string | null;
  noLiquidado: string | null;
  cuotas: number | null;
  valorDeCuota: string | null;
  motivo: string | null;
}

const VACIA: FilaExportadaDeNoLiquidado = {
  seccion: '',
  destino: null,
  numero: null,
  beneficiario: null,
  esEmpleado: null,
  fechaDeLiquidacion: null,
  noLiquidado: null,
  cuotas: null,
  valorDeCuota: null,
  motivo: null,
};

const nota = (mensaje: string): FilaExportadaDeNoLiquidado => ({ ...VACIA, seccion: 'Nota', destino: mensaje });

/** CL-R2 en filas planas: lo no liquidado por destino, el total y, al final, el período y las leyendas. */
export function aFilasExportadasDeNoLiquidado(reporte: ReporteDeNoLiquidadoDto): FilaExportadaDeNoLiquidado[] {
  return [
    ...reporte.grupos.flatMap((grupo) => [
      ...grupo.filas.map((fila) => ({
        ...VACIA,
        seccion: 'No liquidado',
        destino: grupo.titulo,
        numero: fila.numero,
        beneficiario: fila.beneficiario,
        esEmpleado: fila.esEmpleado,
        fechaDeLiquidacion: fila.fechaDeLiquidacion,
        noLiquidado: fila.noLiquidado,
        cuotas: fila.cuotas,
        valorDeCuota: fila.valorDeCuota,
        motivo: fila.motivo,
      })),
      { ...VACIA, seccion: 'Subtotal', destino: `${grupo.titulo}: ${grupo.cantidad}`, noLiquidado: grupo.monto },
    ]),
    { ...VACIA, seccion: 'Total', destino: `${reporte.total.cantidad} anticipos`, noLiquidado: reporte.total.monto },
    nota(`Lo no liquidado del ${fechaLegible(reporte.desde)} al ${fechaLegible(reporte.hasta)}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de CL-R2: solo se exporta, nunca se importa. */
export const columnasDeNoLiquidado: Columna[] = [
  seccion,
  { clave: 'destino', titulo: 'Destino', requerido: true, tipo: 'texto' },
  texto('numero', 'Anticipo'),
  texto('beneficiario', 'Beneficiario'),
  siNo('esEmpleado', 'Es empleado'),
  fecha('fechaDeLiquidacion', 'Liquidado el'),
  dinero('noLiquidado', 'No liquidado'),
  entero('cuotas', 'Cuotas'),
  dinero('valorDeCuota', 'Valor de la cuota'),
  texto('motivo', 'Motivo'),
];
