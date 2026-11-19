/** Cómo se toma el candado del cierre mensual: quien cierra o reabre lo toma exclusivo; quien cambia tramos, compartido. */
export type ModoDeCandadoDelCierre = 'compartido' | 'exclusivo';

/** Lo que los casos de uso necesitan saber de los cierres mensuales de depreciación (§5.9). */
export interface Cierres {
  /** El período (`aaaa-mm-01`) del último mes cerrado, o `null` si no hay cierres. */
  ultimoMesCerrado(): Promise<string | null>;
  /** Si algún cierre vigente usó los tramos del activo (tiene cuotas vigentes). */
  usaronTramosDelActivo(activoId: string): Promise<boolean>;
  /**
   * El candado de la empresa para el cierre, hasta el final de la transacción: nadie cierra o reabre un mes mientras
   * otro cambia los tramos de un activo, ni dos cierres a la vez.
   */
  bloquear(modo: ModoDeCandadoDelCierre): Promise<void>;
}
