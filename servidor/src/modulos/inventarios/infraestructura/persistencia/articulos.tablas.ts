import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  numeric,
  text,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';
import { categorias, tiposEnSql } from './categorias.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';
import { unidades } from './unidades.tablas.js';

const columnas = {
  id: idPrimario(),
  empresaId: uuid()
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  codigo: text().notNull(),
  nombre: text().notNull(),
  descripcion: text(),
  categoriaId: uuid().notNull(),
  tipoDeInventario: text().$type<TipoDeInventario>().notNull(),
  unidadBaseId: uuid().notNull(),
  manejaLotes: boolean().default(false).notNull(),
  manejaVencimiento: boolean().default(false).notNull(),
  codigoDeBarras: text(),
  conceptoDeGastoId: uuid(),
  existenciaMinima: numeric({ precision: 14, scale: 4 }),
  pesoKgPorUnidadBase: numeric({ precision: 14, scale: 4 }),
  activo: boolean().default(true).notNull(),
  ...marcasDeTiempo,
  ...autoria,
};

type Columnas = Record<keyof typeof columnas, AnyPgColumn>;

/** Únicos (código, nombre y código de barras) e índices de búsqueda. */
const unicosEIndices = (t: Columnas) => [
  uniqueIndex('articulos_codigo_unico').on(t.empresaId, sql`upper(${t.codigo})`),
  uniqueIndex('articulos_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
  uniqueIndex('articulos_codigo_de_barras_unico')
    .on(t.empresaId, t.codigoDeBarras)
    .where(sql`${t.codigoDeBarras} is not null`),
  unique('articulos_id_empresa_unico').on(t.id, t.empresaId),
  index('articulos_empresa_activo_categoria_idx').on(t.empresaId, t.activo, t.categoriaId),
  index('articulos_categoria_idx').on(t.categoriaId),
  index('articulos_unidad_base_idx').on(t.unidadBaseId),
  index('articulos_concepto_de_gasto_idx')
    .on(t.conceptoDeGastoId)
    .where(sql`${t.conceptoDeGastoId} is not null`),
];

/** Llaves compuestas con la empresa: no se puede elegir la categoría, unidad o concepto de otra. */
const llaves = (t: Columnas) => [
  foreignKey({
    name: 'articulos_categoria_fk',
    columns: [t.categoriaId, t.empresaId],
    foreignColumns: [categorias.id, categorias.empresaId],
  }),
  foreignKey({
    name: 'articulos_unidad_base_fk',
    columns: [t.unidadBaseId, t.empresaId],
    foreignColumns: [unidades.id, unidades.empresaId],
  }),
  foreignKey({
    name: 'articulos_concepto_de_gasto_fk',
    columns: [t.conceptoDeGastoId, t.empresaId],
    foreignColumns: [conceptosDeGasto.id, conceptosDeGasto.empresaId],
  }),
];

const reglas = (t: Columnas) => [
  check('articulos_codigo_forma', sql`${t.codigo} ~ '^[A-Za-z0-9./-]{1,30}$'`),
  check('articulos_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 150`),
  check('articulos_descripcion_largo', sql`char_length(${t.descripcion}) between 1 and 500`),
  check('articulos_tipo_de_inventario', sql`${t.tipoDeInventario} in (${tiposEnSql})`),
  check('articulos_vencimiento_con_lotes', sql`not ${t.manejaVencimiento} or ${t.manejaLotes}`),
  check('articulos_codigo_de_barras_largo', sql`char_length(${t.codigoDeBarras}) between 1 and 60`),
  check('articulos_existencia_minima', sql`${t.existenciaMinima} >= 0`),
  check('articulos_peso_positivo', sql`${t.pesoKgPorUnidadBase} > 0`),
];

/** Los artículos de cada empresa; la seguridad por empresa (RLS) oculta los de otras. */
export const articulos = esquemaInventarios.table('articulos', columnas, (t) => [
  ...unicosEIndices(t),
  ...llaves(t),
  ...reglas(t),
  politicaPorEmpresa(),
]);
