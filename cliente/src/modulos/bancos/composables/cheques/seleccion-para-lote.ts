import type { ChequeListado } from '../../servicios/cheques.api';

/** Un lote de impresión admite hasta 50 cheques de una sola chequera (lo mismo que valida el servidor). */
export const MAXIMO_DE_UN_LOTE = 50;

type ParaElLote = Pick<ChequeListado, 'id' | 'chequeraId' | 'numero' | 'puedeImprimir'>;

/** Lo que se elige para imprimir de una vez: los ids marcados (por orden de marcado). */
export type SeleccionDeLote = readonly string[];

/** Un cheque se puede marcar si el servidor dice que se puede imprimir. */
export const sePuedeMarcar = (cheque: ParaElLote): boolean => cheque.puedeImprimir;

/** La chequera de lo ya marcado; `null` si no hay nada marcado. */
function chequeraDeLaSeleccion(cheques: readonly ParaElLote[], seleccion: SeleccionDeLote): string | null {
  const primero = cheques.find((cheque) => seleccion.includes(cheque.id));
  return primero?.chequeraId ?? null;
}

/**
 * Por qué un cheque no se puede marcar ahora, o `null` si se puede: no es imprimible, es de otra chequera que la ya
 * elegida, o el lote ya llegó al tope. Un cheque ya marcado siempre se puede desmarcar.
 */
export function motivoDeBloqueo(
  cheques: readonly ParaElLote[],
  seleccion: SeleccionDeLote,
  cheque: ParaElLote,
): string | null {
  if (seleccion.includes(cheque.id)) return null;
  if (!sePuedeMarcar(cheque)) return 'No se puede imprimir.';
  const chequera = chequeraDeLaSeleccion(cheques, seleccion);
  if (chequera !== null && chequera !== cheque.chequeraId) return 'Un lote es de una sola chequera.';
  if (seleccion.length >= MAXIMO_DE_UN_LOTE) return `Un lote admite hasta ${MAXIMO_DE_UN_LOTE} cheques.`;
  return null;
}

/** Marca el cheque si no estaba marcado y lo desmarca si lo estaba; si no se puede marcar, la selección no cambia. */
export function alternarMarca(
  cheques: readonly ParaElLote[],
  seleccion: SeleccionDeLote,
  cheque: ParaElLote,
): string[] {
  if (seleccion.includes(cheque.id)) return seleccion.filter((id) => id !== cheque.id);
  return motivoDeBloqueo(cheques, seleccion, cheque) === null ? [...seleccion, cheque.id] : [...seleccion];
}

/** Todos los cheques por imprimir de la chequera de lo ya marcado (o de la del primero imprimible), hasta el tope. */
export function marcarTodosDeLaChequera(
  cheques: readonly ParaElLote[],
  seleccion: SeleccionDeLote,
  chequeraId?: string,
): string[] {
  const destino = chequeraId ?? chequeraDeLaSeleccion(cheques, seleccion);
  if (destino === null) return [...seleccion];
  return cheques
    .filter((cheque) => cheque.chequeraId === destino && sePuedeMarcar(cheque))
    .sort((a, b) => a.numero - b.numero)
    .slice(0, MAXIMO_DE_UN_LOTE)
    .map((cheque) => cheque.id);
}

/** Los ids marcados en orden de número: el papel va en orden. */
export function idsEnOrden(cheques: readonly ParaElLote[], seleccion: SeleccionDeLote): string[] {
  return cheques
    .filter((cheque) => seleccion.includes(cheque.id))
    .sort((a, b) => a.numero - b.numero)
    .map((cheque) => cheque.id);
}

/** Solo lo que sigue siendo imprimible: tras recargar la lista, los que ya se imprimieron salen de la selección. */
export const depurarSeleccion = (cheques: readonly ParaElLote[], seleccion: SeleccionDeLote): string[] =>
  seleccion.filter((id) => cheques.some((cheque) => cheque.id === id && sePuedeMarcar(cheque)));

/** «3 cheques: del 5 al 8 (falta el 7)»; los huecos se avisan aquí y otra vez al preparar la impresión. */
export function resumenDeLaSeleccion(cheques: readonly ParaElLote[], seleccion: SeleccionDeLote): string {
  const numeros = cheques
    .filter((cheque) => seleccion.includes(cheque.id))
    .map((cheque) => cheque.numero)
    .sort((a, b) => a - b);
  if (numeros.length === 0) return 'Ninguno elegido';
  const cantidad = numeros.length === 1 ? '1 cheque' : `${numeros.length} cheques`;
  const primero = numeros[0]!;
  const ultimo = numeros[numeros.length - 1]!;
  const rango = primero === ultimo ? `el ${primero}` : `del ${primero} al ${ultimo}`;
  const faltan = ultimo - primero + 1 - numeros.length;
  const huecos = faltan > 0 ? ` (con ${faltan === 1 ? 'un hueco' : `${faltan} huecos`}: el papel va en orden)` : '';
  return `${cantidad}: ${rango}${huecos}`;
}
