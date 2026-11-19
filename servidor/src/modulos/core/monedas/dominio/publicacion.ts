/** Una moneda que se pide a la fuente: su código ISO y el código con que la conoce el Banguat. */
export interface MonedaPedida {
  /** Código ISO 4217, por ejemplo `EUR`. */
  readonly moneda: string;
  /** El `moneda:int` del Banguat (el USD es el 2). */
  readonly codigoBanguat: number;
}

/** Una moneda lista para cargarse: con su convención (la que fija la migración); nula es «sin comprobar» y no se carga. */
export interface MonedaACargar extends MonedaPedida {
  readonly convencion: ConvencionDePublicacion | null;
}

/** Una moneda de la lista `VariablesDisponibles`; el Banguat no da la sigla ISO. */
export interface MonedaDelBanguat {
  readonly codigo: number;
  /** Tal como llega, sin espacios en los extremos y recortada a 120 caracteres. */
  readonly descripcion: string;
}

/** Cómo publica el Banguat una moneda (adenda B.4 de `diseno-multimoneda.md`). */
export type ConvencionDePublicacion = 'quetzales_por_unidad' | 'usd_por_unidad' | 'unidades_por_usd';

/** Un tipo de cambio de referencia ya validado, tal como lo publicó la fuente. */
export interface PublicacionDeTipoDeCambio {
  /** Código ISO 4217, por ejemplo `USD`. */
  readonly moneda: string;
  /** Código del Banguat con que se pidió. */
  readonly codigoBanguat: number;
  /** Fecha en que rige, `AAAA-MM-DD`. */
  readonly fecha: string;
  /**
   * Lo que publicó la fuente, en su convención (el promedio de compra y venta), mientras no se normaliza; ya normalizada
   * son los quetzales por unidad de la moneda, como texto decimal de hasta 8 decimales (nunca `number`).
   */
  readonly referencia: string;
  /** Tal como los publicó el Banguat, en su convención; en el dólar coinciden con quetzales. */
  readonly compra?: string;
  readonly venta?: string;
  /** Con que se calculó `referencia`; sin indicar es el dólar (`quetzales_por_unidad`). */
  readonly convencion?: ConvencionDePublicacion;
  /** La fila del dólar del Banguat usada para pasar un cruce a quetzales; nula en el dólar. */
  readonly dolarUsadoId?: string;
}

/** Por qué se descartó un valor recibido; es lo que se anota en la bitácora de consultas. */
export type MotivoDeRechazo =
  | 'valor_fuera_de_rango'
  | 'dato_invalido'
  | 'valor_ambiguo'
  | 'variacion_excesiva'
  | 'sin_dolar_del_dia'
  | 'convencion_dudosa';

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
