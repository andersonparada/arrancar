import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { tituloDeDocumento } from '../detalles-de-documento';
import type {
  FilaDeSaldoAFavor,
  ReporteDeSaldosAFavor,
  TramoDePrescripcion,
} from '../../servicios/tipos-de-reportes-de-proveedor';
import type { TotalDelReporte } from './resumen-de-reportes';

export interface FiltrosDeSaldosAFavor {
  corte: string;
  proveedorId: string;
  incluirSinSaldo: boolean;
}

export const filtrosDeSaldosAFavorIniciales = (hoy: string, proveedorId = '', corte = ''): FiltrosDeSaldosAFavor => ({
  corte: corte || hoy,
  proveedorId,
  incluirSinSaldo: false,
});

export const consultaDeSaldosAFavor = (filtros: FiltrosDeSaldosAFavor): Consulta => ({
  corte: filtros.corte,
  proveedorId: filtros.proveedorId || undefined,
  incluirSinSaldo: filtros.incluirSinSaldo || undefined,
});

export const cantidadDeFiltrosDeSaldosAFavor = (filtros: FiltrosDeSaldosAFavor, hoy: string): number =>
  [filtros.corte !== hoy, !!filtros.proveedorId, filtros.incluirSinSaldo].filter(Boolean).length;

export const TEXTOS_DE_TRAMO_DE_PRESCRIPCION: Record<TramoDePrescripcion, string> = {
  menos_de_1: 'Menos de 1 año',
  de_1_a_2: '1 a 2 años',
  de_2_a_3: '2 a 3 años',
  de_3_a_4: '3 a 4 años',
  de_4_a_5: '4 a 5 años',
  de_5_o_mas: '5 años o más',
};

export const tituloDeLaNota = (fila: FilaDeSaldoAFavor): string =>
  tituloDeDocumento({ tipo: 'nota_de_credito', serie: fila.serie, numero: fila.numero });

/** «2 años» o «Menos de 1 año», sobre los años cumplidos desde el último movimiento. */
export function textoDeAntiguedad({ aniosDesdeElUltimoMovimiento: anios }: FilaDeSaldoAFavor): string {
  if (anios === 0) return 'Menos de 1 año';
  return `${anios} ${anios === 1 ? 'año' : 'años'}`;
}

/** Las notas dentro del plazo y, aparte, las que ya pasaron la fecha de posible prescripción. */
export function separarPorPrescripcion(filas: FilaDeSaldoAFavor[]): {
  vigentes: FilaDeSaldoAFavor[];
  prescritas: FilaDeSaldoAFavor[];
} {
  return {
    vigentes: filas.filter((fila) => !fila.posiblementePrescrito),
    prescritas: filas.filter((fila) => fila.posiblementePrescrito),
  };
}

/** Las cifras de arriba de R4: el total y lo posiblemente prescrito, que se muestra aparte. */
export function totalesDeSaldosAFavor(reporte: ReporteDeSaldosAFavor): TotalDelReporte[] {
  return [
    { etiqueta: 'Saldo a favor total', valor: formatearMonto(reporte.total), destacado: true },
    { etiqueta: reporte.filas.length === 1 ? 'Nota' : 'Notas', valor: String(reporte.filas.length) },
    {
      etiqueta: 'Posiblemente prescrito',
      valor: `${formatearMonto(reporte.posiblementePrescrito.total)} (${reporte.posiblementePrescrito.cantidad})`,
    },
  ];
}

export const lineasDeImpresionDeSaldosAFavor = (filtros: FiltrosDeSaldosAFavor, proveedor: string | null): string[] =>
  [
    `Saldos a favor al ${formatearFecha(filtros.corte)}`,
    `Proveedor: ${proveedor ?? 'todos'}`,
    filtros.incluirSinSaldo ? 'Incluye notas sin saldo' : '',
  ].filter(Boolean);
