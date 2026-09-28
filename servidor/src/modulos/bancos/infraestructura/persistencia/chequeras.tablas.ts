import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/**
 * Rangos de cheques de una cuenta bancaria. Al crearla se insertan todos sus
 * cheques (`bancos.cheques`) como disponibles; no se borra, se inactiva.
 */
export const chequeras = esquemaBancos.table(
  'chequeras',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaBancariaId: uuid()
      .references((): AnyPgColumn => cuentasBancarias.id)
      .notNull(),
    serie: text(),
    desde: integer().notNull(),
    hasta: integer().notNull(),
    activa: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('chequeras_cuenta_idx').on(t.cuentaBancariaId),
    check('chequeras_desde_positivo', sql`${t.desde} > 0`),
    check('chequeras_hasta_valido', sql`${t.hasta} >= ${t.desde}`),
    politicaPorEmpresa(),
  ],
);
