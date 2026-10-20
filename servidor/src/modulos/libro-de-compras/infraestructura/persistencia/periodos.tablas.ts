import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  date,
  foreignKey,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  autoria,
  idPrimario,
  marcasDeTiempo,
  politicaPorEmpresa,
  politicasDeSoloAgregarPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EventoDeDeclaracion, FormularioDeDeclaracion } from '../../dominio/periodos/reglas-de-declaracion.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/**
 * Un mes del libro que alguna vez se declaró (o que se bloqueó para registrar mientras el control estaba encendido).
 * Sin fila, el período está abierto. Nunca se borra: reabrir solo cambia el estado.
 */
export const periodos = esquemaLibroDeCompras.table(
  'periodos',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    periodo: date().notNull(),
    estado: text().$type<'abierto' | 'declarado'>().notNull().default('abierto'),
    declaradoEn: timestamp({ withTimezone: true }),
    declaradoPor: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.periodo] }),
    check('periodos_primer_dia_del_mes', sql`${t.periodo} = date_trunc('month', ${t.periodo})::date`),
    check('periodos_estado_valido', sql`${t.estado} in ('abierto', 'declarado')`),
    check(
      'periodos_declarado_completo',
      sql`(${t.estado} = 'declarado') = (${t.declaradoEn} is not null and ${t.declaradoPor} is not null)`,
    ),
    politicaPorEmpresa(),
  ],
);

type ColumnasDeDeclaracion = Record<
  'evento' | 'formulario' | 'numeroDeFormulario' | 'tipoDeLibro' | 'foto' | 'diferencia' | 'motivo',
  AnyPgColumn
>;

/** Valores permitidos de cada dato: evento, formulario, número, tipo de libro, motivo y tamaño de la foto. */
const restriccionesDeLosDatos = (t: ColumnasDeDeclaracion) => [
  check('declaraciones_de_periodos_evento_valido', sql`${t.evento} in ('declaracion', 'reapertura', 'rectificacion')`),
  check(
    'declaraciones_de_periodos_formulario_valido',
    sql`${t.formulario} is null or ${t.formulario} in ('SAT-2237', 'SAT-2046', 'sin_formulario')`,
  ),
  check(
    'declaraciones_de_periodos_numero_valido',
    sql`${t.numeroDeFormulario} is null or (${t.numeroDeFormulario} ~ '^[A-Za-z0-9]{1,40}$' and ${t.formulario} <> 'sin_formulario')`,
  ),
  check(
    'declaraciones_de_periodos_tipo_valido',
    sql`${t.tipoDeLibro} is null or ${t.tipoDeLibro} in ('completo', 'simplificado')`,
  ),
  check(
    'declaraciones_de_periodos_motivo_valido',
    sql`${t.motivo} is null or char_length(${t.motivo}) between 1 and 500`,
  ),
  check('declaraciones_de_periodos_foto_acotada', sql`pg_column_size(${t.foto}) <= 1048576`),
];

/** Cada evento lleva lo suyo: la declaración su formulario y su foto, la reapertura su motivo, la rectificación su diferencia. */
const restriccionesDeCadaEvento = (t: ColumnasDeDeclaracion) => [
  check(
    'declaraciones_de_periodos_declaracion_completa',
    sql`${t.evento} = 'reapertura' or (${t.formulario} is not null and ${t.tipoDeLibro} is not null and ${t.foto} is not null)`,
  ),
  check(
    'declaraciones_de_periodos_reapertura_con_motivo',
    sql`${t.evento} <> 'reapertura' or (${t.motivo} is not null and ${t.foto} is null and ${t.formulario} is null)`,
  ),
  check(
    'declaraciones_de_periodos_diferencia_solo_en_rectificacion',
    sql`(${t.evento} = 'rectificacion') = (${t.diferencia} is not null)`,
  ),
];

/**
 * Cada declaración, reapertura y rectificación de un período, en su fila: solo se agrega y se lee. La foto guarda los
 * totales del libro al declarar y la diferencia dice qué cambió contra la declaración anterior.
 */
export const declaracionesDePeriodos = esquemaLibroDeCompras.table(
  'declaraciones_de_periodos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    periodo: date().notNull(),
    secuencia: smallint().notNull(),
    evento: text().$type<EventoDeDeclaracion>().notNull(),
    formulario: text().$type<FormularioDeDeclaracion>(),
    numeroDeFormulario: text(),
    fechaDePresentacion: date(),
    tipoDeLibro: text().$type<'completo' | 'simplificado'>(),
    foto: jsonb(),
    diferencia: jsonb(),
    motivo: text(),
    creadoEn: marcasDeTiempo.creadoEn,
    creadoPor: autoria.creadoPor,
  },
  (t) => [
    unique('declaraciones_de_periodos_secuencia_unica').on(t.empresaId, t.periodo, t.secuencia),
    foreignKey({
      name: 'declaraciones_de_periodos_periodo_fk',
      columns: [t.empresaId, t.periodo],
      foreignColumns: [periodos.empresaId, periodos.periodo],
    }),
    ...restriccionesDeLosDatos(t),
    ...restriccionesDeCadaEvento(t),
    ...politicasDeSoloAgregarPorEmpresa(),
  ],
);
