import { formatearFecha, formatearTexto } from '@/modulos/core/utilidades/formato';
import { CLASE_DE_TIPO, SIGNO_DE_TIPO } from '../movimientos/estilo-de-tipo';
import { OPCIONES_DE_TIPO } from './edicion-de-nota';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Movimiento } from '../../servicios/movimientos.api';

export { CLASE_DE_TIPO, SIGNO_DE_TIPO };

export const tituloDeNota = (nota: Pick<Movimiento, 'tipo'>): string =>
  OPCIONES_DE_TIPO[nota.tipo as 'credito' | 'debito'];

/** Lo que muestra la tarjeta de la nota; el monto va aparte, destacado y con color. */
export function detallesDeNota(nota: Movimiento): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Cuenta', valor: formatearTexto(nota.cuentaBancariaNombre) },
    { etiqueta: 'Fecha', valor: formatearFecha(nota.fecha) },
    { etiqueta: 'Referencia', valor: formatearTexto(nota.referencia) },
    { etiqueta: 'Beneficiario u origen', valor: formatearTexto(nota.beneficiario) },
  ];
  if (nota.observaciones) detalles.push({ etiqueta: 'Observaciones', valor: nota.observaciones });
  if (nota.anuladoEn) detalles.push({ etiqueta: 'Motivo de anulación', valor: formatearTexto(nota.motivoDeAnulacion) });
  return detalles;
}
