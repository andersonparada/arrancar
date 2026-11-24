import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  unique,
  uniqueIndex,
  type AnyPgColumn,
  type ExtraConfigColumn,
} from 'drizzle-orm/pg-core';
import { parcelas } from './parcelas.tablas.js';

type Columnas = Record<
  | 'id'
  | 'empresaId'
  | 'parcelaId'
  | 'fuente'
  | 'superficieTotalM2'
  | 'superficieUtilM2'
  | 'cantidadOriginal'
  | 'unidadOriginal'
  | 'varasPorLadoDeCuerda'
  | 'documento'
  | 'archivoId'
  | 'estado'
  | 'anuladaEn'
  | 'anuladaPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
> & { vigenteDesde: ExtraConfigColumn };

/** La llave compuesta con la empresa, los únicos y los índices: una medición vigente por fecha y un archivo por medición. */
export function llavesEIndicesDeMedicion(t: Columnas) {
  return [
    unique('mediciones_id_empresa_unico').on(t.id, t.empresaId),
    foreignKey({
      name: 'mediciones_parcela_fk',
      columns: [t.parcelaId, t.empresaId],
      foreignColumns: [parcelas.id, parcelas.empresaId],
    }),
    uniqueIndex('mediciones_fecha_unica')
      .on(t.parcelaId, t.vigenteDesde)
      .where(sql`${t.estado} = 'vigente'`),
    uniqueIndex('mediciones_archivo_unico')
      .on(t.archivoId)
      .where(sql`${t.archivoId} is not null`),
    index('mediciones_parcela_idx')
      .on(t.parcelaId, t.vigenteDesde.desc())
      .where(sql`${t.estado} = 'vigente'`),
  ];
}

/** Las reglas de forma; el dominio y Zod las repiten para dar mensajes claros. */
export function reglasDeMedicion(t: Columnas) {
  return [...reglasDeLaSuperficie(t), ...reglasDeLosTextosYLaAnulacion(t)];
}

function reglasDeLaSuperficie(t: Columnas) {
  return [
    check(
      'mediciones_fuente_valida',
      sql`${t.fuente} in ('escritura', 'plano_topografico', 'gps', 'estimacion', 'otra')`,
    ),
    check(
      'mediciones_superficie_valida',
      sql`${t.superficieTotalM2} > 0 and ${t.superficieUtilM2} > 0 and ${t.superficieUtilM2} <= ${t.superficieTotalM2}`,
    ),
    check('mediciones_cantidad_positiva', sql`${t.cantidadOriginal} > 0`),
    check(
      'mediciones_unidad_valida',
      sql`${t.unidadOriginal} in ('m2', 'hectarea', 'manzana', 'cuerda', 'vara_cuadrada', 'caballeria')`,
    ),
    check(
      'mediciones_varas_validas',
      sql`(${t.unidadOriginal} = 'cuerda') = (${t.varasPorLadoDeCuerda} is not null) and (${t.varasPorLadoDeCuerda} is null or ${t.varasPorLadoDeCuerda} between 1 and 100)`,
    ),
  ];
}

function reglasDeLosTextosYLaAnulacion(t: Columnas) {
  return [
    check(
      'mediciones_documento_valido',
      sql`${t.documento} is null or char_length(trim(${t.documento})) between 1 and 150`,
    ),
    check('mediciones_estado_valido', sql`${t.estado} in ('vigente', 'anulada')`),
    check(
      'mediciones_anulacion_completa',
      sql`(${t.estado} = 'anulada') = (${t.anuladaEn} is not null and ${t.anuladaPor} is not null and ${t.motivoDeAnulacion} is not null)`,
    ),
    check(
      'mediciones_motivo_valido',
      sql`${t.motivoDeAnulacion} is null or char_length(trim(${t.motivoDeAnulacion})) between 1 and 300`,
    ),
  ];
}
