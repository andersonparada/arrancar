import { sql } from 'drizzle-orm';
import { check, date, foreignKey, numeric, smallint, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { activos } from './activos.tablas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

/**
 * Lo que traía cada activo de saldo inicial al día de corte (diseño §5.6): su costo, lo ya depreciado en cada libro y,
 * en el fiscal, el costo que se recupera al vender y la base que se deprecia. Una fila por activo; se va con él si se
 * elimina con la carga abierta. Solo `politicaPorEmpresa()`.
 */
export const saldosIniciales = esquemaActivosFijos.table(
  'saldos_iniciales',
  {
    activoId: uuid().primaryKey(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fechaDeCorte: date({ mode: 'string' }).notNull(),
    costo: numeric({ precision: 14, scale: 2 }).notNull(),
    depreciacionAcumuladaContable: numeric({ precision: 14, scale: 2 }).notNull(),
    costoFiscal: numeric({ precision: 14, scale: 2 }).notNull(),
    baseFiscal: numeric({ precision: 14, scale: 2 }).notNull(),
    depreciacionAcumuladaFiscal: numeric({ precision: 14, scale: 2 }).notNull(),
    vidaUtilRestanteMeses: smallint(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'saldos_iniciales_activo_fk',
      columns: [t.activoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }).onDelete('cascade'),
    check('saldos_iniciales_costo', sql`${t.costo} > 0 and ${t.costoFiscal} > 0`),
    check(
      'saldos_iniciales_acumulada_contable',
      sql`${t.depreciacionAcumuladaContable} >= 0 and ${t.depreciacionAcumuladaContable} <= ${t.costo}`,
    ),
    check('saldos_iniciales_base_fiscal', sql`${t.baseFiscal} >= 0 and ${t.baseFiscal} <= ${t.costoFiscal}`),
    check(
      'saldos_iniciales_acumulada_fiscal',
      sql`${t.depreciacionAcumuladaFiscal} >= 0 and ${t.depreciacionAcumuladaFiscal} <= ${t.baseFiscal}`,
    ),
    check('saldos_iniciales_vida_restante', sql`${t.vidaUtilRestanteMeses} between 0 and 1200`),
    politicaPorEmpresa(),
  ],
);
