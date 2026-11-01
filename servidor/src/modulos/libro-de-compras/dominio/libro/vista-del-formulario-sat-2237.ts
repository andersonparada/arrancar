import { casillasDelSat2237, type CasillaConMonto } from './casillas-del-sat-2237.js';
import { MAPA_DE_CASILLAS_SAT_2237, type MapaDeCasillas } from './mapa-de-casillas-del-sat-2237.js';
import type { OperacionDelSegmento9 } from './operaciones-del-sat-2237.js';
import type { DetalleDeProveedores, ProveedorDelSat2237 } from './proveedores-del-sat-2237.js';
import type { RubroDelSat2237 } from './rubros-del-sat-2237.js';

/** Los datos ya calculados que la vista «como en el formulario» ordena en sus secciones. */
export interface EntradaDeLaVista {
  rubros: RubroDelSat2237[];
  segmento9: OperacionDelSegmento9[];
  proveedores: DetalleDeProveedores;
}

export interface VistaDelFormularioSat2237 {
  version: string;
  confirmado: boolean;
  seccion5: { nombre: string; casillas: CasillaConMonto[] };
  seccion6: { nombre: string; maximo: number; filas: ProveedorDelSat2237[]; sinLugar: number };
  seccion9: { nombre: string; cantidad: string; monto: string; lineas: OperacionDelSegmento9[] };
}

/**
 * La sección 6 lleva hasta diez proveedores de régimen general: con NIT, con facturas y con base positiva, de mayor a
 * menor base sin IVA. Los que no caben se cuentan en `sinLugar`.
 */
function principalesProveedores(detalle: DetalleDeProveedores, maximo: number) {
  const candidatos = detalle.filas
    .filter((p) => p.nit !== null && p.cantidadDeFacturas > 0 && p.base > 0)
    .sort((a, b) => b.base - a.base);
  return { filas: candidatos.slice(0, maximo), sinLugar: Math.max(0, candidatos.length - maximo) };
}

/** Las secciones 5, 6 y 9 del SAT-2237 en el orden y con los nombres del formulario (aún sin confirmar). */
export function vistaDelFormularioSat2237(
  entrada: EntradaDeLaVista,
  mapa: MapaDeCasillas = MAPA_DE_CASILLAS_SAT_2237,
): VistaDelFormularioSat2237 {
  const { seccion6, seccion9 } = mapa;
  return {
    version: mapa.version,
    confirmado: mapa.confirmado,
    seccion5: { nombre: mapa.seccion5.nombre, casillas: casillasDelSat2237(entrada.rubros, mapa) },
    seccion6: {
      nombre: seccion6.nombre,
      maximo: seccion6.maximoDeProveedores,
      ...principalesProveedores(entrada.proveedores, seccion6.maximoDeProveedores),
    },
    seccion9: { ...seccion9, lineas: entrada.segmento9 },
  };
}
