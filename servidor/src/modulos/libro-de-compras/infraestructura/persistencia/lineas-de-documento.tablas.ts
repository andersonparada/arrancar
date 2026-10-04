import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  numeric,
  smallint,
  text,
  unique,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';
import { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';

type Columnas = Record<
  | 'empresaId'
  | 'documentoId'
  | 'numero'
  | 'conceptoId'
  | 'descripcion'
  | 'tipo'
  | 'esActivoFijo'
  | 'vigenciaDeCombustibleId'
  | 'galones'
  | 'idpPorGalon'
  | 'porcentajeDeEtanol'
  | 'total'
  | 'exento'
  | 'idp'
  | 'base'
  | 'iva'
  | 'ivaNoAcreditable',
  AnyPgColumn
>;

/** Llaves únicas y foráneas: todas compuestas con la empresa, así la línea nunca cruza de empresa. */
const llavesDeLinea = (t: Columnas) => [
  unique('lineas_de_documento_numero_unico').on(t.documentoId, t.numero),
  foreignKey({
    name: 'lineas_de_documento_documento_fk',
    columns: [t.documentoId, t.empresaId],
    foreignColumns: [documentos.id, documentos.empresaId],
  }).onDelete('cascade'),
  foreignKey({
    name: 'lineas_de_documento_concepto_fk',
    columns: [t.conceptoId, t.empresaId],
    foreignColumns: [conceptosDeGasto.id, conceptosDeGasto.empresaId],
  }),
  foreignKey({
    name: 'lineas_de_documento_vigencia_fk',
    columns: [t.vigenciaDeCombustibleId, t.empresaId],
    foreignColumns: [vigenciasDeCombustible.id, vigenciasDeCombustible.empresaId],
  }),
];

/** Valores permitidos, signos de los montos y que cuadren. */
const restriccionesDeMontosDeLinea = (t: Columnas) => [
  check('lineas_de_documento_numero_positivo', sql`${t.numero} >= 1`),
  check('lineas_de_documento_tipo_valido', sql`${t.tipo} in ('bien', 'servicio')`),
  check(
    'lineas_de_documento_descripcion_largo',
    sql`${t.descripcion} is null or char_length(btrim(${t.descripcion})) between 1 and 300`,
  ),
  check('lineas_de_documento_total_positivo', sql`${t.total} > 0`),
  check('lineas_de_documento_exento_no_negativo', sql`${t.exento} >= 0`),
  check('lineas_de_documento_idp_no_negativo', sql`${t.idp} >= 0`),
  check('lineas_de_documento_base_no_negativa', sql`${t.base} >= 0`),
  check('lineas_de_documento_iva_no_negativo', sql`${t.iva} >= 0`),
  check('lineas_de_documento_iva_no_acreditable_rango', sql`${t.ivaNoAcreditable} between 0 and ${t.iva}`),
  check('lineas_de_documento_totales_cuadran', sql`${t.total} = ${t.base} + ${t.iva} + ${t.idp} + ${t.exento}`),
];

/** Combustible (galones, IDP por galón y etanol) y activo fijo: solo para bienes. */
const restriccionesDeCombustible = (t: Columnas) => [
  check('lineas_de_documento_galones_positivos', sql`${t.galones} is null or ${t.galones} > 0`),
  check(
    'lineas_de_documento_combustible_completo',
    sql`(${t.vigenciaDeCombustibleId} is null and ${t.galones} is null and ${t.idpPorGalon} is null and ${t.porcentajeDeEtanol} is null)
        or (${t.vigenciaDeCombustibleId} is not null and ${t.galones} is not null and ${t.idpPorGalon} is not null and ${t.porcentajeDeEtanol} is not null)`,
  ),
  check('lineas_de_documento_combustible_es_bien', sql`${t.vigenciaDeCombustibleId} is null or ${t.tipo} = 'bien'`),
  check('lineas_de_documento_activo_fijo_es_bien', sql`not ${t.esActivoFijo} or ${t.tipo} = 'bien'`),
  check(
    'lineas_de_documento_idp_calculado',
    sql`(${t.vigenciaDeCombustibleId} is null and ${t.idp} = 0)
        or ${t.idp} = round(${t.galones} * ${t.idpPorGalon} * (100 - ${t.porcentajeDeEtanol}) / 100, 2)`,
  ),
];

/** Una línea del documento con sus montos ya calculados; la llave foránea es compuesta con la empresa. */
export const lineasDeDocumento = esquemaLibroDeCompras.table(
  'lineas_de_documento',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    documentoId: uuid().notNull(),
    numero: smallint().notNull(),
    conceptoId: uuid().notNull(),
    descripcion: text(),
    tipo: text().$type<'bien' | 'servicio'>().notNull(),
    esActivoFijo: boolean().default(false).notNull(),
    vigenciaDeCombustibleId: uuid(),
    galones: numeric({ precision: 12, scale: 3 }),
    idpPorGalon: numeric({ precision: 8, scale: 2 }),
    porcentajeDeEtanol: numeric({ precision: 5, scale: 2 }),
    total: numeric({ precision: 14, scale: 2 }).notNull(),
    exento: numeric({ precision: 14, scale: 2 }).default('0').notNull(),
    idp: numeric({ precision: 14, scale: 2 }).notNull(),
    base: numeric({ precision: 14, scale: 2 }).notNull(),
    iva: numeric({ precision: 14, scale: 2 }).notNull(),
    ivaNoAcreditable: numeric({ precision: 14, scale: 2 }).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...llavesDeLinea(t),
    ...restriccionesDeMontosDeLinea(t),
    ...restriccionesDeCombustible(t),
    index('lineas_de_documento_concepto_idx').on(t.conceptoId),
    index('lineas_de_documento_vigencia_idx')
      .on(t.vigenciaDeCombustibleId)
      .where(sql`${t.vigenciaDeCombustibleId} is not null`),
    politicaPorEmpresa(),
  ],
);
