import type { ParteDeApertura } from '../../servicios/tipos-de-saldos-iniciales';
import { INSIGNIA_DE_APERTURA } from '../comunes/de-apertura';

interface ConEstado {
  estado: 'disponible' | 'emitido' | 'anulado';
  parteDeApertura: ParteDeApertura | null;
  causaDeAnulacion?: string | null;
  impresoEn?: string | null;
}

/** Cómo terminó un anulado: inutilizado, extraviado o, si no, «Anulado». */
function insigniaDeAnulado(causa: string | null | undefined): string {
  if (causa === 'inutilizado') return 'Inutilizado';
  return causa === 'extraviado' ? 'Extraviado' : 'Anulado';
}

/**
 * La etiqueta de la tarjeta de un cheque: un anulado dice cómo terminó (inutilizado, extraviado o anulado); luego
 * «Carga inicial» (un cheque de la carga inicial siempre está emitido y no se imprime); si no, «Impreso» o «Emitido».
 * Un cheque disponible no lleva etiqueta.
 */
export function insigniaDeCheque(cheque: ConEstado): string | undefined {
  if (cheque.estado === 'anulado') return insigniaDeAnulado(cheque.causaDeAnulacion);
  if (cheque.parteDeApertura !== null) return INSIGNIA_DE_APERTURA;
  if (cheque.estado !== 'emitido') return undefined;
  return cheque.impresoEn ? 'Impreso' : 'Emitido';
}

/** La de la lista de la empresa: todos son emitidos o anulados, así que «Emitido» no aporta y no se muestra. */
export function insigniaDeChequeListado(cheque: ConEstado): string | undefined {
  const insignia = insigniaDeCheque(cheque);
  return insignia === 'Emitido' ? undefined : insignia;
}
