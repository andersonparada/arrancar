import type { ResultadoDeImportacion } from '../../servicios/intercambio';

const plural = (cantidad: number, singular: string, varios: string) =>
  `${cantidad.toLocaleString('es-GT')} ${cantidad === 1 ? singular : varios}`;

/** Lo que se le dice al usuario después de revisar su archivo. */
export function resumenDeRevision({ filas, errores }: ResultadoDeImportacion): string {
  if (errores.length === 0) return `${plural(filas, 'fila lista', 'filas listas')} para importar.`;
  const filasConProblemas = new Set(errores.map((error) => error.fila)).size;
  return `${plural(errores.length, 'problema', 'problemas')} en ${plural(filasConProblemas, 'fila', 'filas')}. Corrija el archivo y vuelva a subirlo; no se guardó nada.`;
}

/** "Fila 4 · Nacimiento" o solo "Fila 4" si el problema es de la fila entera. */
export const ubicacionDelError = ({ fila, columna }: { fila: number; columna: string | null }) =>
  columna ? `Fila ${fila} · ${columna}` : `Fila ${fila}`;
