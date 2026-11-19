import { sql } from 'drizzle-orm';
import { boolean, check, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';

/**
 * Las monedas que ofrece el Banco de Guatemala (`VariablesDisponibles`), con el código con que las conoce. Es de toda
 * la instalación y sin RLS, como `core.monedas`. Nunca se borra una fila: la puede usar una moneda o un tipo de
 * cambio guardado; si el Banguat deja de ofrecerla queda `disponible = false`.
 */
export const monedasDelBanguat = esquemaCore.table(
  'monedas_del_banguat',
  {
    codigo: smallint().primaryKey(),
    descripcion: text().notNull(),
    disponible: boolean().notNull().default(true),
    vistaPorPrimeraVez: timestamp({ withTimezone: true }).notNull().defaultNow(),
    vistaPorUltimaVez: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('monedas_del_banguat_codigo_positivo', sql`${t.codigo} > 0`),
    check('monedas_del_banguat_descripcion_valida', sql`char_length(${t.descripcion}) between 1 and 120`),
  ],
);
