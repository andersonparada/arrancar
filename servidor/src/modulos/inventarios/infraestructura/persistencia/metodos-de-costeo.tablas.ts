import { sql } from 'drizzle-orm';
import { check, date, index, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';
import { esquemaInventarios } from './esquema.tablas.js';

/**
 * El método de costeo de la empresa desde un mes (`docs/modulos/diseno-inventarios.md` §5.7). El de un día es la fila
 * de mayor `desde` que no pase de ese día. En un cambio, `desde` es el 1 de enero del año siguiente a la autorización
 * de la SAT (V-1): el check lo garantiza aunque se escriba sin pasar por el dominio.
 */
export const metodosDeCosteo = esquemaInventarios.table(
  'metodos_de_costeo',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    metodo: text().$type<MetodoDeCosteo>().notNull(),
    desde: date({ mode: 'string' }).notNull(),
    /** Cuándo lo usó el primer movimiento: desde ahí no se edita ni se elimina. */
    fijadoEn: timestamp({ withTimezone: true }),
    autorizacionSatNumero: text(),
    autorizacionSatFecha: date({ mode: 'string' }),
    motivo: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('metodos_de_costeo_id_empresa_unico').on(t.id, t.empresaId),
    unique('metodos_de_costeo_desde_unico').on(t.empresaId, t.desde),
    index('metodos_de_costeo_desde_idx').on(t.empresaId, t.desde.desc()),
    check('metodos_de_costeo_metodo', sql`${t.metodo} in ('promedio_ponderado', 'peps')`),
    check('metodos_de_costeo_primer_dia', sql`extract(day from ${t.desde}) = 1`),
    check(
      'metodos_de_costeo_desde_de_la_autorizacion',
      sql`${t.autorizacionSatFecha} is null or (${t.autorizacionSatFecha} < ${t.desde} and ${t.desde} = make_date(extract(year from ${t.autorizacionSatFecha})::int + 1, 1, 1))`,
    ),
    check(
      'metodos_de_costeo_autorizacion_completa',
      sql`(${t.autorizacionSatNumero} is null) = (${t.autorizacionSatFecha} is null)`,
    ),
    check(
      'metodos_de_costeo_autorizacion_largo',
      sql`${t.autorizacionSatNumero} is null or char_length(btrim(${t.autorizacionSatNumero})) between 1 and 60`,
    ),
    check(
      'metodos_de_costeo_motivo_largo',
      sql`${t.motivo} is null or char_length(btrim(${t.motivo})) between 1 and 500`,
    ),
    politicaPorEmpresa(),
  ],
);
