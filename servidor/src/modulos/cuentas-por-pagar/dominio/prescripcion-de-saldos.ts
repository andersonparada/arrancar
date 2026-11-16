import { diasEntre, sumarAnios } from './fechas-de-corte.js';

/** Código Civil art. 1508: cinco años (sin plazo mercantil más corto confirmado). Se codifica aquí, no en configuración. */
export const PLAZO_DE_PRESCRIPCION_EN_ANIOS = 5;

/** `AAAA-MM-DD` desde la que el saldo a favor podría estar prescrito: el último movimiento más cinco años. */
export const posiblePrescripcionDesde = (ultimoMovimiento: string): string =>
  sumarAnios(ultimoMovimiento, PLAZO_DE_PRESCRIPCION_EN_ANIOS);

/** Los años cumplidos entre el último movimiento y el corte. */
export function aniosDesdeElUltimoMovimiento(ultimoMovimiento: string, corte: string): number {
  const anios = Number(corte.slice(0, 4)) - Number(ultimoMovimiento.slice(0, 4));
  const faltaElAniversario = corte.slice(5) < ultimoMovimiento.slice(5);
  return Math.max(0, faltaElAniversario ? anios - 1 : anios);
}

export const TRAMOS_DE_PRESCRIPCION = [
  'menos_de_1',
  'de_1_a_2',
  'de_2_a_3',
  'de_3_a_4',
  'de_4_a_5',
  'de_5_o_mas',
] as const;
export type TramoDePrescripcion = (typeof TRAMOS_DE_PRESCRIPCION)[number];

/** El tramo por años cumplidos desde el último movimiento. */
export const tramoDePrescripcion = (anios: number): TramoDePrescripcion =>
  TRAMOS_DE_PRESCRIPCION[Math.min(Math.max(anios, 0), PLAZO_DE_PRESCRIPCION_EN_ANIOS)] ?? 'de_5_o_mas';

/** Si al corte ya pasó la fecha desde la que podría estar prescrito. */
export const posiblementePrescrito = (ultimoMovimiento: string, corte: string): boolean =>
  diasEntre(posiblePrescripcionDesde(ultimoMovimiento), corte) >= 0;
