import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { ChequeCaduco } from '../../servicios/cheques-caducos.api';
import { aCentavos, deCentavos } from '../comunes/centavos';
import { numeroDeChequeConSerie } from './antiguedad-de-cheques';

/** Lo que el servidor dice de un cheque que no se pudo anular. */
export interface ProblemaDeCheque {
  chequeId: string;
  codigo: string;
  mensaje: string;
}

/** Cuántos cheques y qué monto suman los seleccionados (en centavos enteros: nunca se suman decimales). */
export function totalDeLaSeleccion(cheques: ChequeCaduco[], seleccion: string[]): { cantidad: number; monto: string } {
  const elegidos = cheques.filter((cheque) => seleccion.includes(cheque.chequeId));
  const centavos = elegidos.reduce((suma, cheque) => suma + aCentavos(cheque.monto), 0);
  return { cantidad: elegidos.length, monto: deCentavos(centavos) };
}

/** Deja solo lo seleccionado que sigue en la lista: al filtrar o recargar, no se anula lo que ya no se ve. */
export const seleccionVigente = (cheques: ChequeCaduco[], seleccion: string[]): string[] =>
  seleccion.filter((id) => cheques.some((cheque) => cheque.chequeId === id));

/** Marca o desmarca todos los cheques de la lista (todo lo filtrado). */
export const seleccionDeTodos = (cheques: ChequeCaduco[], marcar: boolean): string[] =>
  marcar ? cheques.map((cheque) => cheque.chequeId) : [];

/** Agrega o quita un cheque de la selección sin repetirlo. */
export const conCheque = (seleccion: string[], chequeId: string, marcado: boolean): string[] =>
  marcado ? [...new Set([...seleccion, chequeId])] : seleccion.filter((id) => id !== chequeId);

/** El plazo de la empresa en el motivo sugerido: «Cheque caduco: más de 7 meses sin cobrar». */
export const motivoSugerido = (meses: number): string =>
  `Cheque caduco: más de ${meses} ${meses === 1 ? 'mes' : 'meses'} sin cobrar`;

/** Los problemas por cheque de un error de la anulación en lote; vacío si el error es de otro tipo. */
export function problemasDelError(error: unknown): ProblemaDeCheque[] {
  const esDeLote = error instanceof ErrorApi && error.codigo === 'anulacion_en_lote_con_problemas';
  return esDeLote && Array.isArray(error.detalles) ? (error.detalles as ProblemaDeCheque[]) : [];
}

/** «Cheque 1042 (Cuenta): mensaje» para cada problema, buscando el cheque por su id. */
export function textoDeProblemas(cheques: ChequeCaduco[], problemas: ProblemaDeCheque[]): string[] {
  return problemas.map(({ chequeId, mensaje }) => {
    const cheque = cheques.find((c) => c.chequeId === chequeId);
    const nombre = cheque ? `Cheque ${numeroDeChequeConSerie(cheque)} (${cheque.cuentaBancariaNombre})` : 'Un cheque';
    return `${nombre}: ${mensaje}`;
  });
}

/** El aviso al terminar: «3 cheques anulados con su nota de crédito inversa.» */
export const avisoDeAnulacion = (cantidad: number): string =>
  `${cantidad} ${cantidad === 1 ? 'cheque anulado' : 'cheques anulados'} con su nota de crédito inversa.`;
