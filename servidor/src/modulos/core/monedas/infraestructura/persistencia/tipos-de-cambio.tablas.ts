import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  char,
  check,
  date,
  type ExtraConfigColumn,
  index,
  numeric,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { idPrimario, politicasDeSoloAgregarEnLaInstalacion } from '../../../base-datos/columnas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { consultasAlBanguat } from './consultas-al-banguat.tablas.js';
import { monedas } from './monedas.tablas.js';
import { CONVENCIONES_DEL_BANGUAT, monedasDelBanguat } from './monedas-del-banguat.tablas.js';

export const ORIGENES_DE_TIPO_DE_CAMBIO = ['banguat', 'manual'] as const;

const tipo = () => numeric({ precision: 16, scale: 8 });

const columnas = {
  id: idPrimario(),
  moneda: char({ length: 3 })
    .notNull()
    .references(() => monedas.codigo),
  fecha: date({ mode: 'string' }).notNull(),
  referencia: tipo().notNull(),
  compra: tipo(),
  venta: tipo(),
  convencion: text({ enum: CONVENCIONES_DEL_BANGUAT }),
  dolarUsadoId: uuid().references((): AnyPgColumn => tiposDeCambio.id, { onDelete: 'restrict' }),
  origen: text({ enum: ORIGENES_DE_TIPO_DE_CAMBIO }).notNull(),
  codigoBanguat: smallint().references(() => monedasDelBanguat.codigo),
  consultaId: uuid().references(() => consultasAlBanguat.id),
  motivo: text(),
  registradoPor: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
  registradoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

type Columnas = Record<keyof typeof columnas, ExtraConfigColumn>;

function restriccionesDeValores(t: Columnas) {
  return [
    check('tipos_de_cambio_no_gtq', sql`${t.moneda} <> 'GTQ'`),
    check('tipos_de_cambio_referencia_positiva', sql`${t.referencia} > 0`),
    check(
      'tipos_de_cambio_compra_venta_positivas',
      sql`(${t.compra} is null or ${t.compra} > 0) and (${t.venta} is null or ${t.venta} > 0)`,
    ),
  ];
}

function restriccionesDeOrigen(t: Columnas) {
  return [
    check('tipos_de_cambio_origen_valido', sql`${t.origen} in ('banguat', 'manual')`),
    check(
      'tipos_de_cambio_manual_completo',
      sql`${t.origen} <> 'manual' or (${t.motivo} is not null and ${t.registradoPor} is not null)`,
    ),
    check(
      'tipos_de_cambio_motivo_valido',
      sql`${t.motivo} is null or (char_length(${t.motivo}) between 1 and 300 and ${t.motivo} = btrim(${t.motivo}))`,
    ),
    check('tipos_de_cambio_banguat_con_consulta', sql`${t.origen} <> 'banguat' or ${t.consultaId} is not null`),
    check('tipos_de_cambio_banguat_con_codigo', sql`${t.origen} <> 'banguat' or ${t.codigoBanguat} is not null`),
  ];
}

const CRUCES = "('usd_por_unidad', 'unidades_por_usd')";

function restriccionesDeCruce(t: Columnas) {
  return [
    check(
      'tipos_de_cambio_convencion_valida',
      sql`${t.convencion} is null or ${t.convencion} in ('quetzales_por_unidad', 'usd_por_unidad', 'unidades_por_usd')`,
    ),
    check('tipos_de_cambio_banguat_con_convencion', sql`${t.origen} <> 'banguat' or ${t.convencion} is not null`),
    check(
      'tipos_de_cambio_cruce_con_dolar',
      sql`(coalesce(${t.convencion}, '') in ${sql.raw(CRUCES)}) = (${t.dolarUsadoId} is not null)`,
    ),
    check(
      'tipos_de_cambio_cruce_con_compra_y_venta',
      sql`coalesce(${t.convencion}, '') not in ${sql.raw(CRUCES)} or (${t.compra} is not null and ${t.venta} is not null and ${t.venta} >= ${t.compra})`,
    ),
  ];
}

/**
 * Tipos de cambio de referencia: quetzales por una unidad de la moneda, del día en que rigen. De toda la instalación.
 * `compra` y `venta` son lo publicado por el Banguat en su `convencion`; en las demás monedas distintas del dólar,
 * `referencia` sale del promedio de ambos y del dólar del mismo día (`dolar_usado_id`).
 * Solo crece: corregir un tipo es agregar otra versión de la misma moneda y fecha (la vigente es la última por
 * `registrado_en`). La tabla es su propio rastro: guarda quién, cuándo y por qué.
 */
export const tiposDeCambio = esquemaCore.table('tipos_de_cambio', columnas, (t) => [
  index('tipos_de_cambio_vigente_idx').on(t.moneda, t.fecha.desc(), t.registradoEn.desc()),
  uniqueIndex('tipos_de_cambio_banguat_unico')
    .on(t.moneda, t.fecha)
    .where(sql`${t.origen} = 'banguat'`),
  index('tipos_de_cambio_consulta_idx').on(t.consultaId),
  index('tipos_de_cambio_codigo_banguat_idx').on(t.codigoBanguat),
  index('tipos_de_cambio_usuario_idx').on(t.registradoPor),
  index('tipos_de_cambio_dolar_usado_idx').on(t.dolarUsadoId),
  ...restriccionesDeValores(t),
  ...restriccionesDeOrigen(t),
  ...restriccionesDeCruce(t),
  ...politicasDeSoloAgregarEnLaInstalacion(),
]);
