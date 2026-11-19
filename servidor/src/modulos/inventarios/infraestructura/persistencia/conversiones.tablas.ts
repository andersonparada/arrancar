import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, numeric, primaryKey, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { articulos } from './articulos.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';
import { unidades } from './unidades.tablas.js';

/**
 * Cuántas unidades base trae una unidad de empaque de un artículo («caja de 24», «saco de 50 kg»). Las unidades de
 * la misma magnitud que la base no necesitan fila: se convierten por su factor a la referencia.
 */
export const conversiones = esquemaInventarios.table(
  'conversiones',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    articuloId: uuid().notNull(),
    unidadId: uuid().notNull(),
    factor: numeric({ precision: 18, scale: 8 }).notNull(),
    paraCompras: boolean().default(false).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'conversiones_pk', columns: [t.articuloId, t.unidadId] }),
    foreignKey({
      name: 'conversiones_articulo_fk',
      columns: [t.articuloId, t.empresaId],
      foreignColumns: [articulos.id, articulos.empresaId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'conversiones_unidad_fk',
      columns: [t.unidadId, t.empresaId],
      foreignColumns: [unidades.id, unidades.empresaId],
    }),
    uniqueIndex('conversiones_para_compras_unica')
      .on(t.articuloId)
      .where(sql`${t.paraCompras}`),
    index('conversiones_unidad_idx').on(t.unidadId),
    check('conversiones_factor_positivo', sql`${t.factor} > 0`),
    politicaPorEmpresa(),
  ],
);
