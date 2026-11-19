import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeDocumentosAUnaFecha, ReporteDeSaldosPorProveedor } from '../../servicios/tipos-de-reportes';

export interface TotalDelReporte {
  etiqueta: string;
  valor: string;
  /** Resalta la cifra principal. */
  destacado?: boolean;
}

/** Las cifras de arriba de R1: lo que se debe, lo que nos deben y el saldo neto de Proveedores. */
export function totalesDeSaldos({ totales }: ReporteDeSaldosPorProveedor): TotalDelReporte[] {
  return [
    { etiqueta: 'Saldo neto de Proveedores', valor: formatearMonto(totales.saldoNeto), destacado: true },
    { etiqueta: 'Saldo acreedor (se debe)', valor: formatearMonto(totales.acreedores.saldoNeto) },
    { etiqueta: 'Saldo deudor (nos deben)', valor: formatearMonto(totales.deudores.saldoNeto) },
    { etiqueta: 'Total de cargos', valor: formatearMonto(totales.totalCargos) },
    { etiqueta: 'Comprometido (posfechados)', valor: formatearMonto(totales.acreedores.comprometido) },
    { etiqueta: 'Disponible para pagar', valor: formatearMonto(totales.acreedores.disponible ?? '0') },
  ];
}

/** Las cifras de arriba de R2: de todo lo filtrado, no solo de la página que se ve. */
export function totalesDeDocumentos({ totales, total }: ReporteDeDocumentosAUnaFecha): TotalDelReporte[] {
  return [
    { etiqueta: 'Saldo', valor: formatearMonto(totales.saldo), destacado: true },
    { etiqueta: total === 1 ? 'Documento' : 'Documentos', valor: String(total) },
    { etiqueta: 'Total facturado', valor: formatearMonto(totales.total) },
    { etiqueta: 'Retenciones', valor: formatearMonto(totales.retenciones) },
    { etiqueta: 'Pagado', valor: formatearMonto(totales.pagado) },
    { etiqueta: 'Comprometido', valor: formatearMonto(totales.comprometido) },
    { etiqueta: 'Disponible para pagar', valor: formatearMonto(totales.disponible) },
  ];
}

export interface FilaDeConciliacion {
  etiqueta: string;
  valor: string;
  /** La última línea: lo que se presenta como Proveedores. */
  total?: boolean;
}

/** La conciliación al pie de R1; no hay si se filtró por proveedor o por autorización (el servidor no la manda). */
export function filasDeConciliacion({ conciliacion }: ReporteDeSaldosPorProveedor): FilaDeConciliacion[] | null {
  if (!conciliacion) return null;
  return [
    { etiqueta: 'Saldo neto de Proveedores (auxiliar)', valor: formatearMonto(conciliacion.saldoNetoDelAuxiliar) },
    { etiqueta: 'Menos: pagos a proveedores por aplicar', valor: formatearMonto(conciliacion.pagosPorAplicar) },
    {
      etiqueta: 'Proveedores, neto de pagos por aplicar',
      valor: formatearMonto(conciliacion.proveedoresNetoDePagosPorAplicar),
      total: true,
    },
  ];
}

/** El reporte de saldos está vacío cuando no hay proveedores con saldo en ninguno de los dos bloques. */
export const reporteDeSaldosVacio = (reporte: ReporteDeSaldosPorProveedor): boolean =>
  reporte.acreedores.length === 0 && reporte.deudores.length === 0;
