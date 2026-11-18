import type { MonedaDelBanguat, MonedaPedida, ResultadoDeConsulta } from '../../dominio/publicacion.js';

/** Opciones comunes de una consulta: `hoy` (`AAAA-MM-DD`, en la zona horaria de la instalación) acota las fechas aceptadas. */
export interface OpcionesDeConsulta {
  readonly hoy: string;
  /** Otras monedas que se leen de `CambioDia/Var` si el día las trae; las no pedidas se ignoran. El USD siempre se lee. */
  readonly monedas?: readonly MonedaPedida[];
}

/** Opciones de la consulta por rango del USD, ambos extremos incluidos (`AAAA-MM-DD`). */
export interface OpcionesDeRango extends OpcionesDeConsulta {
  readonly desde: string;
  readonly hasta: string;
}

/** Opciones de la consulta por rango de una moneda cualquiera, identificada por su código del Banguat. */
export interface OpcionesDeMoneda extends MonedaPedida {
  readonly hoy: string;
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
  /** Los tipos del dólar publicados entre dos fechas, para rellenar huecos. */
  tiposDelRango(opciones: OpcionesDeRango): Promise<ResultadoDeConsulta>;
  /** Los tipos de cualquier moneda publicados entre dos fechas (`compra = venta` o el valor es ambiguo). */
  tiposDeLaMoneda(opciones: OpcionesDeMoneda): Promise<ResultadoDeConsulta>;
  /** Las monedas que ofrece el Banguat (`VariablesDisponibles`); una respuesta vacía es una lista vacía. */
  monedasDisponibles(): Promise<readonly MonedaDelBanguat[]>;
}
