import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { tiposDeParcela } from './tipos-de-parcela.tablas.js';

type Columnas = Record<
  | 'id'
  | 'empresaId'
  | 'localidadId'
  | 'parcelaMadreId'
  | 'nivel'
  | 'tipoId'
  | 'codigo'
  | 'nombre'
  | 'formaDeTenencia'
  | 'superficieTotalM2'
  | 'superficieUtilM2'
  | 'latitud'
  | 'longitud'
  | 'colindanciaNorte'
  | 'colindanciaSur'
  | 'colindanciaOriente'
  | 'colindanciaPoniente'
  | 'activo'
  | 'observaciones',
  AnyPgColumn
>;

/** Las llaves compuestas con la empresa (nada cruza de empresa) y la de la madre con la localidad (misma localidad). */
export function llavesDeParcela(t: Columnas & { id: AnyPgColumn }) {
  return [
    foreignKey({
      name: 'parcelas_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    foreignKey({
      name: 'parcelas_tipo_fk',
      columns: [t.tipoId, t.empresaId],
      foreignColumns: [tiposDeParcela.id, tiposDeParcela.empresaId],
    }),
    foreignKey({
      name: 'parcelas_madre_fk',
      columns: [t.parcelaMadreId, t.empresaId, t.localidadId],
      foreignColumns: [t.id, t.empresaId, t.localidadId],
    }),
  ];
}

/** Únicos (el código en la empresa; el nombre en la localidad) e índices de cada llave. */
export function unicosEIndicesDeParcela(t: Columnas) {
  return [
    unique('parcelas_codigo_unico').on(t.empresaId, t.codigo),
    uniqueIndex('parcelas_nombre_unico').on(t.empresaId, t.localidadId, nombreNormalizado(t.nombre)),
    // Destinos de las llaves: todo lo que cuelga de una parcela, y la madre (misma localidad).
    unique('parcelas_id_empresa_unico').on(t.id, t.empresaId),
    unique('parcelas_id_empresa_localidad_unico').on(t.id, t.empresaId, t.localidadId),
    index('parcelas_localidad_idx').on(t.empresaId, t.localidadId, t.activo),
    index('parcelas_madre_idx')
      .on(t.parcelaMadreId)
      .where(sql`${t.parcelaMadreId} is not null`),
    index('parcelas_tipo_idx').on(t.tipoId),
  ];
}

const largoOpcional = (columna: AnyPgColumn, maximo: number) =>
  sql`${columna} is null or char_length(trim(${columna})) between 1 and ${sql.raw(String(maximo))}`;

/** Las reglas de forma; el dominio y Zod las repiten para dar mensajes claros. */
export function reglasDeParcela(t: Columnas) {
  return [...reglasDeLosDatos(t), ...reglasDeLaSuperficieYElPunto(t), ...reglasDeLosTextos(t)];
}

function reglasDeLosDatos(t: Columnas) {
  return [
    check('parcelas_codigo_valido', sql`${t.codigo} ~ '^[A-Z0-9-]{1,20}$'`),
    check('parcelas_nombre_valido', sql`char_length(trim(${t.nombre})) between 1 and 120`),
    check(
      'parcelas_tenencia_valida',
      sql`${t.formaDeTenencia} in ('propia', 'posesion', 'copropiedad', 'arrendada', 'usufructo', 'comodato', 'aparceria', 'otra')`,
    ),
    check('parcelas_nivel_valido', sql`${t.nivel} between 1 and 5`),
    check('parcelas_nivel_y_madre', sql`(${t.nivel} = 1) = (${t.parcelaMadreId} is null)`),
    check('parcelas_madre_distinta', sql`${t.parcelaMadreId} is null or ${t.parcelaMadreId} <> ${t.id}`),
  ];
}

function reglasDeLaSuperficieYElPunto(t: Columnas) {
  return [
    check('parcelas_superficie_completa', sql`(${t.superficieTotalM2} is null) = (${t.superficieUtilM2} is null)`),
    check(
      'parcelas_superficie_valida',
      sql`${t.superficieTotalM2} is null or (${t.superficieTotalM2} > 0 and ${t.superficieUtilM2} > 0 and ${t.superficieUtilM2} <= ${t.superficieTotalM2})`,
    ),
    check('parcelas_punto_completo', sql`(${t.latitud} is null) = (${t.longitud} is null)`),
    check(
      'parcelas_punto_valido',
      sql`${t.latitud} is null or (${t.latitud} between -90 and 90 and ${t.longitud} between -180 and 180)`,
    ),
  ];
}

function reglasDeLosTextos(t: Columnas) {
  return [
    check('parcelas_colindancia_norte_valida', largoOpcional(t.colindanciaNorte, 300)),
    check('parcelas_colindancia_sur_valida', largoOpcional(t.colindanciaSur, 300)),
    check('parcelas_colindancia_oriente_valida', largoOpcional(t.colindanciaOriente, 300)),
    check('parcelas_colindancia_poniente_valida', largoOpcional(t.colindanciaPoniente, 300)),
    check('parcelas_observaciones_validas', largoOpcional(t.observaciones, 500)),
  ];
}
