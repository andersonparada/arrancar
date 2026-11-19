import { sql } from 'drizzle-orm';
import { check, date, integer, numeric, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EstadoDeCierre } from '../../dominio/depreciacion/cierre-guardado.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

/**
 * Los meses de depreciación que alguna vez se cerraron (diseño §5.9): una fila por mes. Reabrir cambia el estado (y
 * sus cuotas quedan `vigente = false`); volver a cerrarlo la deja `cerrado` otra vez. Nunca se borra. Solo
 * `politicaPorEmpresa()`.
 */
export const cierres = esquemaActivosFijos.table(
  'cierres',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    periodo: date({ mode: 'string' }).notNull(),
    estado: text().$type<EstadoDeCierre>().notNull(),
    cerradoEn: timestamp({ withTimezone: true }).notNull(),
    cerradoPor: uuid().notNull(),
    reabiertoEn: timestamp({ withTimezone: true }),
    reabiertoPor: uuid(),
    motivoDeReapertura: text(),
    regimenIsr: text(),
    totalContable: numeric({ precision: 14, scale: 2 }).notNull(),
    totalFiscal: numeric({ precision: 14, scale: 2 }).notNull(),
    activosDepreciados: integer().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'cierres_pk', columns: [t.empresaId, t.periodo] }),
    check('cierres_primer_dia', sql`extract(day from ${t.periodo}) = 1`),
    check('cierres_estado', sql`${t.estado} in ('cerrado', 'reabierto')`),
    check(
      'cierres_reapertura_completa',
      sql`(${t.estado} = 'reabierto') = (${t.reabiertoEn} is not null and ${t.reabiertoPor} is not null and ${t.motivoDeReapertura} is not null)`,
    ),
    check(
      'cierres_motivo_acotado',
      sql`${t.motivoDeReapertura} is null or char_length(${t.motivoDeReapertura}) between 1 and 500`,
    ),
    check('cierres_montos', sql`${t.totalContable} >= 0 and ${t.totalFiscal} >= 0 and ${t.activosDepreciados} >= 0`),
    politicaPorEmpresa(),
  ],
);
