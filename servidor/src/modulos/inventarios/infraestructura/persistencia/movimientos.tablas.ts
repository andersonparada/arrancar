import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  foreignKey,
  index,
  numeric,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import type { TipoDeMovimientoGuardado } from '../../dominio/movimiento.js';
import { articulos } from './articulos.tablas.js';
import { bodegas } from './bodegas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';
import { lotes } from './lotes.tablas.js';
import { reglasDeMovimiento } from './movimientos.reglas.js';
import { unidades } from './unidades.tablas.js';

const columnas = {
  id: idPrimario(),
  empresaId: uuid()
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  documentoId: uuid().notNull(),
  articuloId: uuid().notNull(),
  bodegaId: uuid(),
  loteId: uuid(),
  fecha: date({ mode: 'string' }).notNull(),
  ordenDelDia: smallint().notNull(),
  secuencia: bigint({ mode: 'number' }).generatedAlwaysAsIdentity().notNull(),
  tipo: text().$type<TipoDeMovimientoGuardado>().notNull(),
  cantidad: numeric({ precision: 14, scale: 4 }).notNull(),
  cantidadEscrita: numeric({ precision: 14, scale: 4 }),
  unidadEscritaId: uuid(),
  costoUnitario: numeric({ precision: 15, scale: 6 }).notNull(),
  costoTotal: numeric({ precision: 14, scale: 2 }).notNull(),
  costoDelMetodo: boolean().notNull(),
  saldoCantidad: numeric({ precision: 16, scale: 4 }).notNull(),
  saldoValor: numeric({ precision: 14, scale: 2 }).notNull(),
  lineaDeDocumentoDeCompraId: uuid(),
  documentoDeCompraId: uuid(),
  movimientoDeOrigenId: uuid(),
  fechaDeCapa: date({ mode: 'string' }),
  montoAResultados: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
  vigente: boolean().notNull().default(true),
  ...marcasDeTiempo,
  ...autoria,
};

type Columnas = Record<keyof typeof columnas, AnyPgColumn>;

const conValor = (columna: AnyPgColumn) => sql`${columna} is not null`;

const llavesDelKardex = (t: Columnas) => [
  foreignKey({
    name: 'movimientos_documento_fk',
    columns: [t.documentoId, t.empresaId],
    foreignColumns: [documentos.id, documentos.empresaId],
  }),
  foreignKey({
    name: 'movimientos_articulo_fk',
    columns: [t.articuloId, t.empresaId],
    foreignColumns: [articulos.id, articulos.empresaId],
  }),
  foreignKey({
    name: 'movimientos_bodega_fk',
    columns: [t.bodegaId, t.empresaId],
    foreignColumns: [bodegas.id, bodegas.empresaId],
  }),
];

const llavesDeCatalogos = (t: Columnas) => [
  foreignKey({
    name: 'movimientos_lote_fk',
    columns: [t.loteId, t.empresaId],
    foreignColumns: [lotes.id, lotes.empresaId],
  }),
  foreignKey({
    name: 'movimientos_unidad_escrita_fk',
    columns: [t.unidadEscritaId, t.empresaId],
    foreignColumns: [unidades.id, unidades.empresaId],
  }),
  foreignKey({
    name: 'movimientos_linea_de_compra_fk',
    columns: [t.lineaDeDocumentoDeCompraId, t.documentoDeCompraId, t.empresaId],
    foreignColumns: [lineasDeDocumento.id, lineasDeDocumento.documentoId, lineasDeDocumento.empresaId],
  }),
  foreignKey({
    name: 'movimientos_origen_fk',
    columns: [t.movimientoDeOrigenId, t.empresaId],
    foreignColumns: [t.id, t.empresaId],
  }),
];

/** Un renglón vigente de saldo inicial por artículo, bodega, lote (nulo cuenta como uno solo) y fecha de la capa (§8). */
const indiceDeSaldoInicialUnico = (t: Columnas) =>
  uniqueIndex('movimientos_saldo_inicial_unico')
    .on(
      t.empresaId,
      t.articuloId,
      t.bodegaId,
      sql`coalesce(${t.loteId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      t.fechaDeCapa,
    )
    .where(sql`${t.fechaDeCapa} is not null and ${t.vigente}`);

const indices = (t: Columnas) => [
  indiceDeSaldoInicialUnico(t),
  unique('movimientos_id_empresa_unico').on(t.id, t.empresaId),
  index('movimientos_documento_idx').on(t.documentoId),
  index('movimientos_kardex_idx')
    .on(t.articuloId, t.fecha, t.ordenDelDia, t.secuencia)
    .where(sql`${t.vigente}`),
  index('movimientos_bodega_idx')
    .on(t.bodegaId, t.articuloId, t.fecha, t.ordenDelDia, t.secuencia)
    .where(sql`${t.vigente}`),
  index('movimientos_fecha_idx')
    .on(t.empresaId, t.fecha)
    .where(sql`${t.vigente}`),
  index('movimientos_lote_idx').on(t.loteId).where(conValor(t.loteId)),
  index('movimientos_unidad_escrita_idx').on(t.unidadEscritaId).where(conValor(t.unidadEscritaId)),
  index('movimientos_linea_de_compra_idx')
    .on(t.lineaDeDocumentoDeCompraId)
    .where(conValor(t.lineaDeDocumentoDeCompraId)),
  index('movimientos_saldo_inicial_idx')
    .on(t.empresaId, t.articuloId)
    .where(sql`${t.fechaDeCapa} is not null and ${t.vigente}`),
  index('movimientos_origen_idx').on(t.movimientoDeOrigenId).where(conValor(t.movimientoDeOrigenId)),
];

/**
 * El kardex: una línea por artículo, bodega y lote, con cantidad y valor con signo (§5.10). **Solo con seguridad por
 * empresa, sin alcance por bodega** [decisión del arquitecto]: el recálculo reescribe las salidas del artículo en todas
 * las bodegas. Por eso nadie la lee fuera de su documento (que sí lleva el alcance) y los saldos de la empresa que
 * guarda no se dan a quien no ve todas las bodegas.
 */
export const movimientos = esquemaInventarios.table('movimientos', columnas, (t) => [
  ...llavesDelKardex(t),
  ...llavesDeCatalogos(t),
  ...indices(t),
  ...reglasDeMovimiento(t),
  politicaPorEmpresa(),
]);
