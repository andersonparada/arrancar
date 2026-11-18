import { formatearFecha, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { formatearNumeroDeComprobante } from '../comunes/numero-de-comprobante';
import { motivoDeLaBaja } from '../movimientos/estado-de-reversion';
import { textoDeOrigen } from '../movimientos/origen-y-causa';
import { CLASE_DE_TIPO, SIGNO_DE_TIPO } from '../movimientos/estilo-de-tipo';
import {
  detallesDeDesglose,
  esperaACuentasPorPagarInactivo,
  explicacionDeOrigen,
  TEXTO_DE_CUENTAS_POR_PAGAR_INACTIVO,
} from './marca-de-nota';
import { OPCIONES_DE_TIPO } from './edicion-de-nota';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Movimiento } from '../../servicios/movimientos.api';

export { CLASE_DE_TIPO, SIGNO_DE_TIPO };

export const tituloDeNota = (nota: Pick<Movimiento, 'tipo'>): string =>
  OPCIONES_DE_TIPO[nota.tipo as 'credito' | 'debito'];

/** De dónde viene la nota si la generó o la marcó otro módulo, y lo que eso implica para corregirla. */
function detallesDeOrigen(nota: Movimiento, cuentasPorPagarActivo: boolean): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  const origen = textoDeOrigen(nota);
  if (origen) detalles.push({ etiqueta: 'Origen', valor: origen.replace('Origen: ', '') });
  const explicacion = explicacionDeOrigen(nota);
  if (explicacion) detalles.push({ etiqueta: 'Nota', valor: explicacion, largo: true });
  if (esperaACuentasPorPagarInactivo(nota, cuentasPorPagarActivo)) {
    detalles.push({ etiqueta: 'Aviso', valor: TEXTO_DE_CUENTAS_POR_PAGAR_INACTIVO, largo: true });
  }
  return detalles;
}

/** Lo que muestra la tarjeta de la nota; el monto va aparte, destacado y con color. */
export function detallesDeNota(nota: Movimiento, cuentasPorPagarActivo = true): DetalleDeRegistro[] {
  const numero = formatearNumeroDeComprobante(nota);
  const detalles: DetalleDeRegistro[] = [
    ...(numero ? [{ etiqueta: 'No.', valor: numero }] : []),
    { etiqueta: 'Cuenta', valor: formatearTexto(nota.cuentaBancariaNombre) },
    { etiqueta: 'Fecha', valor: formatearFecha(nota.fecha) },
    { etiqueta: 'Concepto', valor: formatearTexto(nota.conceptoNombre) },
    { etiqueta: 'Referencia', valor: formatearTexto(nota.referencia) },
    { etiqueta: 'Beneficiario u origen', valor: formatearTexto(nota.beneficiario) },
  ];
  detalles.push(...detallesDeDesglose(nota));
  if (nota.interesBruto !== null) {
    detalles.push({ etiqueta: 'Interés bruto', valor: formatearMonto(nota.interesBruto) });
    detalles.push({ etiqueta: 'ISR retenido', valor: formatearMonto(nota.isrRetenido) });
  }
  detalles.push(...detallesDeOrigen(nota, cuentasPorPagarActivo));
  if (nota.observaciones) detalles.push({ etiqueta: 'Observaciones', valor: nota.observaciones, largo: true });
  const motivo = motivoDeLaBaja(nota);
  if (motivo) detalles.push(motivo);
  return detalles;
}
