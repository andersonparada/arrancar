import { sql } from 'drizzle-orm';
import { check, foreignKey, index, numeric, primaryKey, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_BODEGAS } from './alcance-de-bodegas.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';
import { lotes } from './lotes.tablas.js';

/** La llave de «sin lote»: la clave primaria no admite nulos. */
export const SIN_LOTE = '00000000-0000-0000-0000-000000000000';

type Columnas = Record<'empresaId' | 'bodegaId' | 'articuloId' | 'loteId' | 'loteClave', AnyPgColumn>;

/** La clave primaria y las llaves compuestas con la empresa. */
const llavesDeExistencia = (t: Columnas) => [
  primaryKey({ name: 'existencias_pk', columns: [t.empresaId, t.bodegaId, t.articuloId, t.loteClave] }),
  foreignKey({
    name: 'existencias_bodega_fk',
    columns: [t.bodegaId, t.empresaId],
    foreignColumns: [bodegas.id, bodegas.empresaId],
  }),
  foreignKey({
    name: 'existencias_articulo_fk',
    columns: [t.articuloId, t.empresaId],
    foreignColumns: [articulos.id, articulos.empresaId],
  }),
  foreignKey({
    name: 'existencias_lote_fk',
    columns: [t.loteId, t.empresaId],
    foreignColumns: [lotes.id, lotes.empresaId],
  }),
];

/**
 * La cantidad actual por bodega, artículo y lote (§5.11): un caché que mantienen los casos de uso en la misma
 * transacción que el movimiento. Cada usuario solo ve las bodegas que tiene asignadas.
 */
export const existencias = esquemaInventarios.table(
  'existencias',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    bodegaId: uuid().notNull(),
    articuloId: uuid().notNull(),
    loteId: uuid(),
    loteClave: uuid().notNull().default(SIN_LOTE),
    cantidad: numeric({ precision: 16, scale: 4 }).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...llavesDeExistencia(t),
    index('existencias_articulo_idx')
      .on(t.articuloId)
      .where(sql`${t.cantidad} > 0`),
    index('existencias_bodega_idx').on(t.bodegaId),
    index('existencias_lote_idx')
      .on(t.loteId)
      .where(sql`${t.loteId} is not null`),
    check('existencias_cantidad_no_negativa', sql`${t.cantidad} >= 0`),
    check('existencias_clave_del_lote', sql`${t.loteClave} = coalesce(${t.loteId}, '${sql.raw(SIN_LOTE)}'::uuid)`),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_BODEGAS, 'bodega_id'),
  ],
);
