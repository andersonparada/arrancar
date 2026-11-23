import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
  type PgColumn,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { monedas } from '../../../core/monedas/infraestructura/persistencia/monedas.tablas.js';
import {
  CLASES_DE_FLUJO,
  NATURALEZAS,
  TIPOS_DE_CUENTA,
  TRATAMIENTOS_FISCALES,
  type ClaseDeFlujo,
  type Naturaleza,
  type TratamientoFiscal,
} from '../../dominio/clasificaciones-de-cuenta.js';
import { RUBROS, type Rubro, type TipoDeCuenta } from '../../dominio/rubros.js';
import { esquemaContabilidad } from './esquema.tablas.js';

const enSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));
const SIN_PADRE = sql`'00000000-0000-0000-0000-000000000000'::uuid`;

const columnasDeCuentas = {
  id: idPrimario(),
  empresaId: uuid()
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  codigo: text().notNull(),
  nombre: text().notNull(),
  padreId: uuid(),
  nivel: smallint().notNull(),
  esDeDetalle: boolean().default(false).notNull(),
  naturaleza: text().$type<Naturaleza>().notNull(),
  tipo: text().$type<TipoDeCuenta>().notNull(),
  rubro: text().$type<Rubro>(),
  corriente: boolean().default(false).notNull(),
  claseDeFlujo: text().$type<ClaseDeFlujo>(),
  esMonetaria: boolean().default(false).notNull(),
  monedaCodigo: char({ length: 3 }).references(() => monedas.codigo),
  pideTercero: boolean().default(false).notNull(),
  pideCentroDeCosto: boolean().default(false).notNull(),
  esDeControl: boolean().default(false).notNull(),
  tratamientoFiscal: text().$type<TratamientoFiscal>().default('no_aplica').notNull(),
  activo: boolean().default(true).notNull(),
  ...marcasDeTiempo,
  ...autoria,
};

type Columnas = Record<keyof typeof columnasDeCuentas, PgColumn>;

/** Únicos, árbol (llave compuesta con la empresa) e índices de búsqueda. */
const unicosYArbol = (t: Columnas) => [
  unique('cuentas_codigo_unico').on(t.empresaId, t.codigo),
  unique('cuentas_id_empresa_unico').on(t.id, t.empresaId),
  uniqueIndex('cuentas_nombre_unico').on(
    t.empresaId,
    sql`coalesce(${t.padreId}, ${SIN_PADRE})`,
    nombreNormalizado(t.nombre),
  ),
  foreignKey({ name: 'cuentas_padre_fk', columns: [t.padreId, t.empresaId], foreignColumns: [t.id, t.empresaId] }),
  index('cuentas_padre_idx').on(t.empresaId, t.padreId),
  index('cuentas_codigo_prefijo_idx').on(t.empresaId, sql`${t.codigo} text_pattern_ops`),
  check('cuentas_padre_distinto', sql`${t.padreId} is null or ${t.padreId} <> ${t.id}`),
  check('cuentas_nivel_valido', sql`${t.nivel} between 1 and 6`),
  check('cuentas_nivel_sin_padre', sql`(${t.nivel} = 1) = (${t.padreId} is null)`),
  check('cuentas_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 150`),
];

/** Las listas cerradas: lo que el dominio valida, la base lo garantiza. */
const listasCerradas = (t: Columnas) => [
  check('cuentas_naturaleza_valida', sql`${t.naturaleza} in (${enSql(NATURALEZAS)})`),
  check('cuentas_tipo_valido', sql`${t.tipo} in (${enSql(TIPOS_DE_CUENTA)})`),
  check('cuentas_rubro_valido', sql`${t.rubro} is null or ${t.rubro} in (${enSql(RUBROS)})`),
  check(
    'cuentas_clase_de_flujo_valida',
    sql`${t.claseDeFlujo} is null or ${t.claseDeFlujo} in (${enSql(CLASES_DE_FLUJO)})`,
  ),
  check('cuentas_tratamiento_fiscal_valido', sql`${t.tratamientoFiscal} in (${enSql(TRATAMIENTOS_FISCALES)})`),
];

/** Lo que une unos datos con otros. */
const coherencia = (t: Columnas) => [
  check(
    'cuentas_tratamiento_solo_en_resultados',
    sql`${t.tipo} = 'resultados' or ${t.tratamientoFiscal} = 'no_aplica'`,
  ),
  check('cuentas_detalle_con_rubro', sql`not ${t.esDeDetalle} or ${t.rubro} is not null`),
];

/**
 * La nomenclatura de cada empresa (`docs/modulos/diseno-contabilidad.md` §5.2). El árbol se arma con `padre_id` (llave
 * compuesta con la empresa); `cuentas_hoja_de_detalle` impide que una cuenta de detalle tenga cuentas inferiores.
 */
export const cuentas = esquemaContabilidad.table('cuentas', columnasDeCuentas, (t) => [
  ...unicosYArbol(t),
  ...listasCerradas(t),
  ...coherencia(t),
  politicaPorEmpresa(),
]);
