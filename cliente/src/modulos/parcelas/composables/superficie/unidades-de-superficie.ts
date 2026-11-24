import {
  SuperficieNoConvertible,
  aCentesimasDeM2,
  deCentesimasDeM2,
  textoACentesimas,
  type FactoresDeSuperficie,
  type UnidadDeSuperficie,
} from './edicion-de-superficie';

export const OPCIONES_DE_UNIDAD: Record<UnidadDeSuperficie, string> = {
  m2: 'Metros cuadrados',
  hectarea: 'Hectáreas',
  manzana: 'Manzanas',
  cuerda: 'Cuerdas',
  vara_cuadrada: 'Varas cuadradas',
  caballeria: 'Caballerías',
};

export const ABREVIATURAS_DE_UNIDAD: Record<UnidadDeSuperficie, string> = {
  m2: 'm²',
  hectarea: 'ha',
  manzana: 'mz',
  cuerda: 'cda',
  vara_cuadrada: 'vr²',
  caballeria: 'cab',
};

/** Lo que la empresa configuró para escribir y mostrar superficies. */
export interface AjustesDeSuperficie {
  factores: FactoresDeSuperficie;
  varasPorLadoDeCuerda: number;
  unidadParaMostrar: 'manzana' | 'hectarea' | 'cuerda' | 'm2';
}

/** Lo que el servidor manda con la sesión (`parcelas.unidades.*`), con los valores de fábrica si no llegó. */
export function ajustesDeSuperficie(config: <T>(clave: string, predeterminado: T) => T): AjustesDeSuperficie {
  return {
    factores: {
      metrosPorVara: config('parcelas.unidades.metros_por_vara', 0.835905),
      varasCuadradasPorManzana: config('parcelas.unidades.varas_cuadradas_por_manzana', 10000),
      varasCuadradasPorCaballeria: config('parcelas.unidades.varas_cuadradas_por_caballeria', 645816),
    },
    varasPorLadoDeCuerda: config('parcelas.unidades.varas_por_lado_de_cuerda', 25),
    unidadParaMostrar: config('parcelas.unidades.unidad_para_mostrar', 'manzana'),
  };
}

/** Una superficie ya convertida: la cifra con los decimales de su unidad y la unidad. */
export interface SuperficieConvertida {
  cifra: string;
  unidad: UnidadDeSuperficie;
}

/** Los m² que manda el servidor (`"13974.74"`) en la unidad que se pida; `null` si no hay superficie. */
export function convertirParaMostrar(
  metrosCuadrados: string | null,
  unidad: UnidadDeSuperficie,
  ajustes: AjustesDeSuperficie,
): SuperficieConvertida | null {
  if (metrosCuadrados === null) return null;
  const destino = { unidad, varasPorLadoDeCuerda: ajustes.varasPorLadoDeCuerda };
  return { cifra: deCentesimasDeM2(textoACentesimas(metrosCuadrados), destino, ajustes.factores), unidad };
}

/** Una cifra ya convertida a una de las unidades de la calculadora. */
export interface EquivalenciaDeSuperficie {
  unidad: UnidadDeSuperficie;
  cifra: string;
}

/** Lo que muestra la calculadora mientras el operador escribe. */
export interface VistaPreviaDeSuperficie {
  estado: 'vacia' | 'error' | 'lista';
  mensaje: string | null;
  equivalencias: EquivalenciaDeSuperficie[];
  /** Los m² convertidos, para comparar la útil con la total. */
  centesimas: number | null;
}

const UNIDADES_DE_LA_VISTA: UnidadDeSuperficie[] = ['m2', 'hectarea', 'manzana'];

/** Una cifra escrita todavía a medias no es un error: la calculadora espera a que haya algo que convertir. */
const VACIA: VistaPreviaDeSuperficie = { estado: 'vacia', mensaje: null, equivalencias: [], centesimas: null };

/** Lo que escribe el operador en la calculadora. */
export interface EntradaDeSuperficie {
  cifra: string;
  unidad: UnidadDeSuperficie;
  varasPorLadoDeCuerda: string | number | null;
}

const varasEscritas = (varas: string | number | null): number | null =>
  varas === null || varas === '' ? null : Number(varas);

/** Convierte lo escrito en m², ha y mz para que el operador vea lo que se va a guardar. */
export function vistaPreviaDeSuperficie(
  entrada: EntradaDeSuperficie,
  factores: FactoresDeSuperficie,
): VistaPreviaDeSuperficie {
  if (!entrada.cifra.trim()) return VACIA;
  const origen = {
    unidad: entrada.unidad,
    varasPorLadoDeCuerda: entrada.unidad === 'cuerda' ? varasEscritas(entrada.varasPorLadoDeCuerda) : null,
  };
  try {
    const centesimas = aCentesimasDeM2(entrada.cifra, origen, factores);
    const sinVaras = { varasPorLadoDeCuerda: null };
    const equivalencias = UNIDADES_DE_LA_VISTA.map((unidad) => ({
      unidad,
      cifra: deCentesimasDeM2(centesimas, { unidad, ...sinVaras }, factores),
    }));
    return { estado: 'lista', mensaje: null, equivalencias, centesimas };
  } catch (error) {
    if (!(error instanceof SuperficieNoConvertible)) throw error;
    return { ...VACIA, estado: 'error', mensaje: error.message };
  }
}
