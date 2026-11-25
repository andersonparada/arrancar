import { sql } from 'drizzle-orm';
import { check, foreignKey, index, numeric, smallint, text, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { CLASES_FISCALES, type ClaseFiscal, type TipoDeLinea } from '../../dominio/calculo-de-lineas.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaLibroDeVentas } from './esquema.tablas.js';

const clases = sql.raw(CLASES_FISCALES.map((clase) => `'${clase}'`).join(', '));

type ColumnasDeLinea = Record<
  'orden' | 'tipo' | 'claseFiscal' | 'descripcion' | 'total' | 'base' | 'iva' | 'otrosImpuestos',
  AnyPgColumn
>;

/** Valores permitidos, montos y que la línea cuadre: `total = base + iva + otros`, y solo la gravada lleva IVA. */
const restriccionesDeLinea = (t: ColumnasDeLinea) => [
  check('lineas_de_documento_orden_positivo', sql`${t.orden} > 0`),
  check('lineas_de_documento_tipo_valido', sql`${t.tipo} in ('bien', 'servicio')`),
  check('lineas_de_documento_clase_valida', sql`${t.claseFiscal} in (${clases})`),
  check(
    'lineas_de_documento_descripcion_largo',
    sql`${t.descripcion} is null or char_length(btrim(${t.descripcion})) between 1 and 300`,
  ),
  check(
    'lineas_de_documento_montos_validos',
    sql`${t.total} > 0 and ${t.base} >= 0 and ${t.iva} >= 0 and ${t.otrosImpuestos} >= 0`,
  ),
  check('lineas_de_documento_totales_cuadran', sql`${t.total} = ${t.base} + ${t.iva} + ${t.otrosImpuestos}`),
  check('lineas_de_documento_solo_la_gravada_lleva_iva', sql`${t.claseFiscal} = 'gravada' or ${t.iva} = 0`),
];

/**
 * Una línea de un documento de venta: su concepto de ingreso, su clase fiscal y sus montos en quetzales
 * (`total = base + iva + otros impuestos`; solo la gravada lleva IVA). Se borra con su documento. Su llave única
 * `(id, documento_id, empresa_id)` deja que otros módulos (Activos fijos, Inventarios) la referencien después.
 */
export const lineasDeDocumento = esquemaLibroDeVentas.table(
  'lineas_de_documento',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    documentoId: uuid().notNull(),
    orden: smallint().notNull(),
    conceptoDeIngresoId: uuid().notNull(),
    tipo: text().$type<TipoDeLinea>().notNull(),
    claseFiscal: text().$type<ClaseFiscal>().notNull(),
    descripcion: text(),
    total: numeric({ precision: 14, scale: 2 }).notNull(),
    base: numeric({ precision: 14, scale: 2 }).notNull(),
    iva: numeric({ precision: 14, scale: 2 }).notNull(),
    otrosImpuestos: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'lineas_de_documento_documento_fk',
      columns: [t.documentoId, t.empresaId],
      foreignColumns: [documentos.id, documentos.empresaId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'lineas_de_documento_concepto_fk',
      columns: [t.conceptoDeIngresoId, t.empresaId],
      foreignColumns: [conceptosDeIngreso.id, conceptosDeIngreso.empresaId],
    }),
    unique('lineas_de_documento_orden_unico').on(t.documentoId, t.orden),
    unique('lineas_llave_unica').on(t.id, t.documentoId, t.empresaId),
    index('lineas_de_documento_documento_idx').on(t.documentoId, t.empresaId),
    index('lineas_de_documento_concepto_idx').on(t.conceptoDeIngresoId, t.empresaId),
    ...restriccionesDeLinea(t),
    politicaPorEmpresa(),
  ],
);
