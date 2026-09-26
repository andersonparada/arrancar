import { char, smallint, text } from 'drizzle-orm/pg-core';
import { esquemaCore } from './core.esquema.js';

/** Catálogo global de monedas (ISO 4217). */
export const monedas = esquemaCore.table('monedas', {
  codigo: char({ length: 3 }).primaryKey(),
  nombre: text().notNull(),
  simbolo: text().notNull(),
  decimales: smallint().notNull().default(2),
});
