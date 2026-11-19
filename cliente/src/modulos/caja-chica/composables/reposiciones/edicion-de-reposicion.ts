import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { Comprobante } from '../../servicios/tipos-de-comprobantes';
import type { ReposicionSolicitada } from '../../servicios/tipos-de-reposiciones';
import { centavosDe } from '../dinero';
import type { EdicionDeEntrega } from '../fondos/edicion-de-fondo';

/** Lo firmado de un comprobante en centavos: las notas de crédito y los sobrantes restan. */
const firmado = (comprobante: Comprobante): number =>
  (comprobante.resta ? -1 : 1) * (centavosDe(comprobante.monto) ?? 0);

/** Los comprobantes que se reponen, de entre lo pendiente: por omisión, todos. */
export const idsPorOmision = (pendientes: readonly Comprobante[]): string[] => pendientes.map(({ id }) => id);

/** Lo que va a pasar al reponer, para confirmarlo antes de enviar. */
export interface ResumenDeReposicion {
  cantidad: number;
  /** Texto con dos decimales; puede ser cero o negativo (el servidor lo rechaza: no hay nada que reponer). */
  total: string;
  notasDeCredito: number;
  faltantes: number;
  sobrantes: number;
  /** Se eligió todo lo pendiente: solo entonces el desglose del servidor corresponde a lo elegido. */
  esTodo: boolean;
}

export function resumenDeReposicion(pendientes: readonly Comprobante[], ids: readonly string[]): ResumenDeReposicion {
  const elegidos = pendientes.filter(({ id }) => ids.includes(id));
  const centavos = elegidos.reduce((suma, comprobante) => suma + firmado(comprobante), 0);
  return {
    cantidad: elegidos.length,
    total: (centavos / 100).toFixed(2),
    notasDeCredito: elegidos.filter(({ esNotaDeCredito }) => esNotaDeCredito).length,
    faltantes: elegidos.filter(({ clase }) => clase === 'faltante').length,
    sobrantes: elegidos.filter(({ clase }) => clase === 'sobrante').length,
    esTodo: elegidos.length === pendientes.length,
  };
}

/** Lo que falta escribir antes de enviar, por campo; vacío si está completo. */
export function faltantesDeLaReposicion(edicion: EdicionDeEntrega, ids: readonly string[]): Record<string, string> {
  const faltantes: Record<string, string> = {};
  if (ids.length === 0) faltantes.comprobanteIds = 'Escoja al menos un comprobante para reponer.';
  if (!edicion.medioId) {
    const esCheque = edicion.forma === 'cheque';
    faltantes[esCheque ? 'chequeraId' : 'cuentaBancariaId'] = esCheque
      ? 'Escoja la chequera.'
      : 'Escoja la cuenta bancaria.';
  }
  return faltantes;
}

/** Cómo sale el dinero: un cheque a nombre del beneficiario escrito o, si no, del custodio; o una nota de débito. */
function medioDeLaReposicion(edicion: EdicionDeEntrega, custodio: string | null) {
  if (edicion.forma === 'cheque') {
    return {
      forma: 'cheque' as const,
      chequeraId: edicion.medioId ?? '',
      beneficiario: textoONulo(edicion.beneficiario) ?? custodio,
      noNegociable: edicion.noNegociable,
    };
  }
  return {
    forma: 'nota_de_debito' as const,
    cuentaBancariaId: edicion.medioId ?? '',
    referencia: textoONulo(edicion.referencia),
  };
}

/** El cuerpo de reponer: los comprobantes, la fecha si se escribió, y el cheque o la nota. */
export function cuerpoDeReposicion(
  edicion: EdicionDeEntrega,
  ids: readonly string[],
  custodio: string | null,
): ReposicionSolicitada {
  const fecha = edicion.fecha.trim();
  return {
    comprobanteIds: [...ids],
    ...(fecha ? { fecha } : {}),
    observaciones: textoONulo(edicion.observaciones),
    ...medioDeLaReposicion(edicion, custodio),
  };
}
