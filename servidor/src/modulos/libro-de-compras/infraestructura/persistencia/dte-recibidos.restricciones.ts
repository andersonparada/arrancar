import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { ESTADOS_DE_DTE, MOTIVOS_DE_BLOQUEO } from '../../dominio/estado-de-dte.js';
import { TIPOS_DTE } from '../../dominio/tipos-de-documento.js';
import { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';
import { documentos } from './documentos.tablas.js';
import { lotesDeDte } from './lotes-de-dte.tablas.js';

const comillas = (valores: readonly string[]) => valores.map((valor) => `'${valor}'`).join(', ');
const DESTINOS = "'cuentas-por-pagar', 'caja-chica', 'cuentas-por-liquidar'";
/** Mayúsculas, sin espacios y de 1 a 40 letras: lo mismo que pide `documentos` para serie y número. */
const textoDeSerieONumero = (columna: AnyPgColumn) =>
  sql`char_length(btrim(${columna})) between 1 and 40 and btrim(${columna}) = upper(btrim(${columna})) and btrim(${columna}) !~ '\\s'`;

/** Las columnas de `dte_recibidos` que usan las restricciones (la tabla las pasa desde su callback). */
export type ColumnasDeDteRecibido = Record<
  | 'id'
  | 'empresaId'
  | 'cuentaId'
  | 'autorizacionFel'
  | 'tipoDte'
  | 'serie'
  | 'numero'
  | 'fechaEmision'
  | 'nitEmisor'
  | 'nombreEmisor'
  | 'nitReceptor'
  | 'total'
  | 'iva'
  | 'idp'
  | 'otrosImpuestos'
  | 'filaOriginal'
  | 'estadoSat'
  | 'anuladoEnLaSatEl'
  | 'loteId'
  | 'primerLoteId'
  | 'estado'
  | 'documentoId'
  | 'motivoDeDescarte'
  | 'descartadoEn'
  | 'descartadoPor'
  | 'motivoDeBloqueo'
  | 'proveedorId'
  | 'conceptoId'
  | 'destino'
  | 'fechaRecepcion'
  | 'periodo'
  | 'documentoAfectadoId',
  AnyPgColumn
>;

type T = ColumnasDeDteRecibido;

/** Los datos del DTE tal como los dice la SAT. */
export const restriccionesDelDte = (t: T) => [
  check('dte_recibidos_tipo_dte_valido', sql`${t.tipoDte} in (${sql.raw(comillas(TIPOS_DTE))})`),
  check('dte_recibidos_serie_valida', textoDeSerieONumero(t.serie)),
  check('dte_recibidos_numero_valido', textoDeSerieONumero(t.numero)),
  check('dte_recibidos_nit_emisor_valido', sql`${t.nitEmisor} ~ '^[0-9]{1,12}[0-9K]$'`),
  check('dte_recibidos_nit_receptor_valido', sql`${t.nitReceptor} ~ '^[0-9]{1,12}[0-9K]$'`),
  check('dte_recibidos_nombre_emisor_largo', sql`char_length(btrim(${t.nombreEmisor})) between 1 and 200`),
  check('dte_recibidos_total_positivo', sql`${t.total} > 0`),
  check('dte_recibidos_iva_no_negativo', sql`${t.iva} >= 0`),
  check('dte_recibidos_idp_no_negativo', sql`${t.idp} >= 0`),
  check('dte_recibidos_otros_impuestos_no_negativo', sql`${t.otrosImpuestos} >= 0`),
  check('dte_recibidos_otros_impuestos_cuadran', sql`${t.idp} + ${t.iva} + ${t.otrosImpuestos} <= ${t.total}`),
  check('dte_recibidos_fila_original_chica', sql`pg_column_size(${t.filaOriginal}) <= 16384`),
  check('dte_recibidos_estado_sat_valido', sql`${t.estadoSat} in ('vigente', 'anulado')`),
  check('dte_recibidos_anulado_con_fecha', sql`(${t.estadoSat} = 'anulado') = (${t.anuladoEnLaSatEl} is not null)`),
];

/** El estado en la bandeja y sus datos obligatorios. */
export const restriccionesDelEstado = (t: T) => [
  check('dte_recibidos_estado_valido', sql`${t.estado} in (${sql.raw(comillas(ESTADOS_DE_DTE))})`),
  check('dte_recibidos_registrado_con_documento', sql`(${t.estado} = 'registrado') = (${t.documentoId} is not null)`),
  check(
    'dte_recibidos_descarte_completo',
    sql`(${t.estado} = 'descartado') = (${t.motivoDeDescarte} is not null and ${t.descartadoEn} is not null and ${t.descartadoPor} is not null)`,
  ),
  check(
    'dte_recibidos_motivo_de_descarte_largo',
    sql`${t.motivoDeDescarte} is null or char_length(btrim(${t.motivoDeDescarte})) between 1 and 300`,
  ),
  check('dte_recibidos_bloqueo_con_motivo', sql`(${t.estado} = 'bloqueado') = (${t.motivoDeBloqueo} is not null)`),
  check(
    'dte_recibidos_motivo_de_bloqueo_valido',
    sql`${t.motivoDeBloqueo} is null or ${t.motivoDeBloqueo} in (${sql.raw(comillas(MOTIVOS_DE_BLOQUEO))})`,
  ),
];

/** Lo que el usuario completa antes de confirmar. */
export const restriccionesDelBorrador = (t: T) => [
  check('dte_recibidos_destino_valido', sql`${t.destino} is null or ${t.destino} in (${sql.raw(DESTINOS)})`),
  check('dte_recibidos_fechas_ordenadas', sql`${t.fechaRecepcion} is null or ${t.fechaRecepcion} >= ${t.fechaEmision}`),
  check(
    'dte_recibidos_periodo_valido',
    sql`${t.periodo} is null or (extract(day from ${t.periodo}) = 1 and ${t.periodo} >= date_trunc('month', ${t.fechaEmision})::date)`,
  ),
  check('dte_recibidos_nota_con_factura', sql`${t.documentoAfectadoId} is null or ${t.tipoDte} in ('NCRE', 'NDEB')`),
];

/** Llaves únicas y foráneas hacia los lotes: la autorización no se repite en la empresa. */
export const llavesDeDteRecibido = (t: T) => [
  unique('dte_recibidos_autorizacion_unica').on(t.empresaId, t.autorizacionFel),
  foreignKey({
    name: 'dte_recibidos_lote_fk',
    columns: [t.loteId, t.empresaId],
    foreignColumns: [lotesDeDte.id, lotesDeDte.empresaId],
  }),
  foreignKey({
    name: 'dte_recibidos_primer_lote_fk',
    columns: [t.primerLoteId, t.empresaId],
    foreignColumns: [lotesDeDte.id, lotesDeDte.empresaId],
  }),
];

/** Llaves hacia lo registrado (un documento, una sola fila), el concepto y el proveedor. */
export const llavesDeLoRegistrado = (t: T) => [
  uniqueIndex('dte_recibidos_documento_unico')
    .on(t.documentoId)
    .where(sql`${t.documentoId} is not null`),
  foreignKey({
    name: 'dte_recibidos_documento_fk',
    columns: [t.documentoId, t.empresaId],
    foreignColumns: [documentos.id, documentos.empresaId],
  }),
  foreignKey({
    name: 'dte_recibidos_documento_afectado_fk',
    columns: [t.documentoAfectadoId, t.empresaId],
    foreignColumns: [documentos.id, documentos.empresaId],
  }),
  foreignKey({
    name: 'dte_recibidos_concepto_fk',
    columns: [t.conceptoId, t.empresaId],
    foreignColumns: [conceptosDeGasto.id, conceptosDeGasto.empresaId],
  }),
  foreignKey({
    name: 'dte_recibidos_proveedor_fk',
    columns: [t.proveedorId, t.cuentaId],
    foreignColumns: [proveedores.id, proveedores.cuentaId],
  }),
];

/** Índices de consulta y de las llaves foráneas. */
export const indicesDeDteRecibido = (t: T) => [
  index('dte_recibidos_bandeja_idx').on(t.empresaId, t.estado, t.fechaEmision),
  index('dte_recibidos_numero_idx').on(t.empresaId, t.nitEmisor, t.serie, t.numero),
  index('dte_recibidos_proveedor_idx')
    .on(t.proveedorId)
    .where(sql`${t.proveedorId} is not null`),
  index('dte_recibidos_concepto_idx')
    .on(t.conceptoId)
    .where(sql`${t.conceptoId} is not null`),
  index('dte_recibidos_afectado_idx')
    .on(t.documentoAfectadoId)
    .where(sql`${t.documentoAfectadoId} is not null`),
  index('dte_recibidos_lote_idx').on(t.loteId),
  index('dte_recibidos_primer_lote_idx').on(t.primerLoteId),
];
