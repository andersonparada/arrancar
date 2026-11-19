import { sql } from 'drizzle-orm';
import { boolean, check, index, numeric, smallint, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { INCISOS_FISCALES, type IncisoFiscal } from '../../dominio/incisos-fiscales.js';
import { esquemaActivosFijos } from './esquema.tablas.js';

const incisosEnSql = sql.raw(INCISOS_FISCALES.map((inciso) => `'${inciso}'`).join(', '));

/** Las clases de activos de cada empresa; la seguridad por empresa (RLS) oculta las de otras. */
export const clases = esquemaActivosFijos.table(
  'clases',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    incisoFiscal: text().$type<IncisoFiscal>().notNull(),
    porcentajeFiscal: numeric({ precision: 5, scale: 2 }).notNull(),
    vidaUtilContableMeses: smallint(),
    valorResidualPorcentaje: numeric({ precision: 5, scale: 2 }).default('0').notNull(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('clases_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    unique('clases_id_empresa_unico').on(t.id, t.empresaId),
    index('clases_empresa_activo_idx').on(t.empresaId, t.activo),
    check('clases_nombre_largo', sql`char_length(btrim(${t.nombre})) between 1 and 80`),
    check('clases_inciso_fiscal', sql`${t.incisoFiscal} in (${incisosEnSql})`),
    check('clases_porcentaje_fiscal', sql`${t.porcentajeFiscal} between 0 and 100`),
    check('clases_terrenos_sin_porcentaje', sql`(${t.incisoFiscal} = 'terrenos') = (${t.porcentajeFiscal} = 0)`),
    check('clases_vida_util', sql`${t.vidaUtilContableMeses} between 1 and 1200`),
    check('clases_terrenos_sin_vida_util', sql`${t.incisoFiscal} <> 'terrenos' or ${t.vidaUtilContableMeses} is null`),
    check('clases_valor_residual', sql`${t.valorResidualPorcentaje} between 0 and 99.99`),
    politicaPorEmpresa(),
  ],
);
