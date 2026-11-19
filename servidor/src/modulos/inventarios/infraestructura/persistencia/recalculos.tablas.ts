import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, integer, numeric, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { CausaDeRecalculo } from '../../dominio/costeo/recalculo.js';
import { articulos } from './articulos.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';
import { metodosDeCosteo } from './metodos-de-costeo.tablas.js';

type Columnas = Record<'empresaId' | 'articuloId' | 'documentoCausaId' | 'metodoDeCosteoId', AnyPgColumn>;

const llavesDeRecalculo = (t: Columnas) => [
  foreignKey({
    name: 'recalculos_articulo_fk',
    columns: [t.articuloId, t.empresaId],
    foreignColumns: [articulos.id, articulos.empresaId],
  }),
  foreignKey({
    name: 'recalculos_documento_fk',
    columns: [t.documentoCausaId, t.empresaId],
    foreignColumns: [documentos.id, documentos.empresaId],
  }),
  foreignKey({
    name: 'recalculos_metodo_fk',
    columns: [t.metodoDeCosteoId, t.empresaId],
    foreignColumns: [metodosDeCosteo.id, metodosDeCosteo.empresaId],
  }),
];

/**
 * El rastro de cada recálculo del costo de un artículo (§5.14): desde cuándo, por qué y cuánto cambió. Solo se agrega.
 * Los repartos de los costos adicionales (V-2) llegan con INV-5; sus columnas ya están.
 */
export const recalculos = esquemaInventarios.table(
  'recalculos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    articuloId: uuid().notNull(),
    desdeFecha: date({ mode: 'string' }).notNull(),
    documentoCausaId: uuid(),
    metodoDeCosteoId: uuid(),
    causa: text().$type<CausaDeRecalculo>().notNull(),
    salidasAfectadas: integer().notNull(),
    diferenciaDeCosto: numeric({ precision: 14, scale: 2 }).notNull(),
    repartosAfectados: integer().notNull().default(0),
    diferenciaAResultados: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...llavesDeRecalculo(t),
    index('recalculos_articulo_idx').on(t.articuloId, t.creadoEn.desc()),
    index('recalculos_documento_idx')
      .on(t.documentoCausaId)
      .where(sql`${t.documentoCausaId} is not null`),
    index('recalculos_metodo_idx')
      .on(t.metodoDeCosteoId)
      .where(sql`${t.metodoDeCosteoId} is not null`),
    check(
      'recalculos_causa',
      sql`${t.causa} in ('registro_con_fecha_anterior', 'anulacion', 'saldo_inicial_corregido', 'cambio_de_metodo')`,
    ),
    check(
      'recalculos_origen',
      sql`(${t.causa} = 'cambio_de_metodo' and ${t.metodoDeCosteoId} is not null and ${t.documentoCausaId} is null) or (${t.causa} <> 'cambio_de_metodo' and ${t.documentoCausaId} is not null and ${t.metodoDeCosteoId} is null)`,
    ),
    check('recalculos_conteos', sql`${t.salidasAfectadas} >= 0 and ${t.repartosAfectados} >= 0`),
    politicaPorEmpresa(),
  ],
);
