import { formatearFecha, formatearFechaHora, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { detalleDeApertura } from '../comunes/de-apertura';
import { textoDeCausaDeAnulacion, textoDeOrigen } from '../movimientos/origen-y-causa';
import type { ChequeListado } from '../../servicios/cheques.api';

/** "Cheque No. <serie><número>": igual que en el movimiento que lo emitió. */
export const tituloDeChequeListado = (registro: Pick<ChequeListado, 'serie' | 'numero'>): string =>
  `Cheque No. ${registro.serie ?? ''}${registro.numero}`;

/** Los datos de impresión del cheque: si es para abono en cuenta y cuándo se imprimió (si ya se imprimió). */
function detallesDeImpresion(registro: ChequeListado): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  if (registro.paraAbonoEnCuenta) detalles.push({ etiqueta: 'Para abono en cuenta', valor: 'Sí' });
  if (registro.impresoEn) detalles.push({ etiqueta: 'Impreso', valor: formatearFechaHora(registro.impresoEn) });
  return detalles;
}

/** Lo que muestra la tarjeta de un cheque de la lista de la empresa; el monto va aparte, destacado. */
export function detallesDeChequeListado(registro: ChequeListado): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Cuenta', valor: registro.cuentaBancariaNombre },
    { etiqueta: 'Fecha', valor: formatearFecha(registro.fecha) },
    { etiqueta: 'Beneficiario', valor: formatearTexto(registro.beneficiario) },
    { etiqueta: 'Referencia', valor: formatearTexto(registro.referencia) },
    { etiqueta: 'No negociable', valor: registro.noNegociable ? 'Sí' : 'No' },
  ];
  const apertura = detalleDeApertura(registro);
  if (apertura) detalles.push(apertura);
  detalles.push(...detallesDeImpresion(registro));
  const origen = textoDeOrigen(registro);
  if (origen) detalles.push({ etiqueta: 'Origen', valor: origen.replace('Origen: ', '') });
  const causa = textoDeCausaDeAnulacion(registro.causaDeAnulacion);
  if (causa) detalles.push({ etiqueta: 'Causa de anulación', valor: causa });
  if (registro.motivoDeAnulacion) detalles.push({ etiqueta: 'Motivo de anulación', valor: registro.motivoDeAnulacion });
  if (registro.aviso) detalles.push({ etiqueta: 'Aviso', valor: registro.aviso, largo: true });
  return detalles;
}
