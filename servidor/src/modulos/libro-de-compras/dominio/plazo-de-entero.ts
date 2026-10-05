import { primerDiaDelMes, sumarMeses } from './periodo-del-libro.js';

const DIA_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;

/** Lunes a viernes; los feriados no se descuentan (el plazo real puede ser un día más largo). */
function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getUTCDay();
  return dia !== 0 && dia !== 6;
}

/**
 * Último día para enterar una retención hecha en `fechaDeLaRetencion`: el día hábil número `diasHabiles` del mes
 * siguiente, contando de lunes a viernes y sin feriados.
 * @example fechaLimiteDeEntero('2026-09-15', 15) // '2026-10-21'
 */
export function fechaLimiteDeEntero(fechaDeLaRetencion: string, diasHabiles: number): string {
  let dia = new Date(`${sumarMeses(primerDiaDelMes(fechaDeLaRetencion), 1)}T00:00:00Z`);
  let contados = esDiaHabil(dia) ? 1 : 0;
  while (contados < diasHabiles) {
    dia = new Date(dia.getTime() + DIA_EN_MILISEGUNDOS);
    if (esDiaHabil(dia)) contados += 1;
  }
  return dia.toISOString().slice(0, 10);
}

/** `true` si hoy ya pasó el plazo de entero de una retención de esa fecha (multa e intereses). */
export function esEnteroVencido(hoy: string, fechaDeLaRetencion: string, diasHabiles: number): boolean {
  return hoy > fechaLimiteDeEntero(fechaDeLaRetencion, diasHabiles);
}
