import type { DatosDeCambioDeFormulario } from '../../servicios/cheques.api';
import type { DatosDeBaja } from '../../servicios/datos-de-baja';
import { fechaDeHoy } from '../comunes/baja-de-registro';

/**
 * El papel de un cheque impreso: si sigue en la empresa se **inutiliza** (su pago pasa a otro formulario); si se perdió o
 * salió de la empresa se **anula como extraviado** (el título pudo circular, hay que avisar al banco por escrito).
 */
export type DestinoDelPapel = 'inutilizar' | 'extraviado';

export interface EdicionDeCambioDeFormulario {
  abierta: boolean;
  chequeId: string | null;
  chequeraId: string | null;
  titulo: string;
  /** El servidor dice si el pago puede pasar a otro formulario; si no, solo queda declarar el papel extraviado. */
  puedePasar: boolean;
  destino: DestinoDelPapel;
  /** El cheque disponible que recibe el pago (solo al inutilizar). */
  chequeDestinoId: string | null;
  enCustodia: boolean;
  papelConservado: boolean;
  motivo: string;
  /** La fecha del movimiento inverso si el mes ya está conciliado (solo al anular como extraviado). */
  fecha: string;
}

export const cambioCerrado = (): EdicionDeCambioDeFormulario => ({
  abierta: false,
  chequeId: null,
  chequeraId: null,
  titulo: '',
  puedePasar: true,
  destino: 'inutilizar',
  chequeDestinoId: null,
  enCustodia: false,
  papelConservado: false,
  motivo: '',
  fecha: '',
});

/** La ventana abierta (si el pago no puede pasar a otro formulario, ya viene en «extraviado»): se supone que el papel sigue en la empresa, pero ninguna confirmación viene marcada. */
export const cambioNuevo = (
  cheque: { id: string; chequeraId: string },
  titulo: string,
  puedePasar = true,
): EdicionDeCambioDeFormulario => ({
  ...cambioCerrado(),
  abierta: true,
  puedePasar,
  destino: puedePasar ? 'inutilizar' : 'extraviado',
  chequeId: cheque.id,
  chequeraId: cheque.chequeraId,
  titulo,
  fecha: fechaDeHoy(),
});

/** ¿Ya se puede confirmar? Al inutilizar hacen falta el destino, el motivo y las dos confirmaciones; al extraviar, el motivo. */
export function sePuedeConfirmar(edicion: EdicionDeCambioDeFormulario): boolean {
  if (!edicion.motivo.trim()) return false;
  if (edicion.destino === 'extraviado') return true;
  return edicion.chequeDestinoId !== null && edicion.enCustodia && edicion.papelConservado;
}

/** Lo que dice el botón de confirmar. */
export const textoDeConfirmar = (destino: DestinoDelPapel): string =>
  destino === 'inutilizar' ? 'Pasar a otro formulario' : 'Anular como extraviado';

/** Lo que se manda al pasar el pago a otro formulario. */
export const datosDeCambio = (edicion: EdicionDeCambioDeFormulario): DatosDeCambioDeFormulario => ({
  chequeDestinoId: edicion.chequeDestinoId ?? '',
  motivo: edicion.motivo.trim(),
  enCustodia: edicion.enCustodia,
  papelConservado: edicion.papelConservado,
});

/** Lo que se manda al anular como extraviado. */
export const datosDeExtravio = (edicion: EdicionDeCambioDeFormulario): DatosDeBaja => ({
  motivo: edicion.motivo.trim(),
  fecha: edicion.fecha,
});

/** El resumen de lo que va a pasar al confirmar, con lo que cambia en el pago. */
export function resumenDelCambio(edicion: Pick<EdicionDeCambioDeFormulario, 'titulo' | 'destino'>): string {
  if (edicion.destino === 'extraviado') {
    return `Se anulará el ${edicion.titulo} y también su pago: un cheque perdido pudo circular. Después de anular, avise al banco por escrito para que no lo pague.`;
  }
  return `El pago del ${edicion.titulo} pasará al cheque que elija y este quedará anulado como inutilizado, sin movimiento. El pago no cambia: solo cambia el número del cheque.`;
}

/** Los cheques disponibles de una chequera de la misma cuenta, con la serie de esa chequera. */
export interface DisponiblesDeChequera {
  serie: string | null;
  cheques: { id: string; numero: number }[];
}

/** Los destinos posibles de todas las chequeras activas de la cuenta, por serie y número. */
export function opcionesDeDestino(grupos: DisponiblesDeChequera[]): { valor: string; texto: string }[] {
  return grupos
    .flatMap((grupo) => grupo.cheques.map((cheque) => ({ ...cheque, serie: grupo.serie ?? '' })))
    .sort((a, b) => a.serie.localeCompare(b.serie, 'es') || a.numero - b.numero)
    .map((cheque) => ({ valor: cheque.id, texto: `Cheque No. ${cheque.serie}${cheque.numero}` }));
}
