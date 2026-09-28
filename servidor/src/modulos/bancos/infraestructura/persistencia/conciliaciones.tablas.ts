import { sql } from 'drizzle-orm';
import { check, integer, numeric, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/**
 * La conciliación de una cuenta con el estado de cuenta del banco, mes por mes.
 * Una sola por cuenta y mes; se cierra con diferencia cero y deja la cuenta
 * conciliada hasta el fin de ese mes. No se corrige: se elimina (solo la
 * última) y se vuelve a iniciar.
 */
export const conciliaciones = esquemaBancos.table(
  'conciliaciones',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaBancariaId: uuid()
      .references((): AnyPgColumn => cuentasBancarias.id)
      .notNull(),
    anio: integer().notNull(),
    mes: integer().notNull(),
    saldoSegunBanco: numeric({ precision: 14, scale: 2 }).notNull(),
    cerradaEn: timestamp({ withTimezone: true }),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('conciliaciones_cuenta_mes_unico').on(t.cuentaBancariaId, t.anio, t.mes),
    check('conciliaciones_mes_valido', sql`${t.mes} between 1 and 12`),
    politicaPorEmpresa(),
  ],
);
