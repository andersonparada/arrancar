import {
  MAPA_DE_CASILLAS_SAT_2237,
  type ClaveDeCasilla,
  type DefinicionDeCasilla,
  type MapaDeCasillas,
} from './mapa-de-casillas-del-sat-2237.js';
import type { ClaveDeRubro, MontoDeRubro, RubroDelSat2237 } from './rubros-del-sat-2237.js';

export interface CasillaConMonto extends DefinicionDeCasilla {
  /** Los rubros que suman en la casilla. */
  rubros: ClaveDeRubro[];
  neto: MontoDeRubro;
}

interface AporteAUnaCasilla {
  rubro: ClaveDeRubro;
  parte?: string;
}

const CERO: MontoDeRubro = { base: 0, iva: 0 };

const sumar = (a: MontoDeRubro, b: MontoDeRubro): MontoDeRubro => ({ base: a.base + b.base, iva: a.iva + b.iva });

/** Lo que un rubro aporta a una casilla: todo su neto o la porción pedida (cero mientras el rubro no la desglose). */
function aporteDelRubro(rubro: RubroDelSat2237 | undefined, parte: string | undefined): MontoDeRubro {
  if (!rubro) return CERO;
  return parte === undefined ? rubro.neto : (rubro.partes?.[parte] ?? CERO);
}

function aportesHacia(clave: ClaveDeCasilla, mapa: MapaDeCasillas): AporteAUnaCasilla[] {
  const repartos = Object.entries(mapa.reparto) as Array<[ClaveDeRubro, MapaDeCasillas['reparto'][ClaveDeRubro]]>;
  return repartos.flatMap(([rubro, destinos]) =>
    destinos
      .filter((d) => d.casilla === clave)
      .map((d) => (d.parte === undefined ? { rubro } : { rubro, parte: d.parte })),
  );
}

/**
 * Lleva los rubros a las casillas de la sección 5: varios rubros pueden sumar en una casilla (exento, regímenes sin IVA
 * y compras sin crédito) y un rubro puede repartirse en varias (las importaciones, cuando exista la DUCA).
 */
export function casillasDelSat2237(
  rubros: RubroDelSat2237[],
  mapa: MapaDeCasillas = MAPA_DE_CASILLAS_SAT_2237,
): CasillaConMonto[] {
  const porClave = new Map(rubros.map((rubro) => [rubro.clave, rubro]));
  return mapa.seccion5.casillas.map((casilla) => {
    const aportes = aportesHacia(casilla.clave, mapa);
    const neto = aportes.reduce((suma, a) => sumar(suma, aporteDelRubro(porClave.get(a.rubro), a.parte)), CERO);
    return { ...casilla, rubros: [...new Set(aportes.map((a) => a.rubro))], neto };
  });
}
