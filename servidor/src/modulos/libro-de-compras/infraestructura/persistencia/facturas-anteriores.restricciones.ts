import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO,
  INICIO_DEL_PRIMARIO_Y_PECUARIO,
  MOTIVO_DE_LA_FAMILIA,
  MOTIVOS_SIN_CREDITO,
  type TipoDeDocumento,
} from '../../dominio/tipos-de-documento.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';

type T = Record<
  | 'id'
  | 'empresaId'
  | 'cuentaId'
  | 'proveedorId'
  | 'tipo'
  | 'serie'
  | 'numero'
  | 'autorizacionFel'
  | 'fechaEmision'
  | 'total'
  | 'iva'
  | 'notasDeDebitoAnterioresTotal'
  | 'notasDeDebitoAnterioresIva'
  | 'motivoSinCredito'
  | 'detalleDelMotivo',
  AnyPgColumn
>;

const lista = (valores: readonly string[]) => valores.map((valor) => `'${valor}'`).join(', ');

/** La nota de débito tardía es un motivo de la nota de débito del libro: una factura anterior no lo tiene. */
const MOTIVOS = MOTIVOS_SIN_CREDITO.filter((motivo) => motivo !== 'nota_de_debito_tardia');
const FAMILIAS_CON_MOTIVO = Object.keys(MOTIVO_DE_LA_FAMILIA) as TipoDeDocumento[];
const MOTIVOS_DE_FAMILIA = [...new Set(Object.values(MOTIVO_DE_LA_FAMILIA))];

const motivoDeCadaFamilia = (t: T) =>
  sql.join(
    FAMILIAS_CON_MOTIVO.map(
      (familia) =>
        sql`when ${sql.raw(`'${familia}'`)} then coalesce(${t.motivoSinCredito}, '') = ${sql.raw(`'${MOTIVO_DE_LA_FAMILIA[familia]}'`)}`,
    ),
    sql` `,
  );

/** Valores permitidos y largo de los textos (la serie y el número, como en `documentos`). */
export const restriccionesDeTextosYValores = (t: T) => [
  check('facturas_anteriores_tipo_valido', sql`${t.tipo} in (${sql.raw(lista(FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO))})`),
  check(
    'facturas_anteriores_serie_valida',
    sql`${t.serie} is null or (char_length(btrim(${t.serie})) between 1 and 40 and btrim(${t.serie}) = upper(btrim(${t.serie})) and btrim(${t.serie}) !~ '\\s')`,
  ),
  check(
    'facturas_anteriores_numero_valido',
    sql`char_length(btrim(${t.numero})) between 1 and 40 and btrim(${t.numero}) = upper(btrim(${t.numero})) and btrim(${t.numero}) !~ '\\s'`,
  ),
  check(
    'facturas_anteriores_motivo_valido',
    sql`${t.motivoSinCredito} is null or ${t.motivoSinCredito} in (${sql.raw(lista(MOTIVOS))})`,
  ),
  check(
    'facturas_anteriores_detalle_del_motivo',
    sql`(${t.detalleDelMotivo} is null or char_length(btrim(${t.detalleDelMotivo})) between 1 and 500)
        and (coalesce(${t.motivoSinCredito}, '') <> 'otra_causa_sin_credito' or ${t.detalleDelMotivo} is not null)`,
  ),
];

/** Montos y reglas de las familias sin IVA. */
export const restriccionesDeMontosYFamilia = (t: T) => [
  check('facturas_anteriores_total_positivo', sql`${t.total} > 0`),
  check('facturas_anteriores_iva_rango', sql`${t.iva} >= 0 and ${t.iva} <= ${t.total}`),
  check(
    'facturas_anteriores_notas_de_debito_rango',
    sql`${t.notasDeDebitoAnterioresTotal} >= 0 and ${t.notasDeDebitoAnterioresIva} >= 0
        and ${t.notasDeDebitoAnterioresIva} <= ${t.notasDeDebitoAnterioresTotal}`,
  ),
  check(
    'facturas_anteriores_motivo_de_la_familia',
    sql`case when ${t.tipo} in (${sql.raw(lista(FAMILIAS_CON_MOTIVO))}) then (case ${t.tipo} ${motivoDeCadaFamilia(t)} else false end)
        else coalesce(${t.motivoSinCredito}, '') not in (${sql.raw(lista(MOTIVOS_DE_FAMILIA))}) end`,
  ),
  check(
    'facturas_anteriores_sin_iva',
    sql`coalesce(${t.motivoSinCredito}, '') not in (${sql.raw(lista([...MOTIVOS_DE_FAMILIA, 'exento']))})
        or (${t.iva} = 0 and ${t.notasDeDebitoAnterioresIva} = 0)`,
  ),
  check(
    'facturas_anteriores_primario_pecuario_desde',
    sql`${t.tipo} <> 'factura_primario_pecuario' or ${t.fechaEmision} >= date '${sql.raw(INICIO_DEL_PRIMARIO_Y_PECUARIO)}'`,
  ),
];

/** Llaves e índices: la clave de la «familia factura» (sin tipo), la autorización FEL y la llave del proveedor. */
export const llavesDeFacturaAnterior = (t: T) => [
  unique('facturas_anteriores_id_proveedor_unico').on(t.id, t.empresaId, t.proveedorId),
  uniqueIndex('facturas_anteriores_del_proveedor_unica').on(
    t.empresaId,
    t.proveedorId,
    sql`coalesce(${t.serie}, '')`,
    t.numero,
  ),
  uniqueIndex('facturas_anteriores_autorizacion_fel_unica')
    .on(t.empresaId, t.autorizacionFel)
    .where(sql`${t.autorizacionFel} is not null`),
  foreignKey({
    name: 'facturas_anteriores_proveedor_fk',
    columns: [t.proveedorId, t.cuentaId],
    foreignColumns: [proveedores.id, proveedores.cuentaId],
  }),
  index('facturas_anteriores_proveedor_idx').on(t.proveedorId),
];
