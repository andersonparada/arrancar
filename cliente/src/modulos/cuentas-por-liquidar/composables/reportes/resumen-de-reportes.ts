import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeAnticiposPorLiquidar, ReporteDeNoLiquidado } from '../../servicios/tipos-de-reportes';

export interface TotalDelReporte {
  etiqueta: string;
  valor: string;
  /** Resalta la cifra principal. */
  destacado?: boolean;
}

/** Las cifras de arriba de CL-R1: lo que falta por justificar, cuánto está vencido y, aparte, lo gastado de más. */
export function totalesDeAnticiposPorLiquidar({ total }: ReporteDeAnticiposPorLiquidar): TotalDelReporte[] {
  const aReembolsar =
    Number(total.aReembolsar) > 0
      ? [{ etiqueta: 'A reembolsar a beneficiarios', valor: formatearMonto(total.aReembolsar) }]
      : [];
  return [
    { etiqueta: 'Por justificar', valor: formatearMonto(total.porJustificar), destacado: true },
    { etiqueta: 'De anticipos vencidos', valor: formatearMonto(total.porJustificarVencido) },
    { etiqueta: total.anticipos === 1 ? 'Anticipo' : 'Anticipos', valor: String(total.anticipos) },
    { etiqueta: 'Vencidos', valor: String(total.vencidos) },
    { etiqueta: 'Entregado', valor: formatearMonto(total.monto) },
    ...aReembolsar,
  ];
}

/** Las cifras de arriba de CL-R2: el total y lo de cada destino. */
export function totalesDeNoLiquidado({ total, grupos }: ReporteDeNoLiquidado): TotalDelReporte[] {
  return [
    { etiqueta: 'No liquidado en el período', valor: formatearMonto(total.monto), destacado: true },
    { etiqueta: total.cantidad === 1 ? 'Anticipo' : 'Anticipos', valor: String(total.cantidad) },
    ...grupos.map((g) => ({ etiqueta: g.titulo, valor: formatearMonto(g.monto) })),
  ];
}
