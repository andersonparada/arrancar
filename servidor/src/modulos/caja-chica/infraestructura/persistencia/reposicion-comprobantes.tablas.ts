import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, numeric, primaryKey, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import { comprobantes } from './comprobantes.tablas.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';

/**
 * Los comprobantes que cubre cada reposición, con su monto firmado (lo que resta va negativo). Las dos llaves llevan
 * el `fondo_id`: la reposición y el comprobante son siempre del mismo fondo. Al anular la reposición sus líneas pasan
 * a `vigente = false` y los comprobantes vuelven a pendientes; el único parcial deja un comprobante en una sola
 * reposición vigente.
 */
export const reposicionComprobantes = esquemaCajaChica.table(
  'reposicion_comprobantes',
  {
    reposicionId: uuid().notNull(),
    comprobanteId: uuid().notNull(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fondoId: uuid().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    vigente: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ columns: [t.reposicionId, t.comprobanteId] }),
    foreignKey({
      name: 'reposicion_comprobantes_reposicion_fk',
      columns: [t.reposicionId, t.empresaId, t.fondoId],
      foreignColumns: [reposiciones.id, reposiciones.empresaId, reposiciones.fondoId],
    }),
    foreignKey({
      name: 'reposicion_comprobantes_comprobante_fk',
      columns: [t.comprobanteId, t.empresaId, t.fondoId],
      foreignColumns: [comprobantes.id, comprobantes.empresaId, comprobantes.fondoId],
    }),
    check('reposicion_comprobantes_monto_no_cero', sql`${t.monto} <> 0`),
    uniqueIndex('reposicion_comprobantes_vigente_unico')
      .on(t.comprobanteId)
      .where(sql`${t.vigente}`),
    index('reposicion_comprobantes_fondo_idx').on(t.fondoId),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_FONDOS, 'fondo_id'),
  ],
);
