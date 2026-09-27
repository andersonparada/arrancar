import { char, primaryKey, text } from 'drizzle-orm/pg-core';
import { esquemaCore } from './core.esquema.js';

/** Departamento de Guatemala; el código de 2 dígitos es el oficial del INE. */
export const departamentos = esquemaCore.table('departamentos', {
  codigo: char({ length: 2 }).primaryKey(),
  nombre: text().notNull(),
});

/** Municipio de Guatemala; su código de 2 dígitos es único dentro del departamento. */
export const municipios = esquemaCore.table(
  'municipios',
  {
    departamentoCodigo: char({ length: 2 })
      .notNull()
      .references(() => departamentos.codigo, { onDelete: 'restrict' }),
    codigo: char({ length: 2 }).notNull(),
    nombre: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.departamentoCodigo, t.codigo] })],
);
