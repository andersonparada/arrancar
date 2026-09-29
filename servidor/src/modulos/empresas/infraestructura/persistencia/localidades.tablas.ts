import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { politicasDelRegistroConAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { municipios } from '../../../core/geografia/infraestructura/persistencia/geografia.tablas.js';
import { ALCANCE_DE_LOCALIDADES } from './alcance-de-localidades.js';
import { esquemaEmpresas } from './esquema.tablas.js';
import { tiposDeLocalidad } from './tipos-de-localidad.tablas.js';

type ColumnasConReglas = Record<
  | 'codigo'
  | 'nombre'
  | 'codigoEstablecimientoSat'
  | 'nombreComercialSat'
  | 'direccion'
  | 'departamentoCodigo'
  | 'municipioCodigo',
  AnyPgColumn
>;

/** Las reglas de forma de los datos; el dominio y Zod las repiten para dar mensajes claros. */
const restriccionesDeLosDatos = (t: ColumnasConReglas) => [
  check('localidades_codigo_valido', sql`${t.codigo} ~ '^[A-Z0-9-]{1,12}$'`),
  check('localidades_nombre_valido', sql`char_length(trim(${t.nombre})) between 1 and 120`),
  check('localidades_establecimiento_sat_positivo', sql`${t.codigoEstablecimientoSat} > 0`),
  check(
    'localidades_nombre_sat_valido',
    sql`${t.nombreComercialSat} is null or char_length(trim(${t.nombreComercialSat})) between 1 and 200`,
  ),
  check(
    'localidades_direccion_valida',
    sql`${t.direccion} is null or char_length(trim(${t.direccion})) between 1 and 300`,
  ),
  check('localidades_ubicacion_completa', sql`(${t.departamentoCodigo} is null) = (${t.municipioCodigo} is null)`),
  check(
    'localidades_nombre_sat_con_codigo',
    sql`${t.nombreComercialSat} is null or ${t.codigoEstablecimientoSat} is not null`,
  ),
];

/**
 * Las localidades de cada empresa. Además de la seguridad por empresa (RLS), cada usuario solo ve las que
 * tiene asignadas (`empresas.accesos_a_localidades`) o todas si tiene alcance total. Las llaves a otras tablas
 * del módulo son `no action`: una empresa con su configuración, sin movimientos, se puede eliminar.
 */
export const localidades = esquemaEmpresas.table(
  'localidades',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    tipoId: uuid().notNull(),
    codigo: text().notNull(),
    nombre: text().notNull(),
    codigoEstablecimientoSat: integer(),
    nombreComercialSat: text(),
    departamentoCodigo: char({ length: 2 }),
    municipioCodigo: char({ length: 2 }),
    direccion: text(),
    activo: boolean().default(true).notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'localidades_tipo_fk',
      columns: [t.tipoId, t.empresaId],
      foreignColumns: [tiposDeLocalidad.id, tiposDeLocalidad.empresaId],
    }),
    foreignKey({
      name: 'localidades_municipio_fk',
      columns: [t.departamentoCodigo, t.municipioCodigo],
      foreignColumns: [municipios.departamentoCodigo, municipios.codigo],
    }),
    unique('localidades_codigo_unico').on(t.empresaId, t.codigo),
    unique('localidades_nombre_unico').on(t.empresaId, t.nombre),
    // Destino de las llaves compuestas de los accesos y de lo que apunte a una localidad.
    unique('localidades_id_empresa_unico').on(t.id, t.empresaId),
    uniqueIndex('localidades_establecimiento_sat_unico')
      .on(t.empresaId, t.codigoEstablecimientoSat)
      .where(sql`${t.codigoEstablecimientoSat} is not null`),
    index('localidades_tipo_idx').on(t.tipoId),
    ...restriccionesDeLosDatos(t),
    politicaPorEmpresa(),
    ...politicasDelRegistroConAlcance(ALCANCE_DE_LOCALIDADES),
  ],
);
