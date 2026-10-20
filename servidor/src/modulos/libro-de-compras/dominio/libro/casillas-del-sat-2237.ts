import type { ClaveDeRubro, MontoDeRubro, RubroDelSat2237 } from './rubros-del-sat-2237.js';

/** La casilla del formulario donde va un rubro; «por confirmar» hasta tener la captura del SAT-2237 vigente. */
export type CasillaDeRubro = 'por_confirmar' | { numero: string; nombre: string };

export interface MapaDeCasillas {
  /** La versión del formulario del que se tomó el mapa; nula mientras no haya captura. */
  version: string | null;
  casillas: Record<ClaveDeRubro, CasillaDeRubro>;
}

/**
 * Rubro → casilla. Está vacío a propósito: los números y nombres esperan la captura del SAT-2237 vigente (L5-2c); no
 * se inventan. Al llegar la captura solo se llena este dato y se escribe la versión.
 */
export const MAPA_DE_CASILLAS_SAT_2237: MapaDeCasillas = {
  version: null,
  casillas: {
    combustibles: 'por_confirmar',
    activos_fijos: 'por_confirmar',
    servicios: 'por_confirmar',
    otras_compras: 'por_confirmar',
    importaciones: 'por_confirmar',
    pequeno_contribuyente: 'por_confirmar',
    regimenes_sin_iva: 'por_confirmar',
    exento_y_no_afecto: 'por_confirmar',
    combustibles_exentos: 'por_confirmar',
  },
};

export interface CasillaConMonto {
  rubro: ClaveDeRubro;
  numero: string;
  nombre: string;
  neto: MontoDeRubro;
}

export interface CasillasDelSat2237 {
  version: string;
  casillas: CasillaConMonto[];
}

/** Lleva los rubros a sus casillas; `null` mientras el mapa no tenga versión (sin captura). */
export function casillasDelSat2237(
  rubros: RubroDelSat2237[],
  mapa: MapaDeCasillas = MAPA_DE_CASILLAS_SAT_2237,
): CasillasDelSat2237 | null {
  if (mapa.version === null) return null;
  const casillas: CasillaConMonto[] = [];
  for (const rubro of rubros) {
    const casilla = mapa.casillas[rubro.clave];
    if (casilla !== 'por_confirmar') casillas.push({ rubro: rubro.clave, ...casilla, neto: rubro.neto });
  }
  return { version: mapa.version, casillas };
}
