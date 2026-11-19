import { sql } from 'drizzle-orm';
import { char, check, date, index, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { idPrimario, politicasDeSoloAgregarEnLaInstalacion } from '../../../base-datos/columnas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { monedas } from './monedas.tablas.js';

export const OPERACIONES_DEL_BANGUAT = [
  'TipoCambioDia',
  'TipoCambioRango',
  'TipoCambioRangoMoneda',
  'TipoCambioFechaInicialMoneda',
  'VariablesDisponibles',
] as const;
export const VUELTAS_DEL_BANGUAT = [
  'madrugada',
  'manana',
  'noche',
  'arranque',
  'relleno',
  'manual',
  'lista',
  'muestra',
] as const;
export const RESULTADOS_DE_CONSULTA = [
  'exito',
  'sin_datos',
  'error',
  'valor_fuera_de_rango',
  'valor_ambiguo',
  'variacion_excesiva',
  'sin_dolar_del_dia',
  'convencion_dudosa',
  'sin_convencion',
] as const;

const enLista = (columna: unknown, valores: readonly string[]) =>
  sql`${columna} in (${sql.raw(valores.map((valor) => `'${valor}'`).join(', '))})`;

/**
 * Bitácora de la carga de tipos de cambio: una fila por llamada al Banguat. De toda la instalación; solo se agrega
 * (RLS) y no se depura. Se inserta al terminar la llamada, con las dos horas.
 */
export const consultasAlBanguat = esquemaCore.table(
  'consultas_al_banguat',
  {
    id: idPrimario(),
    iniciadaEn: timestamp({ withTimezone: true }).notNull(),
    terminadaEn: timestamp({ withTimezone: true }).notNull(),
    operacion: text({ enum: OPERACIONES_DEL_BANGUAT }).notNull(),
    vuelta: text({ enum: VUELTAS_DEL_BANGUAT }).notNull(),
    moneda: char({ length: 3 }).references(() => monedas.codigo),
    codigoBanguat: smallint(),
    desde: date({ mode: 'string' }),
    hasta: date({ mode: 'string' }),
    resultado: text({ enum: RESULTADOS_DE_CONSULTA }).notNull(),
    filasNuevas: smallint().notNull().default(0),
    filasRechazadas: smallint().notNull().default(0),
    detalle: text(),
    disparadaPor: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('consultas_al_banguat_fecha_idx').on(t.iniciadaEn.desc()),
    index('consultas_al_banguat_moneda_idx').on(t.moneda, t.iniciadaEn.desc()),
    index('consultas_al_banguat_usuario_idx').on(t.disparadaPor),
    check('consultas_al_banguat_operacion_valida', enLista(t.operacion, OPERACIONES_DEL_BANGUAT)),
    check('consultas_al_banguat_vuelta_valida', enLista(t.vuelta, VUELTAS_DEL_BANGUAT)),
    check('consultas_al_banguat_resultado_valido', enLista(t.resultado, RESULTADOS_DE_CONSULTA)),
    check('consultas_al_banguat_detalle_corto', sql`${t.detalle} is null or char_length(${t.detalle}) <= 500`),
    ...politicasDeSoloAgregarEnLaInstalacion(),
  ],
);
