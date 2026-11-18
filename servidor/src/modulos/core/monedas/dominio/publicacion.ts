/** Una moneda que se pide a la fuente: su código ISO y el código con que la conoce el Banguat. */
export interface MonedaPedida {
  /** Código ISO 4217, por ejemplo `EUR`. */
  readonly moneda: string;
  /** El `moneda:int` del Banguat (el USD es el 2). */
  readonly codigoBanguat: number;
}

/** Una moneda de la lista `VariablesDisponibles`; el Banguat no da la sigla ISO. */
export interface MonedaDelBanguat {
  readonly codigo: number;
  /** Tal como llega, sin espacios en los extremos y recortada a 120 caracteres. */
  readonly descripcion: string;
}

/** Un tipo de cambio de referencia ya validado, tal como lo publicó la fuente. */
export interface PublicacionDeTipoDeCambio {
  /** Código ISO 4217, por ejemplo `USD`. */
  readonly moneda: string;
  /** Código del Banguat con que se pidió. */
  readonly codigoBanguat: number;
  /** Fecha en que rige, `AAAA-MM-DD`. */
  readonly fecha: string;
  /** Quetzales por unidad de la moneda, como texto decimal de hasta 8 decimales (nunca `number`). */
  readonly referencia: string;
  /** Solo en los rangos, donde `compra = venta = referencia`. */
  readonly compra?: string;
  readonly venta?: string;
}

/** Por qué se descartó un valor recibido; es lo que se anota en la bitácora de consultas. */
export type MotivoDeRechazo = 'valor_fuera_de_rango' | 'dato_invalido' | 'valor_ambiguo';

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
