import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  FilaDeComprobanteDto,
  GrupoDeFondoDto,
  ReporteDePendientesDto,
  ReporteSinDocumentoDto,
} from '../aplicacion/dto/reportes.dto.js';
import { fechaLegible } from '../dominio/fechas.js';
import { dinero, fecha, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de CC-R1 y CC-R3: un comprobante, el subtotal de un fondo, el total o una nota. */
export interface FilaExportadaDeComprobantes {
  seccion: string;
  fondo: string | null;
  documento: string | null;
  proveedor: string | null;
  fecha: string | null;
  concepto: string | null;
  deducible: boolean | null;
  motivo: string | null;
  monto: string | null;
}

const VACIA: FilaExportadaDeComprobantes = {
  seccion: '',
  fondo: null,
  documento: null,
  proveedor: null,
  fecha: null,
  concepto: null,
  deducible: null,
  motivo: null,
  monto: null,
};

const nota = (mensaje: string): FilaExportadaDeComprobantes => ({ ...VACIA, seccion: 'Nota', concepto: mensaje });

const filaDe = (fondo: string, fila: FilaDeComprobanteDto): FilaExportadaDeComprobantes => ({
  ...VACIA,
  seccion: 'Comprobante',
  fondo,
  documento: fila.documento,
  proveedor: fila.proveedor,
  fecha: fila.fecha,
  concepto: fila.concepto,
  deducible: fila.deducible,
  motivo: fila.motivo,
  monto: fila.monto,
});

const filasDelFondo = (grupo: GrupoDeFondoDto): FilaExportadaDeComprobantes[] => [
  ...grupo.filas.map((fila) => filaDe(grupo.fondoNombre, fila)),
  {
    ...VACIA,
    seccion: 'Subtotal',
    fondo: grupo.fondoNombre,
    concepto: `${grupo.cantidad} comprobantes`,
    monto: grupo.total,
  },
];

interface ReporteDeComprobantes {
  fondos: GrupoDeFondoDto[];
  total: { cantidad: number; total: string };
  leyendas: string[];
}

function aFilas(reporte: ReporteDeComprobantes, periodo: string): FilaExportadaDeComprobantes[] {
  return [
    ...reporte.fondos.flatMap(filasDelFondo),
    { ...VACIA, seccion: 'Total', concepto: `${reporte.total.cantidad} comprobantes`, monto: reporte.total.total },
    nota(periodo),
    ...reporte.leyendas.map(nota),
  ];
}

/** CC-R1 en filas planas. */
export const aFilasExportadasDePendientes = (reporte: ReporteDePendientesDto) =>
  aFilas(reporte, `Pendiente de reponer al ${fechaLegible(reporte.corte)}.`);

/** CC-R3 en filas planas. */
export const aFilasExportadasSinDocumento = (reporte: ReporteSinDocumentoDto) =>
  aFilas(reporte, `Gastos sin documento fiscal del ${fechaLegible(reporte.desde)} al ${fechaLegible(reporte.hasta)}.`);

const columnasBase: Columna[] = [
  seccion,
  texto('fondo', 'Fondo'),
  texto('documento', 'Documento'),
  texto('proveedor', 'Proveedor o beneficiario'),
  fecha('fecha', 'Fecha'),
  texto('concepto', 'Concepto de gasto'),
  siNo('deducible', 'Deducible'),
];

/** Las columnas del Excel de CC-R1: solo se exporta, nunca se importa. */
export const columnasDePendientes: Columna[] = [...columnasBase, dinero('monto', 'Monto')];

/** Las columnas del Excel de CC-R3: lo mismo, con el motivo de no tener documento fiscal. */
export const columnasSinDocumento: Columna[] = [...columnasBase, texto('motivo', 'Motivo'), dinero('monto', 'Monto')];
