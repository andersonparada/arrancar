import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { textoRecortado } from '../../../core/base-datos/restricciones.js';

export type SituacionDelDocumento = 'por_resolver' | 'en_disputa' | 'resuelto';
export type SalidaDelDocumento = 'reemplazo' | 'devolucion' | 'cobro' | 'sin_recuperacion';
export type DestinoDeLaSalida = 'proveedor' | 'custodio';

/** Las columnas de `comprobantes` que usan estos checks. */
type T = Record<
  | 'motivoDocumentoAnulado'
  | 'situacionDelDocumento'
  | 'salidaDelDocumento'
  | 'documentoAnuladoId'
  | 'motivoDeLaResolucion'
  | 'montoDeLaSalida'
  | 'destinoDeLaSalida'
  | 'motivoDeLaDisputa'
  | 'pruebaDePago'
  | 'disputaHasta'
  | 'documentoDeCompraId',
  AnyPgColumn
>;

/** La situación existe solo con el motivo de la anulación; «resuelto» trae su salida y su motivo. */
const restriccionesDeLaSituacion = (t: T) => [
  check(
    'comprobantes_situacion_del_documento_valida',
    sql`${t.situacionDelDocumento} in ('por_resolver', 'en_disputa', 'resuelto')`,
  ),
  check(
    'comprobantes_situacion_con_documento_anulado',
    sql`(${t.motivoDocumentoAnulado} is null) = (${t.situacionDelDocumento} is null)`,
  ),
  check(
    'comprobantes_salida_valida',
    sql`${t.salidaDelDocumento} in ('reemplazo', 'devolucion', 'cobro', 'sin_recuperacion')`,
  ),
  check(
    'comprobantes_salida_solo_resuelto',
    sql`coalesce(${t.situacionDelDocumento} = 'resuelto', false) = (${t.salidaDelDocumento} is not null)`,
  ),
  check(
    'comprobantes_resolucion_con_motivo',
    sql`coalesce(${t.situacionDelDocumento} = 'resuelto', false) = (${t.motivoDeLaResolucion} is not null)`,
  ),
  check('comprobantes_motivo_de_la_resolucion_rango', textoRecortado(t.motivoDeLaResolucion, 300)),
];

/** El reemplazo guarda la factura anulada; la devolución y el cobro, su monto y su destino. */
const restriccionesDeLaSalida = (t: T) => [
  check(
    'comprobantes_reemplazo_con_anulado',
    sql`coalesce(${t.salidaDelDocumento} = 'reemplazo', false) = (${t.documentoAnuladoId} is not null)`,
  ),
  check(
    'comprobantes_monto_y_destino_de_la_salida',
    sql`coalesce(${t.salidaDelDocumento} in ('devolucion', 'cobro'), false) = (${t.montoDeLaSalida} is not null)
      and (${t.montoDeLaSalida} is not null) = (${t.destinoDeLaSalida} is not null)
      and (${t.montoDeLaSalida} is null or ${t.montoDeLaSalida} > 0)
      and (${t.destinoDeLaSalida} is null or ${t.destinoDeLaSalida} in ('proveedor', 'custodio'))`,
  ),
];

/** En disputa trae el motivo, la prueba de pago y la fecha límite. */
const restriccionesDeLaDisputa = (t: T) => [
  check(
    'comprobantes_disputa_completa',
    sql`coalesce(${t.situacionDelDocumento} = 'en_disputa', false) = (${t.motivoDeLaDisputa} is not null)
      and (${t.motivoDeLaDisputa} is not null) = (${t.pruebaDePago} is not null)
      and (${t.motivoDeLaDisputa} is not null) = (${t.disputaHasta} is not null)`,
  ),
  check('comprobantes_motivo_de_la_disputa_rango', textoRecortado(t.motivoDeLaDisputa, 300)),
  check('comprobantes_prueba_de_pago_rango', textoRecortado(t.pruebaDePago, 300)),
];

/**
 * El seguimiento de un documento que su emisor anuló (dictamen del 2026-11-24): situación, salida y disputa.
 */
export const restriccionesDelSeguimiento = (t: T) => [
  ...restriccionesDeLaSituacion(t),
  ...restriccionesDeLaSalida(t),
  ...restriccionesDeLaDisputa(t),
];
