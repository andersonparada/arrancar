import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  ReporteDeArqueos,
  ReporteDeEstadoDeFondos,
  ReporteDePendientes,
  ReporteDeReposiciones,
  ReporteSinDocumento,
} from '../../servicios/tipos-de-reportes';

export interface TotalDelReporte {
  etiqueta: string;
  valor: string;
  /** Resalta la cifra principal. */
  destacado?: boolean;
}

const plural = (cantidad: number, uno: string, varios: string): string => (cantidad === 1 ? uno : varios);

/** Las cifras de arriba de CC-R1 y CC-R3: el total y lo deducible y no deducible. */
function totalesDeComprobantes(
  total: ReporteDePendientes['total'],
  por: { titulo: string; unidad: [string, string] },
): TotalDelReporte[] {
  return [
    { etiqueta: por.titulo, valor: formatearMonto(total.total), destacado: true },
    { etiqueta: 'Deducible', valor: formatearMonto(total.deducible) },
    { etiqueta: 'No deducible', valor: formatearMonto(total.noDeducible) },
    { etiqueta: plural(total.cantidad, ...por.unidad), valor: String(total.cantidad) },
  ];
}

export const totalesDePendientes = ({ total }: ReporteDePendientes): TotalDelReporte[] =>
  totalesDeComprobantes(total, { titulo: 'Pendiente de reponer', unidad: ['Comprobante', 'Comprobantes'] });

export const totalesSinDocumento = ({ total }: ReporteSinDocumento): TotalDelReporte[] =>
  totalesDeComprobantes(total, { titulo: 'Gastado sin documento fiscal', unidad: ['Comprobante', 'Comprobantes'] });

/** Las cifras de arriba de CC-R2: lo repuesto y cuánto de eso es deducible. */
export const totalesDeReposiciones = ({ total }: ReporteDeReposiciones): TotalDelReporte[] =>
  totalesDeComprobantes(total, { titulo: 'Repuesto en el período', unidad: ['Reposición', 'Reposiciones'] });

/** Las cifras de arriba de CC-R4: lo que había en los fondos al corte. */
export function totalesDeEstadoDeFondos({ total, fondos }: ReporteDeEstadoDeFondos): TotalDelReporte[] {
  return [
    { etiqueta: 'Monto de los fondos', valor: formatearMonto(total.monto), destacado: true },
    { etiqueta: 'Efectivo esperado', valor: formatearMonto(total.efectivoEsperado) },
    { etiqueta: 'Pendiente de reponer', valor: formatearMonto(total.pendienteDeReponer) },
    { etiqueta: 'Vales abiertos', valor: formatearMonto(total.valesAbiertos) },
    { etiqueta: plural(fondos.length, 'Fondo', 'Fondos'), valor: String(fondos.length) },
  ];
}

/** Las cifras de arriba de CC-R5: cuántos arqueos y cuánto faltó y sobró. */
export function totalesDeArqueos({ total }: ReporteDeArqueos): TotalDelReporte[] {
  return [
    { etiqueta: 'Faltantes', valor: formatearMonto(total.faltantes), destacado: true },
    { etiqueta: 'Sobrantes', valor: formatearMonto(total.sobrantes) },
    { etiqueta: plural(total.cantidad, 'Arqueo', 'Arqueos'), valor: String(total.cantidad) },
  ];
}
