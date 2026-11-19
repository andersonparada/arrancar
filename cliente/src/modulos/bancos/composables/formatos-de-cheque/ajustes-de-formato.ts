import { numeroRequerido } from '@/modulos/core/utilidades/edicion';
import type { FormatoDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';

type Objeto = Record<string, unknown>;

const esObjeto = (valor: unknown): valor is Objeto =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esMedida = (clave: string): boolean => clave.endsWith('Mm') || clave.endsWith('Pt');

function sonIguales(a: unknown, b: unknown): boolean {
  if (esObjeto(a) && esObjeto(b)) {
    const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...claves].every((clave) => sonIguales(a[clave], b[clave]));
  }
  return a === b;
}

/** Lo que cambió de `actual` respecto de `base`: los objetos se comparan campo por campo y lo demás se reemplaza. */
function diferencias(base: Objeto, actual: Objeto): Objeto {
  const resultado: Objeto = {};
  for (const [clave, valor] of Object.entries(actual)) {
    const original = base[clave];
    if (sonIguales(original, valor)) continue;
    if (esObjeto(original) && esObjeto(valor)) resultado[clave] = diferencias(original, valor);
    else resultado[clave] = valor;
  }
  return resultado;
}

const esValorDeMedida = (clave: string, valor: unknown): valor is string | number =>
  esMedida(clave) && (typeof valor === 'string' || typeof valor === 'number');

/**
 * Las medidas escritas en los campos de texto como números; una medida opcional (`tamanoPt`) vacía se quita. Lo que no
 * es número se deja como `NaN` para que el servidor lo rechace y avise.
 */
export function conMedidasNumericas<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map(conMedidasNumericas) as T;
  if (!esObjeto(valor)) return valor;
  const resultado: Objeto = {};
  for (const [clave, interno] of Object.entries(valor)) {
    if (clave === 'tamanoPt' && String(interno ?? '').trim() === '') continue;
    resultado[clave] = esValorDeMedida(clave, interno) ? numeroRequerido(interno) : conMedidasNumericas(interno);
  }
  return resultado as T;
}

/**
 * Los ajustes que se guardan: solo lo que difiere de la plantilla de fábrica. Si cambia el modo de la fecha es otra
 * forma, así que la fecha va completa (el servidor la reemplaza en vez de mezclarla).
 */
export function ajustesDeFormato(base: FormatoDeCheque, editado: FormatoDeCheque): Record<string, unknown> {
  const actual = conMedidasNumericas(editado) as unknown as Objeto;
  const ajustes = diferencias(base as unknown as Objeto, actual);
  if (base.fecha.modo !== editado.fecha.modo) ajustes.fecha = actual.fecha;
  return ajustes;
}

/** Una copia que se puede editar sin tocar la plantilla. */
export const copiaDelFormato = (formato: FormatoDeCheque): FormatoDeCheque =>
  JSON.parse(JSON.stringify(formato)) as FormatoDeCheque;
