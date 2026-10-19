import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import { REGLAS_DE_RETENCION } from '../../textos-de-documentos';

const aCentavos = (monto: string): number => Math.round(Number(monto) * 100);

/** Qué retención es: el impuesto y quién la origina. */
export const nombreDeRetencion = ({ regla, impuesto }: Pick<RetencionDeDocumento, 'regla' | 'impuesto'>): string =>
  REGLAS_DE_RETENCION[regla] ?? `Retención de ${impuesto.toUpperCase()}`;

/** «Quitada» o «Ajustada» si el usuario cambió lo que el sistema propuso; `null` si quedó igual. */
export function estadoDeRetencion({ monto, montoPropuesto }: RetencionDeDocumento): string | null {
  if (aCentavos(monto) === aCentavos(montoPropuesto)) return null;
  return aCentavos(monto) === 0 ? 'Quitada' : 'Ajustada';
}

/** Los números de una retención, con formato. El ISR por escalones no tiene un porcentaje único. */
export function cifrasDeRetencion(retencion: RetencionDeDocumento): { etiqueta: string; valor: string }[] {
  const porcentaje = retencion.porcentaje === null ? 'Por escalones' : `${retencion.porcentaje} %`;
  return [
    { etiqueta: 'Base', valor: formatearMonto(retencion.base) },
    { etiqueta: 'Porcentaje', valor: porcentaje },
    { etiqueta: 'Propuesto', valor: formatearMonto(retencion.montoPropuesto) },
    { etiqueta: 'Retenido', valor: formatearMonto(retencion.monto) },
    { etiqueta: 'Fecha', valor: formatearFecha(retencion.fecha) },
  ];
}
