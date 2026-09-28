import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Chequera } from '../../servicios/chequeras.api';

/** El rango legible de una chequera: su serie (si tiene) y el intervalo de números. */
export const rangoDeChequera = (registro: Pick<Chequera, 'serie' | 'desde' | 'hasta'>): string =>
  `${registro.serie ?? ''}${registro.desde}-${registro.hasta}`;

/** Lo que muestra la tarjeta de una chequera: sus conteos por estado. */
export function detallesDeChequera(registro: Chequera): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Disponibles', valor: String(registro.disponibles) },
    { etiqueta: 'Emitidos', valor: String(registro.emitidos) },
    { etiqueta: 'Anulados', valor: String(registro.anulados) },
  ];
}
