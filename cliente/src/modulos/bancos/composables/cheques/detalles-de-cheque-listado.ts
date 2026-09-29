import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { textoDeCausaDeAnulacion } from '../movimientos/origen-y-causa';
import type { ChequeListado } from '../../servicios/cheques.api';

/** "Cheque No. <serie><número>": igual que en el movimiento que lo emitió. */
export const tituloDeChequeListado = (registro: Pick<ChequeListado, 'serie' | 'numero'>): string =>
  `Cheque No. ${registro.serie ?? ''}${registro.numero}`;

/** Lo que muestra la tarjeta de un cheque de la lista de la empresa; el monto va aparte, destacado. */
export function detallesDeChequeListado(registro: ChequeListado): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Cuenta', valor: registro.cuentaBancariaNombre },
    { etiqueta: 'Fecha', valor: formatearFecha(registro.fecha) },
    { etiqueta: 'Beneficiario', valor: formatearTexto(registro.beneficiario) },
    { etiqueta: 'Referencia', valor: formatearTexto(registro.referencia) },
    { etiqueta: 'No negociable', valor: registro.noNegociable ? 'Sí' : 'No' },
  ];
  const causa = textoDeCausaDeAnulacion(registro.causaDeAnulacion);
  if (causa) detalles.push({ etiqueta: 'Causa de anulación', valor: causa });
  if (registro.motivoDeAnulacion) detalles.push({ etiqueta: 'Motivo de anulación', valor: registro.motivoDeAnulacion });
  return detalles;
}
