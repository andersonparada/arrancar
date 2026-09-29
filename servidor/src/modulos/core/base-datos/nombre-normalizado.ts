import { sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Expresión `core.nombre_normalizado(columna)`: el nombre sin mayúsculas, acentos ni espacios repetidos.
 * Va en los índices únicos de los catálogos para que «Planilla», «planílla» y « PLANILLA » cuenten como el mismo.
 */
export function nombreNormalizado(columna: AnyPgColumn): SQL {
  return sql`core.nombre_normalizado(${columna})`;
}
