import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { textoRecortado } from '../../../core/base-datos/restricciones.js';

/** Las columnas de `comprobantes` que usan estos checks. */
type T = Record<
  | 'fondoId'
  | 'clase'
  | 'documentoDeCompraId'
  | 'proveedorId'
  | 'resta'
  | 'esNotaDeCredito'
  | 'documentoAfectadoId'
  | 'monto'
  | 'numero'
  | 'descripcion'
  | 'pagadoA'
  | 'conceptoDeGastoId'
  | 'motivoSinDocumento'
  | 'sobreElTope'
  | 'motivoSobreElTope'
  | 'sinBancarizar'
  | 'motivoSinBancarizar'
  | 'arqueoId'
  | 'destinoDelFaltante'
  | 'valeProvisionalId'
  | 'asignadoEn'
  | 'asignadoPor'
  | 'estado',
  AnyPgColumn
>;

/** La clase del comprobante y lo que cada clase exige: documento del libro, vale de gasto, faltante o sobrante. */
export const restriccionesDeLaClase = (t: T) => [
  check('comprobantes_clase_valida', sql`${t.clase} in ('documento', 'vale_de_gasto', 'faltante', 'sobrante')`),
  check('comprobantes_clase_exige_fondo', sql`${t.clase} = 'documento' or ${t.fondoId} is not null`),
  check('comprobantes_documento_de_su_clase', sql`(${t.clase} = 'documento') = (${t.documentoDeCompraId} is not null)`),
  check('comprobantes_documento_con_proveedor', sql`${t.clase} <> 'documento' or ${t.proveedorId} is not null`),
  check('comprobantes_monto_positivo', sql`${t.monto} > 0`),
  check('comprobantes_resta_coherente', sql`${t.resta} = (${t.clase} = 'sobrante' or ${t.esNotaDeCredito})`),
  check('comprobantes_nota_solo_en_documentos', sql`not ${t.esNotaDeCredito} or ${t.clase} = 'documento'`),
  check('comprobantes_afectado_solo_en_notas', sql`${t.documentoAfectadoId} is null or ${t.esNotaDeCredito}`),
  check('comprobantes_arqueo_de_su_clase', sql`(${t.clase} in ('faltante', 'sobrante')) = (${t.arqueoId} is not null)`),
  check(
    'comprobantes_destino_del_faltante',
    sql`(${t.clase} = 'faltante') = (${t.destinoDelFaltante} is not null) and (${t.destinoDelFaltante} is null or ${t.destinoDelFaltante} in ('perdida', 'cobrar_al_custodio'))`,
  ),
  check(
    'comprobantes_vale_provisional_valido',
    sql`${t.valeProvisionalId} is null or (${t.clase} in ('documento', 'vale_de_gasto') and ${t.fondoId} is not null)`,
  ),
];

/** El vale de gasto (sin factura): correlativo, a quién se pagó, concepto y por qué no hay documento. */
export const restriccionesDelValeDeGasto = (t: T) => [
  check('comprobantes_numero_de_su_clase', sql`(${t.clase} = 'vale_de_gasto') = (${t.numero} is not null)`),
  check('comprobantes_numero_positivo', sql`${t.numero} is null or ${t.numero} > 0`),
  check('comprobantes_descripcion_obligatoria', sql`${t.clase} = 'documento' or ${t.descripcion} is not null`),
  check('comprobantes_descripcion_valida', textoRecortado(t.descripcion, 300)),
  check('comprobantes_pagado_a_de_su_clase', sql`(${t.clase} = 'vale_de_gasto') = (${t.pagadoA} is not null)`),
  check('comprobantes_pagado_a_valido', textoRecortado(t.pagadoA, 150)),
  check('comprobantes_concepto_del_vale', sql`${t.clase} <> 'vale_de_gasto' or ${t.conceptoDeGastoId} is not null`),
  check(
    'comprobantes_motivo_sin_documento_de_su_clase',
    sql`(${t.clase} = 'vale_de_gasto') = (${t.motivoSinDocumento} is not null)`,
  ),
  check('comprobantes_motivo_sin_documento_rango', textoRecortado(t.motivoSinDocumento, 300)),
];

/** Pasarse del tope, el efectivo sin bancarizar y la asignación al fondo: cada marca lleva su motivo. */
export const restriccionesDeMarcas = (t: T) => [
  check('comprobantes_tope_con_motivo', sql`${t.sobreElTope} = (${t.motivoSobreElTope} is not null)`),
  check('comprobantes_motivo_sobre_el_tope_rango', textoRecortado(t.motivoSobreElTope, 300)),
  check('comprobantes_motivo_sin_bancarizar_solo_marcado', sql`${t.motivoSinBancarizar} is null or ${t.sinBancarizar}`),
  check('comprobantes_motivo_sin_bancarizar_rango', textoRecortado(t.motivoSinBancarizar, 300)),
  check(
    'comprobantes_asignacion_completa',
    sql`(${t.fondoId} is null) = (${t.asignadoEn} is null) and (${t.asignadoEn} is null) = (${t.asignadoPor} is null)`,
  ),
  check('comprobantes_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
];
