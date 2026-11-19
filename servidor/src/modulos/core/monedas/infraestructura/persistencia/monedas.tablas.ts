import { sql } from 'drizzle-orm';
import { boolean, char, check, smallint, text, unique } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { monedasDelBanguat } from './monedas-del-banguat.tablas.js';

/**
 * Catálogo global de monedas (ISO 4217). Nacen apagadas (`activa`): en la versión 1 solo se activan las de dos
 * decimales, porque todo el dinero es `numeric(14,2)`. `codigo_banguat` une la moneda con la lista del Banguat y es
 * lo que hace que se cargue su tipo de cambio.
 */
export const monedas = esquemaCore.table(
  'monedas',
  {
    codigo: char({ length: 3 }).primaryKey(),
    nombre: text().notNull(),
    simbolo: text().notNull(),
    decimales: smallint().notNull().default(2),
    activa: boolean().notNull().default(false),
    codigoBanguat: smallint().references(() => monedasDelBanguat.codigo, { onDelete: 'restrict' }),
    letrasSingular: text(),
    letrasPlural: text(),
  },
  (t) => [
    unique('monedas_codigo_banguat_unico').on(t.codigoBanguat),
    check('monedas_decimales_validos', sql`${t.decimales} between 0 and 4`),
    check('monedas_activa_con_dos_decimales', sql`not ${t.activa} or ${t.decimales} = 2`),
    check('monedas_letras_completas', sql`(${t.letrasSingular} is null) = (${t.letrasPlural} is null)`),
    check('monedas_gtq_sin_codigo', sql`${t.codigo} <> 'GTQ' or ${t.codigoBanguat} is null`),
  ],
);
