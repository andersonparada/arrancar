/** De dónde sale un feriado: la ley (`fijo`), la fecha móvil de Semana Santa o un asueto que carga soporte. */
export type OrigenDeFeriado = 'fijo' | 'semana_santa' | 'asueto_sat';

export interface Feriado {
  /** `AAAA-MM-DD`. */
  fecha: string;
  nombre: string;
  origen: OrigenDeFeriado;
  /** Solo rige desde el mediodía (24 y 31 de diciembre). Para los plazos cuenta como día hábil. */
  medioDia: boolean;
}
