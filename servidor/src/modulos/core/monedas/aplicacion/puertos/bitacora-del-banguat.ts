import type { OperacionDelBanguat, ResultadoDeLaConsulta, VueltaDeCarga } from './cargas-de-tipos.js';

/** Una fila de `core.consultas_al_banguat` tal como la ve soporte (sin quién la disparó). */
export interface ConsultaGuardada {
  id: string;
  iniciadaEn: Date;
  terminadaEn: Date;
  operacion: OperacionDelBanguat;
  vuelta: VueltaDeCarga;
  moneda: string | null;
  codigoBanguat: number | null;
  desde: string | null;
  hasta: string | null;
  resultado: ResultadoDeLaConsulta;
  filasNuevas: number;
  filasRechazadas: number;
  detalle: string | null;
  /** La pidió una persona (carga manual o muestra) y no el temporizador. */
  aPedido: boolean;
}

/** Una moneda con código del Banguat y lo último que se sabe de su serie. */
export interface MonedaConCodigoDelBanguat {
  moneda: string;
  nombre: string;
  codigoBanguat: number;
  activa: boolean;
  /** La fecha más reciente con tipo guardado (de cualquier origen), si hay. */
  ultimaFecha: string | null;
}

/** Lectura de la bitácora de la carga y del estado de las series, para el panel de soporte. */
export interface BitacoraDelBanguat {
  ultimasConsultas(opciones: { limite: number; moneda?: string | undefined }): Promise<ConsultaGuardada[]>;
  monedasConCodigo(): Promise<MonedaConCodigoDelBanguat[]>;
}
