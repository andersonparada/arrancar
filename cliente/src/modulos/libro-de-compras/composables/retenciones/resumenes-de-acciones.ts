import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { PagoDeEntero, RetencionDelMes } from '../../servicios/retenciones.api';
import { nombreDelDocumento } from './datos-de-retenciones';

/** Lo que va a pasar al quitar una constancia, para confirmar antes de hacerlo. */
export function resumenDeQuitarConstancia(retencion: RetencionDelMes | null): string[] {
  if (!retencion) return [];
  return [
    `Se quita la constancia ${retencion.constanciaNumero ?? ''} del ${formatearFecha(retencion.constanciaFecha)}.`,
    `Retención de ${formatearMonto(retencion.retenido)} en ${nombreDelDocumento(retencion.documento)} de ${retencion.proveedor.nombre}.`,
    'La retención sigue contando; solo queda sin constancia. Si la constancia está en la SAT, anúlela también allá.',
  ];
}

/** Lo que va a pasar al anular un pago. */
export function resumenDeAnularPago(pago: PagoDeEntero | null): string[] {
  if (!pago) return [];
  return [
    `Se anula el pago de ${formatearMonto(pago.monto)} del ${formatearFecha(pago.fechaDePago)} (${pago.documentoDePago}).`,
    'Ese monto deja de contar como pagado y el mes puede quedar con diferencia.',
  ];
}
