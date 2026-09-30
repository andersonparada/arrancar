import { sql } from 'drizzle-orm';
import { check, date, foreignKey, numeric, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { combustibles } from './combustibles.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/**
 * Las vigencias de la tasa de IDP de cada combustible; la seguridad por empresa (RLS) oculta las de otras. Que
 * dos vigencias del mismo combustible no se traslapen lo garantiza una restricción de exclusión
 * (`vigencias_de_combustible_sin_traslape`) que crea la migración `0004_l2_vigencias_sin_traslape`.
 */
export const vigenciasDeCombustible = esquemaLibroDeCompras.table(
  'vigencias_de_combustible',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    combustibleId: uuid().notNull(),
    idpPorGalon: numeric({ precision: 8, scale: 2 }).notNull(),
    porcentajeDeEtanol: numeric({ precision: 5, scale: 2 }).notNull().default('0'),
    vigenteDesde: date().notNull(),
    vigenteHasta: date(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'vigencias_de_combustible_combustible_fk',
      columns: [t.combustibleId, t.empresaId],
      foreignColumns: [combustibles.id, combustibles.empresaId],
    }),
    unique('vigencias_de_combustible_id_empresa_unico').on(t.id, t.empresaId),
    check('vigencias_de_combustible_idp_no_negativo', sql`${t.idpPorGalon} >= 0`),
    check('vigencias_de_combustible_etanol_valido', sql`${t.porcentajeDeEtanol} between 0 and 100`),
    check(
      'vigencias_de_combustible_fechas_ordenadas',
      sql`${t.vigenteHasta} is null or ${t.vigenteHasta} >= ${t.vigenteDesde}`,
    ),
    politicaPorEmpresa(),
  ],
);
