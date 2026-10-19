import type { RegimenDeIva } from './datos-fiscales-de-empresa.js';
import type { ProblemaDeDatosFiscales } from './errores.js';
import { primerDiaDelMes, sumarMeses } from './periodo-del-libro.js';

/**
 * Fecha en que el Decreto 31-2024 derogó los arts. 54 «A» a «F» de la Ley del IVA (régimen agropecuario y pequeño
 * contribuyente electrónico); confirmar en el texto oficial.
 */
export const FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019 = '2025-07-09';

/** Regímenes de IVA que el Decreto 31-2024 derogó: una vigencia nueva desde la fecha ya no puede usarlos. */
const REGIMENES_DEROGADOS: readonly RegimenDeIva[] = [
  'contribuyente_agropecuario',
  'pequeno_contribuyente_electronico',
];

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

/** Los regímenes derogados solo pueden iniciar antes de la fecha de derogación («desde el inicio» vale). */
export function problemasDeLaDerogacion(
  regimenIva: RegimenDeIva,
  vigenteDesde: string | null,
): ProblemaDeDatosFiscales[] {
  const iniciaTarde = vigenteDesde !== null && vigenteDesde >= FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019;
  if (!REGIMENES_DEROGADOS.includes(regimenIva) || !iniciaTarde) return [];
  return [{ campo: CAMPO, mensaje: 'Ese régimen ya no existe a partir de julio de 2025 (Decreto 31-2024).' }];
}
