import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ReporteDeAnticiposPorLiquidarDto } from '../aplicacion/dto/reportes.dto.js';
import { fechaLegible } from '../dominio/fechas.js';
import { dinero, entero, fecha, plural, seccion, siNo, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de CL-R1: un anticipo, un tramo, el total o una nota (corte y leyendas). */
export interface FilaExportadaDeAnticiposPorLiquidar {
  seccion: string;
  beneficiario: string | null;
  esEmpleado: boolean | null;
  numero: string | null;
  clase: string | null;
  fecha: string | null;
  fechaLimite: string | null;
  monto: string | null;
  porJustificar: string | null;
  aReembolsar: string | null;
  diasDesdeLaEntrega: number | null;
  diasVencido: number | null;
  tramo: string | null;
}

const VACIA: FilaExportadaDeAnticiposPorLiquidar = {
  seccion: '',
  beneficiario: null,
  esEmpleado: null,
  numero: null,
  clase: null,
  fecha: null,
  fechaLimite: null,
  monto: null,
  porJustificar: null,
  aReembolsar: null,
  diasDesdeLaEntrega: null,
  diasVencido: null,
  tramo: null,
};

const CLASES = { viatico: 'Viático', compra: 'Compra', otro: 'Otro' } as const;

const nota = (mensaje: string): FilaExportadaDeAnticiposPorLiquidar => ({
  ...VACIA,
  seccion: 'Nota',
  beneficiario: mensaje,
});

function filasDeAnticipos(reporte: ReporteDeAnticiposPorLiquidarDto): FilaExportadaDeAnticiposPorLiquidar[] {
  const titulos = new Map(reporte.porTramo.map((t) => [t.tramo, t.titulo]));
  return reporte.beneficiarios.flatMap((b) =>
    b.anticipos.map((a) => ({
      ...VACIA,
      seccion: 'Anticipos',
      beneficiario: b.beneficiario,
      esEmpleado: b.esEmpleado,
      numero: a.numero,
      clase: CLASES[a.clase],
      fecha: a.fecha,
      fechaLimite: a.fechaLimite,
      monto: a.monto,
      porJustificar: a.porJustificar,
      aReembolsar: a.aReembolsar,
      diasDesdeLaEntrega: a.diasDesdeLaEntrega,
      diasVencido: a.diasVencido,
      tramo: titulos.get(a.tramo) ?? null,
    })),
  );
}

function filaDelTotal(total: ReporteDeAnticiposPorLiquidarDto['total']): FilaExportadaDeAnticiposPorLiquidar {
  return {
    ...VACIA,
    seccion: 'Total',
    beneficiario: [
      plural(total.beneficiarios, 'beneficiario', 'beneficiarios'),
      plural(total.anticipos, 'anticipo', 'anticipos'),
      plural(total.vencidos, 'vencido', 'vencidos'),
    ].join(', '),
    monto: total.monto,
    porJustificar: total.porJustificar,
    aReembolsar: total.aReembolsar,
  };
}

/** CL-R1 en filas planas: los anticipos, los tramos, el total y, al final, el corte y las leyendas. */
export function aFilasExportadasDeAnticiposPorLiquidar(
  reporte: ReporteDeAnticiposPorLiquidarDto,
): FilaExportadaDeAnticiposPorLiquidar[] {
  const { total } = reporte;
  return [
    ...filasDeAnticipos(reporte),
    ...reporte.porTramo.map((t) => ({
      ...VACIA,
      seccion: 'Por antigüedad',
      tramo: t.titulo,
      beneficiario: plural(t.cantidad, 'anticipo', 'anticipos'),
      porJustificar: t.porJustificar,
    })),
    filaDelTotal(total),
    nota(`Anticipos por liquidar al ${fechaLegible(reporte.corte)}.`),
    ...reporte.leyendas.map(nota),
  ];
}

/** Las columnas del Excel de CL-R1: solo se exporta, nunca se importa. */
export const columnasDeAnticiposPorLiquidar: Columna[] = [
  seccion,
  { clave: 'beneficiario', titulo: 'Beneficiario', requerido: true, tipo: 'texto' },
  siNo('esEmpleado', 'Es empleado'),
  texto('numero', 'Anticipo'),
  texto('clase', 'Clase'),
  fecha('fecha', 'Entrega'),
  fecha('fechaLimite', 'Fecha límite'),
  dinero('monto', 'Monto'),
  dinero('porJustificar', 'Por justificar'),
  dinero('aReembolsar', 'A reembolsar'),
  entero('diasDesdeLaEntrega', 'Días desde la entrega'),
  entero('diasVencido', 'Días vencido'),
  texto('tramo', 'Antigüedad'),
];
