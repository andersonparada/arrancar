import { sql } from 'drizzle-orm';
import { boolean, check, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';

/**
 * Las monedas que ofrece el Banco de Guatemala (`VariablesDisponibles`), con el código con que las conoce. Es de toda
 * la instalación y sin RLS, como `core.monedas`. Nunca se borra una fila: la puede usar una moneda o un tipo de
 * cambio guardado; si el Banguat deja de ofrecerla queda `disponible = false`.
 *
 * `convencion` dice cómo publica el Banguat cada código (quetzales por unidad, dólares por unidad o unidades por
 * dólar). La fija solo una migración: la app no puede escribirla (`RESTRICCIONES_DE_PRIVILEGIOS`) y nula significa
 * «sin comprobar»: el código no se ofrece ni se carga.
 */
export const CONVENCIONES_DEL_BANGUAT = ['quetzales_por_unidad', 'usd_por_unidad', 'unidades_por_usd'] as const;
export type ConvencionDelBanguat = (typeof CONVENCIONES_DEL_BANGUAT)[number];

export const monedasDelBanguat = esquemaCore.table(
  'monedas_del_banguat',
  {
    codigo: smallint().primaryKey(),
    descripcion: text().notNull(),
    disponible: boolean().notNull().default(true),
    convencion: text({ enum: CONVENCIONES_DEL_BANGUAT }),
    vistaPorPrimeraVez: timestamp({ withTimezone: true }).notNull().defaultNow(),
    vistaPorUltimaVez: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('monedas_del_banguat_codigo_positivo', sql`${t.codigo} > 0`),
    check('monedas_del_banguat_descripcion_valida', sql`char_length(${t.descripcion}) between 1 and 120`),
    check(
      'monedas_del_banguat_convencion_valida',
      sql`${t.convencion} is null or ${t.convencion} in ('quetzales_por_unidad', 'usd_por_unidad', 'unidades_por_usd')`,
    ),
  ],
);
