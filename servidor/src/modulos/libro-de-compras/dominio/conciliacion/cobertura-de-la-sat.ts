import { primerDiaDelMes, sumarMeses } from '../periodo-del-libro.js';
import type { CoberturaDeLaSat } from './tipos-de-conciliacion.js';

/** Las fechas de emisión menor y mayor de un lote de la bandeja. */
export interface RangoDeLote {
  desde: string;
  hasta: string;
}

/**
 * Qué meses cubre la SAT: un mes está cubierto si el rango de algún lote de la bandeja lo toca. Sin ningún lote, nada
 * está cubierto, y un documento sin fila no se puede llamar faltante.
 */
export class CoberturaDeLotes implements CoberturaDeLaSat {
  constructor(private readonly rangos: readonly RangoDeLote[]) {}

  cubreElMesDe(fechaDeEmision: string): boolean {
    const inicio = primerDiaDelMes(fechaDeEmision);
    const siguiente = sumarMeses(fechaDeEmision, 1);
    return this.rangos.some((rango) => rango.desde < siguiente && rango.hasta >= inicio);
  }
}
