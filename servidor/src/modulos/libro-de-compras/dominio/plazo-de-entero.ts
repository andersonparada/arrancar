import type { CalendarioLaboral } from './calendario-laboral.js';
import { primerDiaDelMes, sumarMeses } from './periodo-del-libro.js';

const DIA_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;

/** Lo que fija el plazo de entero de una retención: de qué fecha se cuenta, cuántos días hábiles y con qué calendario. */
export interface PlazoDeEntero {
  fechaDeLaRetencion: string;
  diasHabiles: number;
  calendario: CalendarioLaboral;
}

const comoTexto = (dia: Date): string => dia.toISOString().slice(0, 10);

/**
 * Último día para enterar una retención hecha en `fechaDeLaRetencion`: el día hábil número `diasHabiles` del mes
 * siguiente, según el calendario laboral (con el de lunes a viernes los feriados no se descuentan).
 */
export function fechaLimiteDeEntero({ fechaDeLaRetencion, diasHabiles, calendario }: PlazoDeEntero): string {
  let dia = new Date(`${sumarMeses(primerDiaDelMes(fechaDeLaRetencion), 1)}T00:00:00Z`);
  let contados = calendario.esHabil(comoTexto(dia)) ? 1 : 0;
  while (contados < diasHabiles) {
    dia = new Date(dia.getTime() + DIA_EN_MILISEGUNDOS);
    if (calendario.esHabil(comoTexto(dia))) contados += 1;
  }
  return comoTexto(dia);
}

/** `true` si hoy ya pasó el plazo de entero de una retención de esa fecha (multa e intereses). */
export function esEnteroVencido(hoy: string, plazo: PlazoDeEntero): boolean {
  return hoy > fechaLimiteDeEntero(plazo);
}
