import { sql } from 'drizzle-orm';
import { check, date, index, numeric, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

type Columnas = Record<
  | 'mes'
  | 'grupo'
  | 'fechaDePago'
  | 'documentoDePago'
  | 'monto'
  | 'retenidoAlMarcar'
  | 'observaciones'
  | 'estado'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** Valores permitidos de lo que se pagó y de cuándo. */
const restriccionesDelPago = (t: Columnas) => [
  check('enteros_de_retenciones_mes_primer_dia', sql`${t.mes} = date_trunc('month', ${t.mes})::date`),
  check(
    'enteros_de_retenciones_grupo_valido',
    sql`${t.grupo} in ('iva_agentes', 'isr_opcional', 'iva_factura_especial', 'isr_factura_especial')`,
  ),
  check('enteros_de_retenciones_fecha_de_pago', sql`${t.fechaDePago} >= ${t.mes}`),
  check(
    'enteros_de_retenciones_documento_de_pago',
    sql`char_length(${t.documentoDePago}) between 1 and 40 and ${t.documentoDePago} !~ '\\s'`,
  ),
  check('enteros_de_retenciones_monto_positivo', sql`${t.monto} > 0`),
  check('enteros_de_retenciones_retenido_no_negativo', sql`${t.retenidoAlMarcar} >= 0`),
  check(
    'enteros_de_retenciones_observaciones_rango',
    sql`${t.observaciones} is null or char_length(${t.observaciones}) between 1 and 300`,
  ),
];

/** El estado y los tres datos de la anulación, que van juntos o ninguno. */
const restriccionesDelEstado = (t: Columnas) => [
  check('enteros_de_retenciones_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
  check(
    'enteros_de_retenciones_anulacion_completa',
    sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null)`,
  ),
  check(
    'enteros_de_retenciones_motivo_rango',
    sql`${t.motivoDeAnulacion} is null or char_length(${t.motivoDeAnulacion}) between 1 and 300`,
  ),
];

/**
 * Un pago de las retenciones de un mes y grupo. Puede haber varios por mes y grupo (el original y los complementarios);
 * un pago anulado queda como rastro y no cuenta.
 */
export const enterosDeRetenciones = esquemaLibroDeCompras.table(
  'enteros_de_retenciones',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Primer día del mes de las retenciones. */
    mes: date().notNull(),
    grupo: text().notNull(),
    fechaDePago: date().notNull(),
    /** Número del formulario o de la boleta de pago. */
    documentoDePago: text().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** Foto de lo retenido del mes y grupo (documentos vigentes) cuando se marcó. */
    retenidoAlMarcar: numeric({ precision: 14, scale: 2 }).notNull(),
    observaciones: text(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('enteros_de_retenciones_mes_idx').on(t.empresaId, t.mes, t.grupo),
    ...restriccionesDelPago(t),
    ...restriccionesDelEstado(t),
    politicaPorEmpresa(),
  ],
);
