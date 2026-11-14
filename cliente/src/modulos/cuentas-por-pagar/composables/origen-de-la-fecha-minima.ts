import { formatearFecha } from '@/modulos/core/utilidades/formato';

/** De dónde sale la fecha más antigua que se puede escribir al aplicar o ajustar. */
export type OrigenDeLaFechaMinima = 'documento' | 'nota' | 'inicio';

const RAZONES: Record<OrigenDeLaFechaMinima, string> = {
  documento: 'cuando se recibió el documento más reciente al que se aplica',
  nota: 'cuando se recibió la nota',
  inicio: 'la fecha de inicio de la empresa con saldos iniciales',
};

/** El origen del mínimo de una nota: su recepción o, si es un saldo inicial, el inicio de la empresa. */
export const origenDeLaFechaDeLaNota = (esSaldoInicial: boolean): OrigenDeLaFechaMinima =>
  esSaldoInicial ? 'inicio' : 'nota';

/** Al aplicar manda la fecha más reciente entre la de la nota y la del documento elegido; si empatan, la del documento. */
export function origenDeLaFechaAlAplicar(
  fechas: { nota: string | null; documento: string | null },
  esSaldoInicial: boolean,
): OrigenDeLaFechaMinima {
  const { nota, documento } = fechas;
  const gana = documento !== null && (nota === null || documento >= nota);
  return gana ? 'documento' : origenDeLaFechaDeLaNota(esSaldoInicial);
}

/** «No puede ser anterior al 05/10/2026, cuando se recibió la nota.» */
export const mensajeDeFechaMinima = (minima: string, origen: OrigenDeLaFechaMinima): string =>
  `No puede ser anterior al ${formatearFecha(minima)}, ${RAZONES[origen]}.`;
