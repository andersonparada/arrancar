import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  fechaDeAnulacionPosterior,
  restriccionesDeAnulacion,
  textoRecortado,
} from '../../../core/base-datos/restricciones.js';

/** Las columnas de `gastos` que usan estos checks. */
type T = Record<
  | 'fecha'
  | 'fechaDeAnulacion'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion'
  | 'anticipoId'
  | 'clase'
  | 'documentoDeCompraId'
  | 'resta'
  | 'proveedorId'
  | 'monto'
  | 'descripcion'
  | 'pagadoA'
  | 'conceptoDeGastoId'
  | 'motivoSinDocumento'
  | 'tratamientoSinDocumento'
  | 'conRetencion'
  | 'montoRetenido'
  | 'motivoConRetencion'
  | 'destinoDelDocumento'
  | 'asignadoEn'
  | 'asignadoPor'
  | 'estado',
  AnyPgColumn
>;

/** La clase del gasto (con documento del libro o sin documento) y lo que cada una exige. */
export const restriccionesDeLaClaseDelGasto = (t: T) => [
  check('gastos_clase_valida', sql`${t.clase} in ('documento', 'sin_documento')`),
  check('gastos_documento_de_su_clase', sql`(${t.clase} = 'documento') = (${t.documentoDeCompraId} is not null)`),
  check('gastos_documento_con_proveedor', sql`${t.clase} <> 'documento' or ${t.proveedorId} is not null`),
  check('gastos_sin_documento_exige_anticipo', sql`${t.clase} = 'documento' or ${t.anticipoId} is not null`),
  check('gastos_monto_positivo', sql`${t.monto} > 0`),
  check('gastos_resta_solo_en_documentos', sql`not ${t.resta} or ${t.clase} = 'documento'`),
  check(
    'gastos_asignacion_completa',
    sql`(${t.anticipoId} is null) = (${t.asignadoEn} is null) and (${t.asignadoEn} is null) = (${t.asignadoPor} is null)`,
  ),
  check('gastos_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
];

/** El gasto sin documento: descripción, a quién se pagó, concepto, motivo y cómo se trata (V-6, por validar). */
export const restriccionesDelGastoSinDocumento = (t: T) => [
  check('gastos_descripcion_obligatoria', sql`${t.clase} = 'documento' or ${t.descripcion} is not null`),
  check('gastos_descripcion_valida', textoRecortado(t.descripcion, 300)),
  check('gastos_pagado_a_de_su_clase', sql`(${t.clase} = 'sin_documento') = (${t.pagadoA} is not null)`),
  check('gastos_pagado_a_valido', textoRecortado(t.pagadoA, 150)),
  check('gastos_concepto_del_gasto', sql`${t.clase} <> 'sin_documento' or ${t.conceptoDeGastoId} is not null`),
  check(
    'gastos_motivo_sin_documento_de_su_clase',
    sql`(${t.clase} = 'sin_documento') = (${t.motivoSinDocumento} is not null)`,
  ),
  check('gastos_motivo_sin_documento_rango', textoRecortado(t.motivoSinDocumento, 300)),
  check(
    'gastos_tratamiento_de_su_clase',
    sql`(${t.clase} = 'sin_documento') = (${t.tratamientoSinDocumento} is not null)`,
  ),
  check(
    'gastos_tratamiento_valido',
    sql`${t.tratamientoSinDocumento} is null or ${t.tratamientoSinDocumento} in ('no_deducible', 'renta_del_trabajo')`,
  ),
];

/** La factura con retención (excepción de CC-f): monto retenido, motivo y solo en documentos. */
export const restriccionesDeLaRetencionDelGasto = (t: T) => [
  check('gastos_retenido_no_negativo', sql`${t.montoRetenido} >= 0`),
  check('gastos_retencion_con_monto', sql`${t.conRetencion} = (${t.montoRetenido} > 0)`),
  check('gastos_retencion_con_motivo', sql`${t.conRetencion} = (${t.motivoConRetencion} is not null)`),
  check('gastos_motivo_con_retencion_rango', textoRecortado(t.motivoConRetencion, 300)),
  check('gastos_retencion_solo_en_documentos', sql`not ${t.conRetencion} or ${t.clase} = 'documento'`),
  check('gastos_destino_del_documento_fijo', sql`${t.destinoDelDocumento} = 'cuentas-por-liquidar'`),
];

/** Todas las restricciones del gasto: su clase, la retención, lo propio del gasto sin documento y la anulación. */
export const restriccionesDelGasto = (t: T) => [
  ...restriccionesDeLaClaseDelGasto(t),
  ...restriccionesDeLaRetencionDelGasto(t),
  ...restriccionesDelGastoSinDocumento(t),
  ...restriccionesDeAnulacion('gastos', t),
  fechaDeAnulacionPosterior('gastos', t),
];
