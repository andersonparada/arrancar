/** Las magnitudes de las unidades de medida (`docs/modulos/diseno-inventarios.md` §5.1). */
export const MAGNITUDES = ['cantidad', 'masa', 'volumen', 'longitud', 'superficie', 'empaque'] as const;

export type Magnitud = (typeof MAGNITUDES)[number];

/** Las que se convierten entre sí por su factor a la unidad de referencia (libra, galón, metro, metro cuadrado). */
export const MAGNITUDES_CON_FACTOR: readonly Magnitud[] = ['masa', 'volumen', 'longitud', 'superficie'];

/** Si la magnitud trae su factor a la referencia (las demás, como caja o saco, se convierten por artículo). */
export const tieneFactorALaReferencia = (magnitud: Magnitud): boolean => MAGNITUDES_CON_FACTOR.includes(magnitud);
