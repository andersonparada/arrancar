import type { MonedaDelBanguat, MonedaPedida, PublicacionDeTipoDeCambio } from '../../dominio/publicacion.js';

export type OperacionDelBanguat =
  | 'TipoCambioDia'
  | 'TipoCambioRango'
  | 'TipoCambioRangoMoneda'
  | 'TipoCambioFechaInicialMoneda'
  | 'VariablesDisponibles';

export type VueltaDeCarga = 'madrugada' | 'manana' | 'noche' | 'arranque' | 'relleno' | 'manual' | 'lista' | 'muestra';

export type ResultadoDeLaConsulta =
  | 'exito'
  | 'sin_datos'
  | 'error'
  | 'valor_fuera_de_rango'
  | 'valor_ambiguo'
  | 'variacion_excesiva'
  | 'sin_dolar_del_dia'
  | 'convencion_dudosa'
  | 'sin_convencion';

/** Una llamada al Banguat tal como queda en `core.consultas_al_banguat` (las filas nuevas las cuenta quien guarda). */
export interface ConsultaHecha {
  iniciadaEn: Date;
  terminadaEn: Date;
  operacion: OperacionDelBanguat;
  vuelta: VueltaDeCarga;
  moneda: string | null;
  codigoBanguat: number | null;
  desde: string | null;
  hasta: string | null;
  resultado: ResultadoDeLaConsulta;
  filasRechazadas: number;
  /** Recortado a 500 caracteres al guardar; nunca el cuerpo de la respuesta. */
  detalle: string | null;
  /** Quien pidió la carga a mano; nulo en las que corren solas. */
  disparadaPor: string | null;
}

/** Lo que el horario necesita saber de la bitácora. */
export interface ConsultaReciente {
  vuelta: string;
  iniciadaEn: Date;
}

/** Lo que dice la lista de `VariablesDisponibles` al actualizar `core.monedas_del_banguat`. */
export interface ResultadoDeActualizarLista {
  nuevas: number;
  noDisponibles: number;
}

/**
 * Lo que la carga automática lee y escribe en la base: toda la instalación, sin empresa. Cada escritura abre su propia
 * transacción (la tarea no tiene usuario ni empresa).
 */
export interface CargasDeTipos {
  /** Las monedas activas con código del Banguat (el dólar es el 2). */
  monedasACargar(): Promise<MonedaPedida[]>;
  /** Fechas con tipo del Banguat ya guardado para la moneda entre dos fechas, ambas incluidas. */
  fechasConTipoDelBanguat(moneda: string, desde: string, hasta: string): Promise<string[]>;
  /** El valor vigente más reciente de la moneda con fecha desde `desde` y antes de `antesDe`, si hay. */
  valorAnterior(moneda: string, desde: string, antesDe: string): Promise<string | null>;
  /** Lo registrado en la bitácora desde ese instante. */
  consultasDesde(desde: Date): Promise<ConsultaReciente[]>;
  /**
   * Guarda la consulta en la bitácora y, en la misma transacción, las publicaciones que aún no estaban (nunca reemplaza
   * una fila del Banguat). Devuelve cuántas filas nuevas dejó.
   */
  guardar(consulta: ConsultaHecha, publicaciones: readonly PublicacionDeTipoDeCambio[]): Promise<number>;
  /** Actualiza `core.monedas_del_banguat` con la lista recibida; las que ya no vienen quedan no disponibles. */
  actualizarLista(
    monedas: readonly MonedaDelBanguat[],
    ahora: Date,
    consulta: ConsultaHecha,
  ): Promise<ResultadoDeActualizarLista>;
  /** La última vez que alguna moneda de la lista fue vista, y si la lista tiene más que la semilla. */
  estadoDeLaLista(): Promise<{ vistaPorUltimaVez: Date | null; monedas: number }>;
}

/** Que solo una instancia cargue a la vez. */
export interface CerrojoDeCarga {
  /** Corre el trabajo si nadie más carga; si el cerrojo está tomado devuelve `null` sin hacer nada. */
  ejecutarSiLibre<Resultado>(trabajo: () => Promise<Resultado>): Promise<Resultado | null>;
}
