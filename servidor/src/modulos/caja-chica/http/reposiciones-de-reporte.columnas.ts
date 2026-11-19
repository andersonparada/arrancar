import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  ConceptoDeReposicionesDto,
  FondoDeReposicionesDto,
  ReporteDeReposicionesDto,
  ReposicionDeReporteDto,
} from '../aplicacion/dto/reportes.dto.js';
import { fechaLegible } from '../dominio/fechas.js';
import { dinero, fecha, seccion, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de CC-R2: una reposición, un concepto de gasto, un subtotal, el total o una nota. */
export interface FilaExportadaDeReposiciones {
  seccion: string;
  fondo: string | null;
  reposicion: string | null;
  fecha: string | null;
  respaldo: string | null;
  concepto: string | null;
  deducible: string | null;
  noDeducible: string | null;
  monto: string | null;
}

const VACIA: FilaExportadaDeReposiciones = {
  seccion: '',
  fondo: null,
  reposicion: null,
  fecha: null,
  respaldo: null,
  concepto: null,
  deducible: null,
  noDeducible: null,
  monto: null,
};

const nota = (mensaje: string): FilaExportadaDeReposiciones => ({ ...VACIA, seccion: 'Nota', concepto: mensaje });

const filaDeReposicion = (fondo: string, r: ReposicionDeReporteDto): FilaExportadaDeReposiciones => ({
  ...VACIA,
  seccion: 'Reposición',
  fondo,
  reposicion: `Reposición ${r.numero}`,
  fecha: r.fecha,
  respaldo: r.respaldo,
  monto: r.monto,
});

const filaDeConcepto = (fondo: string, c: ConceptoDeReposicionesDto): FilaExportadaDeReposiciones => ({
  ...VACIA,
  seccion: 'Concepto',
  fondo,
  concepto: c.concepto,
  deducible: c.deducible,
  noDeducible: c.noDeducible,
  monto: c.total,
});

const filasDelFondo = (grupo: FondoDeReposicionesDto): FilaExportadaDeReposiciones[] => [
  ...grupo.reposiciones.map((r) => filaDeReposicion(grupo.fondoNombre, r)),
  ...grupo.conceptos.map((c) => filaDeConcepto(grupo.fondoNombre, c)),
  {
    ...VACIA,
    seccion: 'Subtotal',
    fondo: grupo.fondoNombre,
    deducible: grupo.deducible,
    noDeducible: grupo.noDeducible,
    monto: grupo.total,
  },
];

/** CC-R2 en filas planas: por fondo sus reposiciones y sus conceptos, y al final el total, el período y las leyendas. */
export function aFilasExportadasDeReposiciones(reporte: ReporteDeReposicionesDto): FilaExportadaDeReposiciones[] {
  const { total } = reporte;
  return [
    ...reporte.fondos.flatMap(filasDelFondo),
    {
      ...VACIA,
      seccion: 'Total',
      concepto: `${total.cantidad} reposiciones`,
      deducible: total.deducible,
      noDeducible: total.noDeducible,
      monto: total.total,
    },
    nota(`Reposiciones del ${fechaLegible(reporte.desde)} al ${fechaLegible(reporte.hasta)}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de CC-R2: solo se exporta, nunca se importa. */
export const columnasDeReposiciones: Columna[] = [
  seccion,
  texto('fondo', 'Fondo'),
  texto('reposicion', 'Reposición'),
  fecha('fecha', 'Fecha'),
  texto('respaldo', 'Cheque o nota'),
  texto('concepto', 'Concepto de gasto'),
  dinero('deducible', 'Deducible'),
  dinero('noDeducible', 'No deducible'),
  dinero('monto', 'Monto'),
];
