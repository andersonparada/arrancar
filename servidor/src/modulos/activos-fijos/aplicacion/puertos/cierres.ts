/** Lo que los casos de uso necesitan saber de los cierres mensuales de depreciación (§5.9; los crea AF-5). */
export interface Cierres {
  /** El período (`aaaa-mm-01`) del último mes cerrado, o `null` si no hay cierres. */
  ultimoMesCerrado(): Promise<string | null>;
  /** Si algún cierre vigente usó los tramos del activo (tiene cuotas). */
  usaronTramosDelActivo(activoId: string): Promise<boolean>;
}
