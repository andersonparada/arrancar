import { foreignKey, index, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { clases } from './clases.tablas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

/**
 * La clase que la bandeja propone para las líneas de cada concepto de gasto (Vehículos → Vehículos). Un concepto
 * propone una sola clase; si el concepto se elimina del libro, su fila se va con él.
 */
export const clasesPorConcepto = esquemaActivosFijos.table(
  'clases_por_concepto',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    conceptoDeGastoId: uuid().notNull(),
    claseId: uuid().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'clases_por_concepto_pk', columns: [t.empresaId, t.conceptoDeGastoId] }),
    foreignKey({
      name: 'clases_por_concepto_concepto_fk',
      columns: [t.conceptoDeGastoId, t.empresaId],
      foreignColumns: [conceptosDeGasto.id, conceptosDeGasto.empresaId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'clases_por_concepto_clase_fk',
      columns: [t.claseId, t.empresaId],
      foreignColumns: [clases.id, clases.empresaId],
    }),
    index('clases_por_concepto_clase_idx').on(t.claseId),
    politicaPorEmpresa(),
  ],
);
