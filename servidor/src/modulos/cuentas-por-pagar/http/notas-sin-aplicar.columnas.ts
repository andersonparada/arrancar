import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  FilaDeNotaSinAplicarDto,
  ReporteDeNotasSinAplicarDto,
} from '../aplicacion/dto/reportes-de-efectivo.dto.js';
import { fechaLegible } from '../dominio/avisos.js';
import { dinero, entero, fecha, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de R11: una nota, el total o una nota de texto (corte y leyendas). */
export interface FilaExportadaDeNotas {
  seccion: string;
  cuenta: string | null;
  fecha: string | null;
  numero: number | null;
  referencia: string | null;
  monto: string | null;
  aplicado: string | null;
  disponible: string | null;
  diasSinAplicar: number | null;
  conciliada: boolean | null;
}

const VACIA: FilaExportadaDeNotas = {
  seccion: '',
  cuenta: null,
  fecha: null,
  numero: null,
  referencia: null,
  monto: null,
  aplicado: null,
  disponible: null,
  diasSinAplicar: null,
  conciliada: null,
};

const nota = (mensaje: string): FilaExportadaDeNotas => ({ ...VACIA, seccion: 'Nota', cuenta: mensaje });

const filaDeNota = (fila: FilaDeNotaSinAplicarDto): FilaExportadaDeNotas => ({
  ...VACIA,
  seccion: 'Notas',
  cuenta: fila.cuenta,
  fecha: fila.fecha,
  numero: fila.numero,
  referencia: fila.referencia,
  monto: fila.monto,
  aplicado: fila.aplicado,
  disponible: fila.disponible,
  diasSinAplicar: fila.diasSinAplicar,
  conciliada: fila.conciliada,
});

/** R11 en filas planas: las notas, el total y, al final, el corte y las leyendas. */
export function aFilasExportadasDeNotas(reporte: ReporteDeNotasSinAplicarDto): FilaExportadaDeNotas[] {
  const { total } = reporte;
  return [
    ...reporte.filas.map(filaDeNota),
    {
      ...VACIA,
      seccion: 'Total',
      cuenta: `${total.cantidad} notas`,
      monto: total.monto,
      aplicado: total.aplicado,
      disponible: total.disponible,
    },
    nota(`Notas de débito para proveedores sin aplicar al ${fechaLegible(reporte.corte)}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de R11: solo se exporta, nunca se importa. */
export const columnasDeNotasSinAplicar: Columna[] = [
  seccion,
  { clave: 'cuenta', titulo: 'Cuenta', requerido: true, tipo: 'texto' },
  fecha('fecha', 'Fecha'),
  entero('numero', 'Número'),
  texto('referencia', 'Referencia'),
  dinero('monto', 'Monto'),
  dinero('aplicado', 'Aplicado'),
  dinero('disponible', 'Disponible'),
  entero('diasSinAplicar', 'Días sin aplicar'),
  siNo('conciliada', 'Conciliada'),
];
