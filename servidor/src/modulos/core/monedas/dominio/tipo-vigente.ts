const MS_POR_DIA = 86_400_000;

/** Días hacia atrás que se acepta un tipo anterior al de la fecha pedida (diseño de multimoneda §4.1, PU-10). */
export const DIAS_MAXIMOS_CON_TIPO_ANTERIOR = 7;

/** De dónde sale el tipo: la versión del Banguat, la de soporte o el uno del quetzal. */
export type OrigenDelTipo = 'banguat' | 'manual' | 'base';

/**
 * Por qué se usó un tipo anterior al de la fecha. `dia_sin_calculo`: el Banguat no calcula esa moneda en fin de semana
 * ni asueto y se usó el último publicado (no pide confirmación). `falta_publicacion`: se esperaba una publicación y no
 * está (pide confirmación y la operación queda en «por revisar»).
 */
export type MotivoDelAnterior = 'dia_sin_calculo' | 'falta_publicacion';

/** El tipo que rige en una fecha, tal como lo entrega el servicio `tiposDeCambio`. */
export interface TipoVigente {
  moneda: string;
  /** La fecha pedida (`AAAA-MM-DD`). */
  fecha: string;
  /** El día del tipo usado; igual a `fecha` si es exacto. */
  fechaDelTipo: string;
  /** Quetzales por una unidad, texto decimal. */
  referencia: string;
  compra: string | null;
  venta: string | null;
  origen: OrigenDelTipo;
  exacto: boolean;
  motivoDelAnterior: MotivoDelAnterior | null;
}

/** Lo necesario de la versión vigente encontrada para decidir si se puede usar. */
export interface DatosParaClasificar {
  /** La fecha pedida. */
  fecha: string;
  /** Hoy en la zona horaria de la instalación. */
  hoy: string;
  /** El día de la versión vigente más reciente hasta `fecha`, o `null` si no hay ninguna. */
  fechaDelTipo: string | null;
  /** Si la moneda no se calcula ese día (fin de semana o asueto) y el tipo es del último día hábil anterior. */
  diaSinCalculo: boolean;
}

export interface ClasificacionDelTipo {
  /** Se puede usar (con o sin aviso). */
  utilizable: boolean;
  exacto: boolean;
  motivoDelAnterior: MotivoDelAnterior | null;
}

const NO_UTILIZABLE: ClasificacionDelTipo = { utilizable: false, exacto: false, motivoDelAnterior: null };

/** Días de calendario de `desde` a `hasta` (`hasta` posterior). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / MS_POR_DIA);
}

/**
 * Si el tipo encontrado sirve para la fecha: exacto, anterior de hasta 7 días (con su motivo) o inutilizable (no hay,
 * es de hace más de 7 días, o la fecha es futura y no está publicada).
 */
export function clasificarTipo({ fecha, hoy, fechaDelTipo, diaSinCalculo }: DatosParaClasificar): ClasificacionDelTipo {
  if (!fechaDelTipo) return NO_UTILIZABLE;
  if (fechaDelTipo === fecha) return { utilizable: true, exacto: true, motivoDelAnterior: null };
  if (fecha > hoy || diasEntre(fechaDelTipo, fecha) > DIAS_MAXIMOS_CON_TIPO_ANTERIOR) return NO_UTILIZABLE;
  return {
    utilizable: true,
    exacto: false,
    motivoDelAnterior: diaSinCalculo ? 'dia_sin_calculo' : 'falta_publicacion',
  };
}
