import { z } from 'zod';

/** Lo que trae un problema de Zod y que hace falta para redactar el mensaje. */
interface Problema {
  code: string;
  origin?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  input?: unknown;
}

const conCantidad = (cantidad: number, singular: string, formaPlural: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : formaPlural}`;

const esLista = (origen?: string): boolean => origen === 'array' || origen === 'set';

function mensajeDeMinimo({ origin, minimum }: Problema): string {
  const minimo = Number(minimum);
  if (origin === 'string') {
    return minimo <= 1 ? 'Campo obligatorio.' : `Escriba al menos ${conCantidad(minimo, 'carácter', 'caracteres')}.`;
  }
  if (esLista(origin)) return `Elija al menos ${conCantidad(minimo, 'opción', 'opciones')}.`;
  return `Debe ser ${minimo} o más.`;
}

function mensajeDeMaximo({ origin, maximum }: Problema): string {
  const maximo = Number(maximum);
  if (origin === 'string') return `Escriba como máximo ${conCantidad(maximo, 'carácter', 'caracteres')}.`;
  if (esLista(origin)) return `Elija como máximo ${conCantidad(maximo, 'opción', 'opciones')}.`;
  return `Debe ser ${maximo} o menos.`;
}

/**
 * Redacta en español claro lo que Zod diría con símbolos («>=1 caracteres»). Devuelve `undefined` cuando
 * no hay una redacción propia y se usa la del idioma.
 */
export function mensajeDeValidacion(problema: Problema): string | undefined {
  if (problema.code === 'too_small') return mensajeDeMinimo(problema);
  if (problema.code === 'too_big') return mensajeDeMaximo(problema);
  if (problema.code === 'invalid_type' && problema.input === undefined) return 'Campo obligatorio.';
  return undefined;
}

/** Idioma de los mensajes de validación de toda la aplicación. */
export function configurarMensajesDeValidacion(): void {
  z.config({ ...z.locales.es(), customError: (problema) => mensajeDeValidacion(problema as Problema) });
}
