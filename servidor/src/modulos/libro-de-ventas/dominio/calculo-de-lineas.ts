import { LineaInvalida } from './errores-de-documento.js';
import { repartirIva } from './reparto-de-iva.js';

export const CLASES_FISCALES = ['gravada', 'exenta', 'exportacion', 'no_afecta'] as const;
export type ClaseFiscal = (typeof CLASES_FISCALES)[number];

export type TipoDeLinea = 'bien' | 'servicio';

/** Lo que el usuario escribe en una línea; los montos van en centavos enteros y el total incluye el IVA. */
export interface LineaEscrita {
  conceptoDeIngresoId: string;
  tipo: TipoDeLinea;
  claseFiscal: ClaseFiscal;
  descripcion: string | null;
  total: number;
  /** Turismo, timbre de prensa, tasa municipal…: no llevan IVA ni forman la base. */
  otrosImpuestos: number;
}

/** Una línea con todo lo que se guarda: `total = base + iva + otrosImpuestos`. */
export interface LineaCalculada extends LineaEscrita {
  /** Posición en el documento, desde 1. */
  orden: number;
  base: number;
  iva: number;
}

/** Cómo se trata el IVA del documento al calcular sus líneas. */
export interface OpcionesDeCalculo {
  /** `false` si la familia del documento no lleva IVA: no hay débito, todo va a la base. */
  cobraIva: boolean;
  /** Tasa del IVA en centésimas (12 % → 1200). */
  tasaDeIva: number;
  /** IVA total del DTE, en centavos, si lo trae (hasta `max(5, líneas)` centavos de diferencia con el calculado). */
  ivaDelDte?: number | null;
}

function exigirCentavos(valor: number, campo: string, minimo: number): void {
  if (!Number.isSafeInteger(valor) || valor < minimo) {
    throw new LineaInvalida(`"${campo}" debe ser un monto en centavos ${minimo === 0 ? 'no negativo' : 'positivo'}.`);
  }
}

function exigirLineaValida(linea: LineaEscrita): void {
  exigirCentavos(linea.total, 'Total', 1);
  exigirCentavos(linea.otrosImpuestos, 'Otros impuestos', 0);
  if (linea.otrosImpuestos > linea.total) throw new LineaInvalida('Los otros impuestos pasan del total de la línea.');
}

/** El IVA de cada línea: solo las gravadas lo llevan, y solo si el régimen cobra IVA. */
function ivasDeLasLineas(lineas: readonly LineaEscrita[], opciones: OpcionesDeCalculo): number[] {
  const indices = lineas.flatMap((linea, indice) => (linea.claseFiscal === 'gravada' ? [indice] : []));
  const hayIva = opciones.cobraIva && indices.length > 0;
  if (!hayIva && (opciones.ivaDelDte ?? 0) > 0) {
    throw new LineaInvalida(
      'El documento trae IVA, pero ninguna línea es gravada o este tipo de documento no lleva IVA.',
    );
  }
  const ivas = lineas.map(() => 0);
  if (!hayIva) return ivas;
  const gravados = indices.map((indice) => lineas[indice]!.total - lineas[indice]!.otrosImpuestos);
  repartirIva(gravados, opciones.tasaDeIva, opciones.ivaDelDte).forEach((iva, posicion) => {
    ivas[indices[posicion]!] = iva;
  });
  return ivas;
}

/**
 * Calcula las líneas de un documento a partir de lo que escribió el usuario. El IVA se saca del documento completo y
 * se reparte entre sus líneas gravadas (ver `repartirIva`), así que el resultado de una línea depende de las demás.
 * @throws LineaInvalida o CorreccionDeIvaExcedida.
 */
export function calcularLineas(lineas: readonly LineaEscrita[], opciones: OpcionesDeCalculo): LineaCalculada[] {
  if (lineas.length === 0) throw new LineaInvalida('El documento necesita al menos una línea.');
  lineas.forEach(exigirLineaValida);
  const ivas = ivasDeLasLineas(lineas, opciones);
  return lineas.map((linea, indice) => {
    const iva = ivas[indice] ?? 0;
    return { ...linea, orden: indice + 1, iva, base: linea.total - linea.otrosImpuestos - iva };
  });
}
