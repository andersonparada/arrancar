import type { ResultadoDeConsulta } from '../../dominio/publicacion.js';

/** Opciones comunes de una consulta: `hoy` (`AAAA-MM-DD`, en la zona horaria de la instalación) acota las fechas aceptadas. */
export interface OpcionesDeConsulta {
  readonly hoy: string;
}

/** Opciones de la consulta por rango, ambos extremos incluidos (`AAAA-MM-DD`). */
export interface OpcionesDeRango extends OpcionesDeConsulta {
  readonly desde: string;
  readonly hasta: string;
}

/**
 * De dónde salen los tipos de cambio de referencia (hoy, el servicio web del Banco de Guatemala).
 * Un día o rango sin publicación devuelve un resultado vacío; un fallo de la fuente lanza
 * `FuenteNoDisponible` (se puede reintentar) o `RespuestaInvalida` (no).
 */
export interface FuenteDeTiposDeCambio {
  /** El tipo de referencia vigente hoy. */
  tipoDelDia(opciones: OpcionesDeConsulta): Promise<ResultadoDeConsulta>;
  /** Los tipos publicados entre dos fechas, para rellenar huecos. */
  tiposDelRango(opciones: OpcionesDeRango): Promise<ResultadoDeConsulta>;
}
