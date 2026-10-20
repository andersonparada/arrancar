import type { FilaDelLibro } from './fila-del-libro.js';
import type { TipoDeLibro } from './tipo-de-libro.js';

const AVISO_SIMPLIFICADO =
  'Este período no da crédito fiscal: el libro es simplificado y el IVA es informativo. Si es pequeño contribuyente, ' +
  'su libro único de compras y ventas lleva además las ventas; aquí solo está la mitad de compras.';

/** Avisos del libro del período (no bloquean nada). */
export function avisosDelLibro(filas: FilaDelLibro[], tipoDeLibro: TipoDeLibro): string[] {
  const avisos: string[] = [];
  if (tipoDeLibro === 'simplificado') avisos.push(AVISO_SIMPLIFICADO);
  const fueraDePlazo = filas.filter((fila) => fila.motivo === 'fuera_de_plazo').length;
  if (fueraDePlazo > 0) {
    avisos.push(`${fueraDePlazo} documento(s) están fuera de plazo (art. 20): su IVA va al costo.`);
  }
  if (filas.some((fila) => fila.combustibleExentoPorDecreto !== 0)) {
    avisos.push('Hay combustibles exentos de IVA e IDP por el Decreto 22-2026: no dan crédito fiscal.');
  }
  return avisos;
}
