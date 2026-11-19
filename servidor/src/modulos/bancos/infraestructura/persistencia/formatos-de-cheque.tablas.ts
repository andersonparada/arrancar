import { sql } from 'drizzle-orm';
import { boolean, check, index, jsonb, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorCuenta } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/** Las plantillas de fábrica (`dominio/formatos-de-cheque`), como se escriben en los checks. */
export const PLANTILLAS_EN_SQL = `'voucher_carta_arriba', 'voucher_carta_en_medio', 'cheque_suelto', 'cheque_suelto_casillas'`;

/**
 * Formatos de impresión de cheques de la cuenta suscriptora: una plantilla de fábrica (`base`) y lo que difiere de
 * ella (`ajustes`). La impresora de la oficina sirve a todas las empresas de la cuenta, por eso es por cuenta (RLS).
 */
export const formatosDeCheque = esquemaBancos.table(
  'formatos_de_cheque',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    base: text().notNull(),
    /** Solo lo que difiere de la base; se valida con Zod al guardar y al leer. */
    ajustes: jsonb().notNull().default({}),
    /** Cuándo se confirmó «la prueba quedó alineada»; vuelve a nulo al cambiar la base o los ajustes. */
    probadoEn: timestamp({ withTimezone: true }),
    activo: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('formatos_de_cheque_cuenta_idx').on(t.cuentaId),
    uniqueIndex('formatos_de_cheque_nombre_unico').on(t.cuentaId, nombreNormalizado(t.nombre)),
    check('formatos_de_cheque_nombre_valido', sql`char_length(btrim(${t.nombre})) between 1 and 80`),
    check('formatos_de_cheque_base_valida', sql.raw(`base in (${PLANTILLAS_EN_SQL})`)),
    politicaPorCuenta(),
  ],
);
