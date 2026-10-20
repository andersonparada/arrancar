import { sql } from 'drizzle-orm';
import { char, check, date, index, integer, jsonb, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import {
  autoria,
  idPrimario,
  marcasDeTiempo,
  politicaPorEmpresa,
  politicasDeSoloAgregarPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/** El último folio usado del libro de cada empresa; una fila por empresa, que se crea al primer uso. */
export const foliacionDelLibro = esquemaLibroDeCompras.table(
  'foliacion_del_libro',
  {
    empresaId: uuid()
      .primaryKey()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    ultimoFolio: integer().notNull().default(0),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [check('foliacion_del_libro_folio_no_negativo', sql`${t.ultimoFolio} >= 0`), politicaPorEmpresa()],
);

/**
 * Cada vez que se emite el libro con folios queda una fila: solo se agrega y se lee, nunca se cambia. Que dos
 * emisiones de una empresa no usen el mismo folio lo garantiza una restricción de exclusión
 * (`emisiones_del_libro_sin_traslape`) que crea la migración `0025_l5_folios_sin_traslape`.
 */
export const emisionesDelLibro = esquemaLibroDeCompras.table(
  'emisiones_del_libro',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    periodo: date().notNull(),
    tipoDeLibro: text().notNull(),
    folioDesde: integer().notNull(),
    folioHasta: integer().notNull(),
    paginas: smallint().notNull(),
    archivoId: uuid().references(() => archivos.id),
    huellaDeDatos: char({ length: 64 }).notNull(),
    versionDePlantilla: smallint().notNull(),
    totales: jsonb().notNull(),
    motivo: text(),
    creadoEn: marcasDeTiempo.creadoEn,
    creadoPor: autoria.creadoPor,
  },
  (t) => [
    unique('emisiones_del_libro_folio_unico').on(t.empresaId, t.folioDesde),
    check('emisiones_del_libro_periodo_primer_dia', sql`${t.periodo} = date_trunc('month', ${t.periodo})::date`),
    check('emisiones_del_libro_tipo_valido', sql`${t.tipoDeLibro} in ('completo', 'simplificado')`),
    check('emisiones_del_libro_folios_validos', sql`${t.folioDesde} >= 1 and ${t.folioHasta} >= ${t.folioDesde}`),
    check('emisiones_del_libro_paginas_cuadran', sql`${t.paginas} = ${t.folioHasta} - ${t.folioDesde} + 1`),
    check('emisiones_del_libro_totales_acotados', sql`pg_column_size(${t.totales}) <= 65536`),
    check('emisiones_del_libro_motivo_valido', sql`${t.motivo} is null or char_length(${t.motivo}) between 1 and 300`),
    index('emisiones_del_libro_periodo_idx').on(t.empresaId, t.periodo, t.creadoEn.desc()),
    index('emisiones_del_libro_archivo_idx')
      .on(t.archivoId)
      .where(sql`${t.archivoId} is not null`),
    ...politicasDeSoloAgregarPorEmpresa(),
  ],
);
