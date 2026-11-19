import type { ParteDeApertura } from '../../servicios/tipos-de-saldos-iniciales';
import { INSIGNIA_DE_APERTURA } from '../comunes/de-apertura';

interface ConEstado {
  estado: 'disponible' | 'emitido' | 'anulado';
  parteDeApertura: ParteDeApertura | null;
}

/**
 * La etiqueta de la tarjeta de un cheque: «Anulado» manda; luego «Carga inicial» (un cheque de la carga inicial
 * siempre está emitido, y eso ya lo dice su origen); si no, «Emitido». Un cheque disponible no lleva etiqueta.
 */
export function insigniaDeCheque({ estado, parteDeApertura }: ConEstado): string | undefined {
  if (estado === 'anulado') return 'Anulado';
  if (parteDeApertura !== null) return INSIGNIA_DE_APERTURA;
  return estado === 'emitido' ? 'Emitido' : undefined;
}

/** La de la lista de la empresa: todos son emitidos o anulados, así que «Emitido» no aporta y no se muestra. */
export function insigniaDeChequeListado({ estado, parteDeApertura }: ConEstado): string | undefined {
  const insignia = insigniaDeCheque({ estado, parteDeApertura });
  return insignia === 'Emitido' ? undefined : insignia;
}
