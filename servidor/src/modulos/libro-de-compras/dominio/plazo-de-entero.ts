import type { CalendarioLaboral } from './calendario-laboral.js';
import { primerDiaDelMes, sumarMeses } from './periodo-del-libro.js';

/** El plazo es el último día hábil del mes siguiente (el IVA retenido en una factura especial, SAT-2085). */
export const ULTIMO_DIA_HABIL = 'ultimo';

const DIA_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;

/** Lo que fija el plazo de entero de una retención: de qué fecha se cuenta, cuántos días hábiles y con qué calendario. */
export interface PlazoDeEntero {
  fechaDeLaRetencion: string;
  /** El día hábil número N del mes siguiente, o el último día hábil de ese mes. */
  diasHabiles: number | typeof ULTIMO_DIA_HABIL;
  calendario: CalendarioLaboral;
}

const comoTexto = (dia: Date): string => dia.toISOString().slice(0, 10);

/** Cuenta los días hábiles desde el primer día del mes siguiente hasta el número `diasHabiles`. */
function diaHabilNumero(diasHabiles: number, { fechaDeLaRetencion, calendario }: PlazoDeEntero): string {
  let dia = new Date(`${sumarMeses(primerDiaDelMes(fechaDeLaRetencion), 1)}T00:00:00Z`);
  let contados = calendario.esHabil(comoTexto(dia)) ? 1 : 0;
  while (contados < diasHabiles) {
    dia = new Date(dia.getTime() + DIA_EN_MILISEGUNDOS);
    if (calendario.esHabil(comoTexto(dia))) contados += 1;
  }
  return comoTexto(dia);
}

/** Retrocede desde el último día del mes siguiente hasta encontrar un día hábil. */
function ultimoDiaHabil({ fechaDeLaRetencion, calendario }: PlazoDeEntero): string {
  const primeroDelOtroMes = new Date(`${sumarMeses(primerDiaDelMes(fechaDeLaRetencion), 2)}T00:00:00Z`);
  let dia = new Date(primeroDelOtroMes.getTime() - DIA_EN_MILISEGUNDOS);
  while (!calendario.esHabil(comoTexto(dia))) dia = new Date(dia.getTime() - DIA_EN_MILISEGUNDOS);
  return comoTexto(dia);
}

/**
 * Último día para enterar una retención hecha en `fechaDeLaRetencion`: el día hábil número `diasHabiles` del mes
 * siguiente, o su último día hábil, según el calendario laboral (con el de lunes a viernes los feriados no se
 * descuentan).
 */
export function fechaLimiteDeEntero(plazo: PlazoDeEntero): string {
  return plazo.diasHabiles === ULTIMO_DIA_HABIL ? ultimoDiaHabil(plazo) : diaHabilNumero(plazo.diasHabiles, plazo);
}

/** `true` si hoy ya pasó el plazo de entero de una retención de esa fecha (multa e intereses). */
export function esEnteroVencido(hoy: string, plazo: PlazoDeEntero): boolean {
  return hoy > fechaLimiteDeEntero(plazo);
}
