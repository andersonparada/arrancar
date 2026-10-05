import { sql } from 'drizzle-orm';
import { check, date, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { idPrimario } from '../../../base-datos/columnas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';

export const ORIGENES_DE_FERIADO = ['fijo', 'semana_santa', 'asueto_sat'] as const;

/**
 * Asuetos nacionales que carga soporte (los que declara la SAT o el gobierno). Es de toda la
 * instalación: sin empresa ni cuenta. Los feriados fijos y los de Semana Santa no se guardan,
 * se calculan (`dominio/feriados-calculados.ts`).
 */
export const feriados = esquemaCore.table(
  'feriados',
  {
    id: idPrimario(),
    fecha: date({ mode: 'string' }).notNull(),
    nombre: text().notNull(),
    origen: text({ enum: ORIGENES_DE_FERIADO }).notNull().default('asueto_sat'),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('feriados_fecha_unica').on(t.fecha),
    check('feriados_origen_valido', sql`${t.origen} in ('fijo', 'semana_santa', 'asueto_sat')`),
  ],
);
