import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Transferencia } from '../../servicios/transferencias.api';

/** El título de la tarjeta: cuenta de origen → cuenta de destino. */
export const tituloDeTransferencia = (transferencia: Transferencia): string =>
  `${formatearTexto(transferencia.cuentaOrigenNombre)} → ${formatearTexto(transferencia.cuentaDestinoNombre)}`;

/** Lo que muestra la tarjeta de la transferencia; el monto va aparte, destacado. */
export function detallesDeTransferencia(transferencia: Transferencia): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Fecha', valor: formatearFecha(transferencia.fecha) },
    { etiqueta: 'Monto', valor: formatearMonto(transferencia.monto) },
    { etiqueta: 'Referencia', valor: formatearTexto(transferencia.referencia) },
  ];
  if (transferencia.observaciones) detalles.push({ etiqueta: 'Observaciones', valor: transferencia.observaciones });
  if (transferencia.anuladaEn) {
    detalles.push({ etiqueta: 'Motivo de anulación', valor: formatearTexto(transferencia.motivoDeAnulacion) });
  }
  return detalles;
}
