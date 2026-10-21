import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { documentos as documentosDeCompras } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { DESTINO_PROPIO, ESTADOS_DE_DOCUMENTO, TIPOS_DE_DOCUMENTO } from '../../dominio/tipos-de-documento.js';

const TIPOS = TIPOS_DE_DOCUMENTO.map((tipo) => `'${tipo}'`).join(', ');
const ESTADOS = ESTADOS_DE_DOCUMENTO.map((estado) => `'${estado}'`).join(', ');

/** Las columnas de `documentos` que usan las restricciones (la tabla las pasa desde su callback). */
type T = Record<
  | 'id'
  | 'empresaId'
  | 'documentoId'
  | 'destino'
  | 'tipo'
  | 'proveedorId'
  | 'documentoAfectadoId'
  | 'fechaEmision'
  | 'total'
  | 'retenciones'
  | 'vencimiento'
  | 'estado'
  | 'registradoEn'
  | 'registradoPor'
  | 'autorizadoEn'
  | 'autorizadoPor'
  | 'autorizacionPropia'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion'
  | 'estabaAutorizado'
  | 'creadoPor'
  | 'creadoEn',
  AnyPgColumn
>;

/** Valores permitidos y las reglas de montos, notas y vencimiento. */
export const restriccionesDeValores = (t: T) => [
  check('documentos_destino_propio', sql`${t.destino} = ${sql.raw(`'${DESTINO_PROPIO}'`)}`),
  check('documentos_tipo_valido', sql`${t.tipo} in (${sql.raw(TIPOS)})`),
  check('documentos_estado_valido', sql`${t.estado} in (${sql.raw(ESTADOS)})`),
  check(
    'documentos_nota_con_factura',
    sql`(${t.tipo} in ('nota_de_credito', 'nota_de_debito')) = (${t.documentoAfectadoId} is not null)`,
  ),
  check('documentos_total_positivo', sql`${t.total} > 0`),
  check('documentos_retenciones_validas', sql`${t.retenciones} >= 0 and ${t.retenciones} <= ${t.total}`),
  check('documentos_nota_de_credito_sin_retenciones', sql`${t.tipo} <> 'nota_de_credito' or ${t.retenciones} = 0`),
  check('documentos_vencimiento_de_cargos', sql`(${t.tipo} = 'nota_de_credito') = (${t.vencimiento} is null)`),
  check('documentos_vencimiento_desde_emision', sql`${t.vencimiento} is null or ${t.vencimiento} >= ${t.fechaEmision}`),
  check(
    'documentos_motivo_rango',
    sql`${t.motivoDeAnulacion} is null or char_length(${t.motivoDeAnulacion}) between 1 and 300`,
  ),
];

/** Quién registró, autorizó o anuló, y que la excepción de autorizar lo propio quede marcada. */
export const restriccionesDeEstado = (t: T) => [
  check(
    'documentos_registro_completo',
    sql`(${t.registradoEn} is null) = (${t.registradoPor} is null) and (${t.estado} not in ('registrado', 'autorizado') or ${t.registradoEn} is not null)`,
  ),
  check(
    'documentos_autorizacion_completa',
    sql`(${t.autorizadoEn} is null) = (${t.autorizadoPor} is null) and (${t.estado} <> 'autorizado' or ${t.autorizadoEn} is not null) and (${t.autorizadoEn} is not null or not ${t.autorizacionPropia})`,
  ),
  check(
    'documentos_separacion_de_funciones',
    sql`${t.autorizadoPor} is null or ${t.autorizacionPropia} or (${t.autorizadoPor} is distinct from ${t.registradoPor} and ${t.autorizadoPor} is distinct from ${t.creadoPor})`,
  ),
  check(
    'documentos_anulacion_completa',
    sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null and ${t.estabaAutorizado} is not null)`,
  ),
];

/**
 * Llaves y únicos. La llave hacia la factura de una nota (`documentos_factura_fk`) es autorreferente y drizzle-kit no
 * la escribe: va a mano en la migración `0001`.
 */
export const llavesDeDocumento = (t: T) => [
  foreignKey({
    name: 'documentos_documento_fk',
    columns: [t.documentoId, t.empresaId, t.proveedorId, t.destino],
    foreignColumns: [
      documentosDeCompras.id,
      documentosDeCompras.empresaId,
      documentosDeCompras.proveedorId,
      documentosDeCompras.destino,
    ],
  }),
  unique('documentos_documento_unico').on(t.documentoId),
  unique('documentos_para_notas_unico').on(t.documentoId, t.empresaId, t.proveedorId),
  unique('documentos_id_proveedor_unico').on(t.id, t.empresaId, t.proveedorId),
];

/** Índices de consulta: bandeja, lista, saldo por proveedor y por vencer. */
export const indicesDeDocumento = (t: T) => [
  index('documentos_afectado_idx')
    .on(t.documentoAfectadoId)
    .where(sql`${t.documentoAfectadoId} is not null`),
  index('documentos_bandeja_idx')
    .on(t.empresaId, t.creadoEn)
    .where(sql`${t.estado} = 'pendiente'`),
  index('documentos_estado_idx').on(t.empresaId, t.estado, t.fechaEmision),
  index('documentos_proveedor_vencimiento_idx')
    .on(t.empresaId, t.proveedorId, t.vencimiento)
    .where(sql`${t.estado} <> 'anulado'`),
  index('documentos_vencimiento_idx')
    .on(t.empresaId, t.vencimiento)
    .where(sql`${t.estado} <> 'anulado' and ${t.vencimiento} is not null`),
];
