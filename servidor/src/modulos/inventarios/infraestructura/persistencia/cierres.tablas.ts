import { sql } from 'drizzle-orm';
import { check, date, integer, numeric, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EstadoDeCierre } from '../../dominio/cierre/cierre-guardado.js';
import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';
import { esquemaInventarios } from './esquema.tablas.js';

/**
 * Los meses del inventario que alguna vez se cerraron (diseño §5.19): una fila por mes. Reabrir cambia el estado (y su
 * foto queda `vigente = false`); volver a cerrarlo la deja `cerrado` otra vez. Nunca se borra. Solo
 * `politicaPorEmpresa()`: quien cierra ve todas las bodegas, y la foto sí lleva el alcance por bodega.
 */
export const cierres = esquemaInventarios.table(
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
    /** El método de costeo que regía el último día del mes. */
    metodo: text().$type<MetodoDeCosteo>().notNull(),
    regimenIsr: text(),
    valorTotal: numeric({ precision: 14, scale: 2 }).notNull(),
    articulosConExistencia: integer().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ name: 'cierres_pk', columns: [t.empresaId, t.periodo] }),
    check('cierres_primer_dia', sql`extract(day from ${t.periodo}) = 1`),
    check('cierres_estado', sql`${t.estado} in ('cerrado', 'reabierto')`),
    check('cierres_metodo', sql`${t.metodo} in ('promedio_ponderado', 'peps')`),
    check(
      'cierres_reapertura_completa',
      sql`(${t.estado} = 'reabierto') = (${t.reabiertoEn} is not null and ${t.reabiertoPor} is not null and ${t.motivoDeReapertura} is not null)`,
    ),
    check(
      'cierres_motivo_acotado',
      sql`${t.motivoDeReapertura} is null or char_length(${t.motivoDeReapertura}) between 1 and 500`,
    ),
    check('cierres_montos', sql`${t.valorTotal} >= 0 and ${t.articulosConExistencia} >= 0`),
    politicaPorEmpresa(),
  ],
);
