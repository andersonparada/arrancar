import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

const REGLAS =
  "'iva_exportador_agropecuario', 'iva_exportador', 'iva_contribuyente_especial', 'iva_otro_agente', " +
  "'iva_sector_publico', 'iva_pequeno_contribuyente', 'isr_opcional_simplificado', " +
  "'iva_factura_especial', 'isr_factura_especial'";

type Columnas = Record<
  | 'empresaId'
  | 'documentoId'
  | 'impuesto'
  | 'regla'
  | 'base'
  | 'porcentaje'
  | 'montoPropuesto'
  | 'monto'
  | 'motivoDelAjuste'
  | 'fecha'
  | 'constanciaNumero'
  | 'constanciaFecha'
  | 'resolucion'
  | 'notaDeResolucion'
  | 'resueltaEn'
  | 'resueltaPor',
  AnyPgColumn
>;

/** Valores permitidos, rangos de los montos y reglas del ajuste. */
const restriccionesDeMontos = (t: Columnas) => [
  check('retenciones_impuesto_valido', sql`${t.impuesto} in ('iva', 'isr')`),
  check('retenciones_regla_valida', sql`${t.regla} in (${sql.raw(REGLAS)})`),
  check('retenciones_impuesto_de_la_regla', sql`${t.impuesto} = split_part(${t.regla}, '_', 1)`),
  check('retenciones_base_positiva', sql`${t.base} > 0`),
  check('retenciones_porcentaje_rango', sql`${t.porcentaje} is null or ${t.porcentaje} between 0 and 100`),
  check(
    'retenciones_porcentaje_nulo_solo_isr',
    sql`${t.porcentaje} is not null or ${t.regla} = 'isr_opcional_simplificado'`,
  ),
  check(
    'retenciones_iva_factura_especial_completa',
    sql`${t.regla} <> 'iva_factura_especial' or ${t.porcentaje} = 100`,
  ),
  check('retenciones_monto_propuesto_no_negativo', sql`${t.montoPropuesto} >= 0`),
  check('retenciones_monto_rango', sql`${t.monto} between 0 and ${t.base}`),
  check('retenciones_motivo_del_ajuste', sql`${t.monto} = ${t.montoPropuesto} or ${t.motivoDelAjuste} is not null`),
];

/** La fecha de la retención y su constancia. */
const restriccionesDeFechas = (t: Columnas) => [
  check('retenciones_constancia_completa', sql`(${t.constanciaNumero} is null) = (${t.constanciaFecha} is null)`),
  index('retenciones_mes_idx').on(t.empresaId, t.fecha),
];

/** «Por resolver»: una retención practicada de un documento anulado (que sea de un anulado lo cuida el dominio). */
const restriccionesDeResolucion = (t: Columnas) => [
  check(
    'retenciones_resolucion_valida',
    sql`${t.resolucion} is null or ${t.resolucion} in ('pendiente', 'constancia_anulada', 'rectificada', 'no_requiere')`,
  ),
  check('retenciones_resolucion_solo_practicada', sql`${t.resolucion} is null or ${t.monto} > 0`),
  check(
    'retenciones_resolucion_completa',
    sql`(${t.resolucion} in ('constancia_anulada', 'rectificada', 'no_requiere') and ${t.resueltaEn} is not null and ${t.resueltaPor} is not null and ${t.notaDeResolucion} is not null) or ((${t.resolucion} is null or ${t.resolucion} = 'pendiente') and ${t.resueltaEn} is null and ${t.resueltaPor} is null and ${t.notaDeResolucion} is null)`,
  ),
  check(
    'retenciones_nota_de_resolucion_rango',
    sql`${t.notaDeResolucion} is null or char_length(${t.notaDeResolucion}) between 1 and 300`,
  ),
  index('retenciones_por_resolver_idx')
    .on(t.empresaId)
    .where(sql`${t.resolucion} = 'pendiente'`),
];

/** Una retención ya calculada y fijada al registrar el documento; se guarda aunque el usuario la quite. */
export const retenciones = esquemaLibroDeCompras.table(
  'retenciones',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    documentoId: uuid().notNull(),
    impuesto: text().$type<'iva' | 'isr'>().notNull(),
    regla: text().notNull(),
    base: numeric({ precision: 14, scale: 2 }).notNull(),
    porcentaje: numeric({ precision: 5, scale: 2 }),
    montoPropuesto: numeric({ precision: 14, scale: 2 }).notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    motivoDelAjuste: text(),
    fecha: date().notNull(),
    constanciaNumero: text(),
    constanciaFecha: date(),
    /** Nulo = nada que resolver; `pendiente` al anular el documento con la retención practicada. */
    resolucion: text().$type<'pendiente' | 'constancia_anulada' | 'rectificada' | 'no_requiere'>(),
    notaDeResolucion: text(),
    resueltaEn: timestamp({ withTimezone: true }),
    resueltaPor: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('retenciones_documento_regla_unico').on(t.documentoId, t.regla),
    foreignKey({
      name: 'retenciones_documento_fk',
      columns: [t.documentoId, t.empresaId],
      foreignColumns: [documentos.id, documentos.empresaId],
    }).onDelete('cascade'),
    ...restriccionesDeMontos(t),
    ...restriccionesDeFechas(t),
    ...restriccionesDeResolucion(t),
    politicaPorEmpresa(),
  ],
);
