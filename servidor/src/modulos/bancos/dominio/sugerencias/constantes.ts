import type { ParametrosDeMonto } from './tipos.js';

/** Vida media por omisión (días): tras ellos un ejemplo pesa la mitad. Configurable por empresa. */
export const VIDA_MEDIA_POR_OMISION = 180;
/** Confianza mínima por omisión (%) para mostrar «Sugerido». Configurable por empresa. */
export const CONFIANZA_MINIMA_POR_OMISION = 60;

/** Peso del «no sé» (prior hacia la duda): con un solo caso idéntico la confianza es 50 %. */
export const PESO_DEL_NO_SE = 1;
/** Piso de la cercanía de monto (β) y su dispersión (σ = ln 1.5). */
export const PARAMETROS_DE_MONTO: ParametrosDeMonto = { piso: 0.2, sigma: Math.log(1.5) };
/** Confianza mínima (%) para mostrar una alternativa. */
export const CONFIANZA_MINIMA_DE_UNA_ALTERNATIVA = 10;
export const MAXIMO_DE_ALTERNATIVAS_CON_SUGERIDO = 2;
export const MAXIMO_DE_ALTERNATIVAS_SIN_SUGERIDO = 3;
/** Ejemplos considerados por pendiente: los más cercanos en fecha. */
export const MAXIMO_DE_CASOS_POR_CLAVE = 300;
export const DIAS_DE_LA_VENTANA_EN_VIDAS_MEDIAS = 4;
