import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn, type ExtraConfigColumn } from 'drizzle-orm/pg-core';
import { activos } from './activos.tablas.js';

type Columnas = Record<
  | 'empresaId'
  | 'activoId'
  | 'numero'
  | 'anioDeNumero'
  | 'clase'
  | 'descripcion'
  | 'vidaUtilRestanteContableMeses'
  | 'estado'
  | 'anuladaEn'
  | 'anuladaPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
> &
  Record<'fecha', ExtraConfigColumn>;

/** El activo es de la misma empresa que la mejora. */
export function llavesDeMejora(t: Columnas) {
  return [
    foreignKey({
      name: 'mejoras_activo_fk',
      columns: [t.activoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
  ];
}

/** El número es único por empresa y año; el índice busca las mejoras de un activo por fecha (§5.7). */
export function indicesDeMejora(t: Columnas) {
  return [
    uniqueIndex('mejoras_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    index('mejoras_activo_fecha_idx').on(t.activoId, t.fecha),
  ];
}

/** Los checks de §5.7 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeMejora(t: Columnas) {
  return [
    check('mejoras_clase', sql`${t.clase} in ('mejora', 'costo_posterior')`),
    check('mejoras_estado', sql`${t.estado} in ('vigente', 'anulada')`),
    check('mejoras_descripcion', sql`char_length(btrim(${t.descripcion})) between 1 and 300`),
    check(
      'mejoras_vida_restante',
      sql`${t.vidaUtilRestanteContableMeses} is null or (${t.clase} = 'mejora' and ${t.vidaUtilRestanteContableMeses} >= 1)`,
    ),
    check(
      'mejoras_anulacion_completa',
      sql`(${t.estado} = 'anulada') = (${t.anuladaEn} is not null and ${t.anuladaPor} is not null and ${t.motivoDeAnulacion} is not null)`,
    ),
  ];
}
