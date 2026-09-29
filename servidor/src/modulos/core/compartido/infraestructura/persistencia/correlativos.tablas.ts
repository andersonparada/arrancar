import { check, integer, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { politicaPorEmpresa } from '../../../base-datos/columnas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaCore } from './esquema-core.tablas.js';

/**
 * Consecutivos internos de comprobantes: una fila por empresa, clave y año. `anio` es 0 cuando la
 * empresa no reinicia el correlativo cada año (lo normal). `siguiente` es el próximo número a
 * entregar; el bloqueo de la fila dura lo que la transacción, así un `rollback` no deja huecos.
 */
export const correlativos = esquemaCore.table(
  'correlativos',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    clave: text().notNull(),
    anio: integer().notNull().default(0),
    siguiente: integer().notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.clave, t.anio] }),
    check('correlativos_siguiente_positivo', sql`${t.siguiente} > 0`),
    politicaPorEmpresa(),
  ],
);
