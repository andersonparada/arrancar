import type { RegimenDeIva } from './datos-fiscales-de-empresa.js';
import type { ProblemaDeDatosFiscales } from './errores.js';
import { primerDiaDelMes, sumarMeses } from './periodo-del-libro.js';

/**
 * Primer día en que el régimen de contribuyente agropecuario (Decreto 7-2019) ya no existe: lo derogó el Decreto
 * 31-2024 (arts. 54 «A» a «F» de la Ley del IVA). Una vigencia nueva de ese régimen no puede empezar en esta fecha
 * ni después. TODO: confirmar el artículo y la fecha en el Decreto 31-2024.
 */
export const FECHA_DE_DEROGACION_AGROPECUARIO = '2025-07-01';

/** Una vigencia fiscal no empieza antes de esta fecha: atrapa errores de tecleo. */
export const PRIMERA_FECHA_DE_VIGENCIA = '2000-01-01';

/** Cuántos meses después del actual se puede programar un cambio de régimen ya anunciado. */
export const MESES_DE_ANTICIPO_DE_UNA_VIGENCIA = 12;

const CAMPO = 'vigenteDesde';

/** Los problemas de la fecha desde la que rigen unos datos: primer día de un mes, ni muy atrás ni muy adelante. */
export function problemasDeLaFechaDeVigencia(vigenteDesde: string | null, hoy: string): ProblemaDeDatosFiscales[] {
  if (vigenteDesde === null) return [];
  if (vigenteDesde !== primerDiaDelMes(vigenteDesde)) {
    return [{ campo: CAMPO, mensaje: 'La vigencia empieza el primer día de un mes.' }];
  }
  if (vigenteDesde < PRIMERA_FECHA_DE_VIGENCIA) {
    return [{ campo: CAMPO, mensaje: 'La vigencia no puede empezar antes del año 2000.' }];
  }
  if (vigenteDesde > sumarMeses(hoy, MESES_DE_ANTICIPO_DE_UNA_VIGENCIA)) {
    return [{ campo: CAMPO, mensaje: 'La vigencia no puede empezar más de doce meses después de este mes.' }];
  }
  return [];
}

/** El régimen agropecuario solo puede iniciar antes de su derogación (la vigencia «desde el inicio» es anterior). */
export function problemasDeLaDerogacion(
  regimenIva: RegimenDeIva,
  vigenteDesde: string | null,
): ProblemaDeDatosFiscales[] {
  const iniciaTarde = vigenteDesde !== null && vigenteDesde >= FECHA_DE_DEROGACION_AGROPECUARIO;
  if (regimenIva !== 'contribuyente_agropecuario' || !iniciaTarde) return [];
  return [
    { campo: CAMPO, mensaje: 'El régimen de contribuyente agropecuario ya no existe a partir de julio de 2025.' },
  ];
}
