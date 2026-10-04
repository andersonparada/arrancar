import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, numeric, text, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

const REGLAS =
  "'iva_exportador_agropecuario', 'iva_exportador', 'iva_contribuyente_especial', 'iva_otro_agente', " +
  "'iva_sector_publico', 'iva_pequeno_contribuyente', 'isr_opcional_simplificado'";

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
  | 'constanciaFecha',
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
  check('retenciones_monto_propuesto_no_negativo', sql`${t.montoPropuesto} >= 0`),
  check('retenciones_monto_rango', sql`${t.monto} between 0 and ${t.base}`),
  check('retenciones_motivo_del_ajuste', sql`${t.monto} = ${t.montoPropuesto} or ${t.motivoDelAjuste} is not null`),
];

/** La fecha de la retención y su constancia. */
const restriccionesDeFechas = (t: Columnas) => [
  check('retenciones_fecha_obligatoria', sql`${t.regla} = 'iva_pequeno_contribuyente' or ${t.fecha} is not null`),
  check('retenciones_constancia_completa', sql`(${t.constanciaNumero} is null) = (${t.constanciaFecha} is null)`),
  index('retenciones_mes_idx').on(t.empresaId, t.fecha),
  index('retenciones_por_fechar_idx')
    .on(t.empresaId)
    .where(sql`${t.fecha} is null`),
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
    fecha: date(),
    constanciaNumero: text(),
    constanciaFecha: date(),
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
    politicaPorEmpresa(),
  ],
);
