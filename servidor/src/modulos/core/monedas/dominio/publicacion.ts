/** Un tipo de cambio de referencia ya validado, tal como lo publicó la fuente. */
export interface PublicacionDeTipoDeCambio {
  /** Código ISO 4217, por ejemplo `USD`. */
  readonly moneda: string;
  /** Fecha de la publicación, `AAAA-MM-DD`. */
  readonly fecha: string;
  /** Quetzales por unidad de la moneda, como texto decimal (nunca `number`). */
  readonly referencia: string;
}

/** Por qué se descartó un valor recibido. `valor_fuera_de_rango` es el que se anota en la bitácora de consultas. */
export type MotivoDeRechazo = 'valor_fuera_de_rango' | 'dato_invalido' | 'sin_referencia';

/** Un valor recibido que no se guarda. */
export interface PublicacionRechazada {
  readonly moneda: string;
  readonly fecha: string;
  readonly motivo: MotivoDeRechazo;
}

/** Lo que dejó una consulta a la fuente: lo válido y lo descartado. Sin datos es un resultado vacío, no un error. */
export interface ResultadoDeConsulta {
  readonly publicaciones: readonly PublicacionDeTipoDeCambio[];
  readonly rechazadas: readonly PublicacionRechazada[];
}
