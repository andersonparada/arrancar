import { sql } from 'drizzle-orm';
import { char, check, type AnyPgColumn, date, index, integer, jsonb, text, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { FormatoDeArchivoDte, PropositoDeLote, RechazoDeLote } from '../../dominio/lote-de-dte.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

type ColumnasDeLote = Record<
  | 'proposito'
  | 'formato'
  | 'nombreDelArchivo'
  | 'sha256'
  | 'tamanoEnBytes'
  | 'emisionDesde'
  | 'emisionHasta'
  | 'filasLeidas'
  | 'filasNuevas'
  | 'filasActualizadas'
  | 'filasSinCambio'
  | 'filasRechazadas'
  | 'anuladasEnLaSat'
  | 'rechazos'
  | 'encabezadosNoReconocidos'
  | 'resumenDeConciliacion',
  AnyPgColumn
>;

/** Qué archivo es: propósito, formato, nombre, huella, tamaño y fechas de emisión. */
const reglasDelArchivo = (t: ColumnasDeLote) => [
  check('lotes_de_dte_proposito_valido', sql`${t.proposito} in ('bandeja', 'conciliacion')`),
  check('lotes_de_dte_formato_valido', sql`${t.formato} in ('xlsx', 'csv')`),
  check('lotes_de_dte_nombre_largo', sql`char_length(btrim(${t.nombreDelArchivo})) between 1 and 200`),
  check('lotes_de_dte_sha256_valido', sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
  check('lotes_de_dte_tamano_positivo', sql`${t.tamanoEnBytes} > 0`),
  check(
    'lotes_de_dte_emision_ordenada',
    sql`(${t.emisionDesde} is null) = (${t.emisionHasta} is null) and (${t.emisionHasta} is null or ${t.emisionHasta} >= ${t.emisionDesde})`,
  ),
];

/** El resumen de lo leído: las filas no son negativas y suman lo leído; rechazos, encabezados y conciliación. */
const reglasDeLasFilas = (t: ColumnasDeLote) => [
  check(
    'lotes_de_dte_filas_no_negativas',
    sql`${t.filasLeidas} >= 0 and ${t.filasNuevas} >= 0 and ${t.filasActualizadas} >= 0 and ${t.filasSinCambio} >= 0 and ${t.filasRechazadas} >= 0 and ${t.anuladasEnLaSat} >= 0`,
  ),
  check(
    'lotes_de_dte_filas_cuadran',
    sql`${t.filasLeidas} = ${t.filasNuevas} + ${t.filasActualizadas} + ${t.filasSinCambio} + ${t.filasRechazadas}`,
  ),
  check(
    'lotes_de_dte_rechazos_validos',
    sql`jsonb_typeof(${t.rechazos}) = 'array' and jsonb_array_length(${t.rechazos}) <= 1000`,
  ),
  check('lotes_de_dte_encabezados_validos', sql`jsonb_typeof(${t.encabezadosNoReconocidos}) = 'array'`),
  check(
    'lotes_de_dte_conciliacion_con_resumen',
    sql`(${t.proposito} = 'conciliacion') = (${t.resumenDeConciliacion} is not null)`,
  ),
];

/**
 * Una fila por archivo de DTE subido, con su resumen: el rastro de cada carga. No guarda el archivo (solo su huella).
 * Nunca se borra (solo en cascada con la empresa).
 */
export const lotesDeDte = esquemaLibroDeCompras.table(
  'lotes_de_dte',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    proposito: text().$type<PropositoDeLote>().notNull(),
    formato: text().$type<FormatoDeArchivoDte>().notNull(),
    nombreDelArchivo: text().notNull(),
    sha256: char({ length: 64 }).notNull(),
    tamanoEnBytes: integer().notNull(),
    versionDelMapa: text().notNull(),
    emisionDesde: date(),
    emisionHasta: date(),
    filasLeidas: integer().notNull(),
    filasNuevas: integer().notNull(),
    filasActualizadas: integer().notNull(),
    filasSinCambio: integer().notNull(),
    filasRechazadas: integer().notNull(),
    anuladasEnLaSat: integer().notNull(),
    rechazos: jsonb().$type<RechazoDeLote[]>().notNull().default([]),
    encabezadosNoReconocidos: jsonb().$type<string[]>().notNull().default([]),
    resumenDeConciliacion: jsonb().$type<Record<string, number>>(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...reglasDelArchivo(t),
    ...reglasDeLasFilas(t),
    unique('lotes_de_dte_id_empresa_unico').on(t.id, t.empresaId),
    index('lotes_de_dte_empresa_idx').on(t.empresaId, t.creadoEn.desc()),
    politicaPorEmpresa(),
  ],
);
