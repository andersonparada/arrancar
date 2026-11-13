import type { ResultadoDeConciliacion } from '../../dominio/conciliacion/tipos-de-conciliacion.js';

export type {
  DiferenciaDeConciliacion,
  ItemDeConciliacion,
  ResultadoDeConciliacion,
} from '../../dominio/conciliacion/tipos-de-conciliacion.js';

/** Cuántas líneas tiene cada resultado. */
export type ResumenDeConciliacion = Record<keyof ResultadoDeConciliacion, number>;

/** La conciliación de un período: los conteos para las tarjetas y la lista de cada resultado. */
export interface ConciliacionDto {
  /** Primer día del mes, `AAAA-MM-01`. */
  periodo: string;
  /** La fecha de inicio de la empresa; `null` si no tiene (entonces nada se marca como anterior). */
  fechaDeInicio: string | null;
  /** Algún lote de la bandeja toca el mes del período; sin él, la SAT no trajo nada de ese mes. */
  hayDatosDeLaSat: boolean;
  resumen: ResumenDeConciliacion;
  resultados: ResultadoDeConciliacion;
}
