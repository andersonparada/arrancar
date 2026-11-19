import { sql } from 'drizzle-orm';
import { boolean, check, index, numeric, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { MAGNITUDES, MAGNITUDES_CON_FACTOR, type Magnitud } from '../../dominio/magnitudes.js';
import { esquemaInventarios } from './esquema.tablas.js';

const enSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

/** Las unidades de medida de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const unidades = esquemaInventarios.table(
  'unidades',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    simbolo: text().notNull(),
    magnitud: text().$type<Magnitud>().notNull(),
    factorALaReferencia: numeric({ precision: 18, scale: 8 }),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('unidades_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    uniqueIndex('unidades_simbolo_unico').on(t.empresaId, sql`upper(${t.simbolo})`),
    unique('unidades_id_empresa_unico').on(t.id, t.empresaId),
    index('unidades_empresa_activo_idx').on(t.empresaId, t.activo),
    check('unidades_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 40`),
    check('unidades_simbolo_largo', sql`char_length(btrim(${t.simbolo})) between 1 and 10`),
    check('unidades_magnitud', sql`${t.magnitud} in (${enSql(MAGNITUDES)})`),
    check('unidades_factor_positivo', sql`${t.factorALaReferencia} > 0`),
    check(
      'unidades_factor_segun_magnitud',
      sql`(${t.magnitud} in (${enSql(MAGNITUDES_CON_FACTOR)})) = (${t.factorALaReferencia} is not null)`,
    ),
    politicaPorEmpresa(),
  ],
);
