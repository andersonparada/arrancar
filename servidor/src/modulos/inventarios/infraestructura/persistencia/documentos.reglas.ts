import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  CAUSAS_DE_ENTRADA,
  CLASES_DE_DOCUMENTO,
  CLASES_DEL_LIBRO,
  DESTINOS_DE_SALIDA,
} from '../../dominio/documento.js';

type Columnas = Record<
  | 'clase'
  | 'numero'
  | 'bodegaId'
  | 'documentoDeCompraId'
  | 'documentoRelacionadoId'
  | 'bodegaDeDestinoId'
  | 'estadoDeTraslado'
  | 'causa'
  | 'destino'
  | 'conceptoDeGastoId'
  | 'activoFijoId'
  | 'entregadoA'
  | 'soporte'
  | 'observaciones'
  | 'estado'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

const enSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

const largo = (columna: AnyPgColumn, maximo: number) =>
  sql`${columna} is null or char_length(btrim(${columna})) between 1 and ${sql.raw(String(maximo))}`;

/** Los checks de §5.9 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeDocumento(t: Columnas) {
  return [
    check('documentos_clase_valida', sql`${t.clase} in (${enSql(CLASES_DE_DOCUMENTO)})`),
    check('documentos_numero_positivo', sql`${t.numero} > 0`),
    check('documentos_estado', sql`${t.estado} in ('vigente', 'anulado')`),
    check('documentos_causa_segun_clase', sql`(${t.clase} = 'entrada_manual') = (${t.causa} is not null)`),
    check('documentos_causa_valida', sql`${t.causa} is null or ${t.causa} in (${enSql(CAUSAS_DE_ENTRADA)})`),
    check('documentos_destino_segun_clase', sql`(${t.clase} = 'salida_por_consumo') = (${t.destino} is not null)`),
    check('documentos_destino_valido', sql`${t.destino} is null or ${t.destino} in (${enSql(DESTINOS_DE_SALIDA)})`),
    check(
      'documentos_concepto_segun_destino',
      sql`coalesce(${t.destino} in ('gasto', 'mantenimiento_de_activo_fijo'), false) = (${t.conceptoDeGastoId} is not null)`,
    ),
    check(
      'documentos_activo_fijo_segun_destino',
      sql`coalesce(${t.destino} in ('obra_de_activo_fijo', 'mantenimiento_de_activo_fijo'), false) = (${t.activoFijoId} is not null)`,
    ),
  ];
}

/** Lo propio de las dos mitades de un traslado (§5.9): destino y estado solo en la salida; la entrada, ligada a ella. */
export function reglasDeTraslado(t: Columnas) {
  return [
    check(
      'documentos_traslado_destino_segun_clase',
      sql`(${t.clase} = 'salida_de_traslado') = (${t.bodegaDeDestinoId} is not null)`,
    ),
    check(
      'documentos_traslado_estado_segun_clase',
      sql`(${t.clase} = 'salida_de_traslado') = (${t.estadoDeTraslado} is not null)`,
    ),
    check(
      'documentos_traslado_estado_valido',
      sql`${t.estadoDeTraslado} is null or ${t.estadoDeTraslado} in ('en_transito', 'recibido')`,
    ),
    check(
      'documentos_traslado_a_otra_bodega',
      sql`${t.bodegaDeDestinoId} is null or ${t.bodegaDeDestinoId} <> ${t.bodegaId}`,
    ),
    check(
      'documentos_recepcion_ligada',
      sql`${t.clase} <> 'entrada_de_traslado' or ${t.documentoRelacionadoId} is not null`,
    ),
  ];
}

/** Soporte, textos y anulación. */
export function reglasDeTextoYAnulacion(t: Columnas) {
  return [
    check('documentos_soporte_de_entrada', sql`${t.clase} <> 'entrada_manual' or ${t.soporte} is not null`),
    check('documentos_bodega_segun_clase', sql`(${t.clase} = 'rebaja_de_costo') = (${t.bodegaId} is null)`),
    check(
      'documentos_compra_segun_clase',
      sql`(${t.clase} in (${enSql(CLASES_DEL_LIBRO)})) = (${t.documentoDeCompraId} is not null)`,
    ),
    check('documentos_soporte_largo', sql`${largo(t.soporte, 150)}`),
    check('documentos_entregado_a_largo', sql`${largo(t.entregadoA, 150)}`),
    check('documentos_observaciones_largo', sql`${largo(t.observaciones, 500)}`),
    check(
      'documentos_anulacion_completa',
      sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null)`,
    ),
    check('documentos_motivo_largo', sql`${largo(t.motivoDeAnulacion, 300)}`),
  ];
}
