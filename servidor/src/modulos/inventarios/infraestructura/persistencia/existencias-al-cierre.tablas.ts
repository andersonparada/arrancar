import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  numeric,
  text,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';
import { ALCANCE_DE_BODEGAS } from './alcance-de-bodegas.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { tiposEnSql } from './categorias.tablas.js';
import { cierres } from './cierres.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';

const columnas = {
  id: idPrimario(),
  empresaId: uuid()
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  periodo: date({ mode: 'string' }).notNull(),
  articuloId: uuid().notNull(),
  bodegaId: uuid().notNull(),
  tipoDeInventario: text().$type<TipoDeInventario>().notNull(),
  cantidad: numeric({ precision: 16, scale: 4 }).notNull(),
  costoUnitario: numeric({ precision: 15, scale: 6 }).notNull(),
  valor: numeric({ precision: 14, scale: 2 }).notNull(),
  enTransitoInterno: boolean().notNull().default(false),
  vigente: boolean().notNull().default(true),
  ...marcasDeTiempo,
  ...autoria,
};

type Columnas = Record<keyof typeof columnas, AnyPgColumn>;

const llaves = (t: Columnas) => [
  foreignKey({
    name: 'existencias_al_cierre_cierre_fk',
    columns: [t.empresaId, t.periodo],
    foreignColumns: [cierres.empresaId, cierres.periodo],
  }),
  foreignKey({
    name: 'existencias_al_cierre_articulo_fk',
    columns: [t.articuloId, t.empresaId],
    foreignColumns: [articulos.id, articulos.empresaId],
  }),
  foreignKey({
    name: 'existencias_al_cierre_bodega_fk',
    columns: [t.bodegaId, t.empresaId],
    foreignColumns: [bodegas.id, bodegas.empresaId],
  }),
];

const indices = (t: Columnas) => [
  uniqueIndex('existencias_al_cierre_vigente_unica')
    .on(t.articuloId, t.bodegaId, t.enTransitoInterno, t.periodo)
    .where(sql`${t.vigente}`),
  index('existencias_al_cierre_periodo_idx')
    .on(t.empresaId, t.periodo)
    .where(sql`${t.vigente}`),
  index('existencias_al_cierre_bodega_idx').on(t.bodegaId),
  index('existencias_al_cierre_articulo_idx').on(t.articuloId),
];

/**
 * La foto de las existencias valuadas de un mes cerrado (diseño §5.19): una fila por artículo y bodega, más una
 * `en_transito_interno` por bodega de origen para lo que viaja entre bodegas. Reabrir el mes deja sus filas
 * `vigente = false`; no se borran. El tipo de inventario se copia: reclasificar el artículo después no cambia lo
 * informado. Cada usuario solo ve las bodegas que tiene asignadas.
 */
export const existenciasAlCierre = esquemaInventarios.table('existencias_al_cierre', columnas, (t) => [
  ...llaves(t),
  ...indices(t),
  check('existencias_al_cierre_tipo', sql`${t.tipoDeInventario} in (${tiposEnSql})`),
  check('existencias_al_cierre_montos', sql`${t.cantidad} > 0 and ${t.costoUnitario} >= 0 and ${t.valor} >= 0`),
  politicaPorEmpresa(),
  politicaPorAlcance(ALCANCE_DE_BODEGAS, 'bodega_id'),
]);
