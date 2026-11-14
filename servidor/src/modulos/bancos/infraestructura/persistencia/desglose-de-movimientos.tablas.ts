import { sql } from 'drizzle-orm';
import { check, foreignKey, index, numeric, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { conceptos } from './conceptos.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/**
 * El reparto por concepto de un movimiento (CP4): existe solo cuando el reparto no es «todo al concepto del
 * movimiento» (dos o más conceptos, o uno distinto del de `movimientos.concepto_id`). La suma de las líneas es el
 * monto del movimiento; la revisa quien lo escribe. Los reportes por concepto la usan cuando existe.
 */
export const desgloseDeMovimientos = esquemaBancos.table(
  'desglose_de_movimientos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    movimientoId: uuid()
      .notNull()
      .references((): AnyPgColumn => movimientos.id, { onDelete: 'cascade' }),
    conceptoId: uuid().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('desglose_de_movimientos_movimiento_idx').on(t.movimientoId),
    unique('desglose_de_movimientos_concepto_unico').on(t.movimientoId, t.conceptoId),
    foreignKey({
      name: 'desglose_de_movimientos_concepto_de_la_empresa_fk',
      columns: [t.conceptoId, t.empresaId],
      foreignColumns: [conceptos.id, conceptos.empresaId],
    }),
    check('desglose_de_movimientos_monto_positivo', sql`${t.monto} > 0`),
    politicaPorEmpresa(),
  ],
);
