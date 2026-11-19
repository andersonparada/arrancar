import type { Magnitud } from './magnitudes.js';

/** Una unidad de la lista sugerida (`docs/modulos/diseno-inventarios.md` §3.4). */
export interface UnidadSugerida {
  nombre: string;
  simbolo: string;
  magnitud: Magnitud;
  /** Cuántas unidades de referencia trae; la referencia es libra (masa), galón (volumen) y metro (longitud). */
  factorALaReferencia: string | null;
}

type Fila = readonly [nombre: string, simbolo: string, magnitud: Magnitud, factor: string | null];

const FILAS: readonly Fila[] = [
  ['Unidad', 'u', 'cantidad', null],
  ['Docena', 'doc', 'cantidad', null],
  ['Libra', 'lb', 'masa', '1'],
  ['Kilogramo', 'kg', 'masa', '2.20462262'],
  ['Onza', 'oz', 'masa', '0.0625'],
  ['Quintal', 'qq', 'masa', '100'],
  ['Arroba', '@', 'masa', '25'],
  ['Tonelada métrica', 't', 'masa', '2204.62262185'],
  ['Galón', 'gal', 'volumen', '1'],
  ['Litro', 'l', 'volumen', '0.26417205'],
  ['Mililitro', 'ml', 'volumen', '0.00026417'],
  ['Metro', 'm', 'longitud', '1'],
  ['Caja', 'caja', 'empaque', null],
  ['Fardo', 'fardo', 'empaque', null],
  ['Saco', 'saco', 'empaque', null],
  ['Bolsa', 'bolsa', 'empaque', null],
  ['Botella', 'bot', 'empaque', null],
];

/**
 * La lista que se le da a cada empresa la primera vez que abre el catálogo. Las de una misma magnitud traen su
 * factor, así un artículo en libras acepta quintales sin configurar nada; caja, fardo, saco, bolsa y botella
 * dependen del artículo y se convierten con sus conversiones.
 */
export const UNIDADES_SUGERIDAS: readonly UnidadSugerida[] = FILAS.map(
  ([nombre, simbolo, magnitud, factorALaReferencia]) => ({ nombre, simbolo, magnitud, factorALaReferencia }),
);
