import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  CODIGOS_DTE_DE_LA_FAMILIA,
  INICIO_DEL_PRIMARIO_Y_PECUARIO,
  MOTIVO_DE_LA_FAMILIA,
  TIPOS_DE_DOCUMENTO,
  TIPOS_DTE,
  type TipoDeDocumento,
} from '../../dominio/tipos-de-documento.js';

type T = Record<
  | 'tipo'
  | 'tipoDte'
  | 'autorizacionFel'
  | 'nitEmisor'
  | 'nitReceptor'
  | 'iva'
  | 'fechaEmision'
  | 'muestraEnReportesSat'
  | 'motivoSinCredito',
  AnyPgColumn
>;

const lista = (valores: readonly string[]) => valores.map((valor) => `'${valor}'`).join(', ');

const FAMILIAS_CON_MOTIVO = Object.keys(MOTIVO_DE_LA_FAMILIA) as TipoDeDocumento[];
const MOTIVOS_DE_FAMILIA = [...new Set(Object.values(MOTIVO_DE_LA_FAMILIA))];

/** `when '<familia>' then tipo_dte in (...)` de cada familia. */
const codigosDeCadaFamilia = (t: T) =>
  sql.join(
    TIPOS_DE_DOCUMENTO.map(
      (familia) =>
        sql`when ${sql.raw(`'${familia}'`)} then ${t.tipoDte} in (${sql.raw(lista(CODIGOS_DTE_DE_LA_FAMILIA[familia]))})`,
    ),
    sql` `,
  );

/** `when '<familia>' then motivo_sin_credito = '<motivo>'` de cada familia sin IVA. */
const motivoDeCadaFamilia = (t: T) =>
  sql.join(
    FAMILIAS_CON_MOTIVO.map(
      (familia) =>
        sql`when ${sql.raw(`'${familia}'`)} then coalesce(${t.motivoSinCredito}, '') = ${sql.raw(`'${MOTIVO_DE_LA_FAMILIA[familia]}'`)}`,
    ),
    sql` `,
  );

/**
 * Qué códigos del DTE admite cada familia, y las reglas de las familias sin IVA (pequeño contribuyente y su
 * versión electrónica, agropecuario y primario/pecuario) y de la factura especial. La fecha de derogación de las
 * familias derogadas la revisa el dominio (variable de instalación), no la base.
 */
export const restriccionesDeFamilia = (t: T) => [
  check('documentos_tipo_dte_valido', sql`${t.tipoDte} is null or ${t.tipoDte} in (${sql.raw(lista(TIPOS_DTE))})`),
  check('documentos_tipo_dte_con_fel', sql`(${t.tipoDte} is null) = (${t.autorizacionFel} is null)`),
  check(
    'documentos_tipo_dte_de_la_familia',
    sql`${t.tipoDte} is null or case ${t.tipo} ${codigosDeCadaFamilia(t)} else false end`,
  ),
  check('documentos_familia_sin_iva', sql`${t.tipo} not in (${sql.raw(lista(FAMILIAS_CON_MOTIVO))}) or ${t.iva} = 0`),
  check(
    'documentos_motivo_de_la_familia',
    sql`${t.tipo} = 'nota_de_credito' or not ${t.muestraEnReportesSat} or (case ${t.tipo} ${motivoDeCadaFamilia(t)} else coalesce(${t.motivoSinCredito}, '') not in (${sql.raw(lista(MOTIVOS_DE_FAMILIA))}) end)`,
  ),
  check(
    'documentos_primario_pecuario_desde',
    sql`${t.tipo} <> 'factura_primario_pecuario' or ${t.fechaEmision} >= date '${sql.raw(INICIO_DEL_PRIMARIO_Y_PECUARIO)}'`,
  ),
  check('documentos_factura_especial_en_el_libro', sql`${t.tipo} <> 'factura_especial' or ${t.muestraEnReportesSat}`),
  check(
    'documentos_factura_especial_vendedor',
    sql`${t.tipo} <> 'factura_especial' or (${t.nitReceptor} is not null and ${t.nitReceptor} <> coalesce(${t.nitEmisor}, '')
        and (${t.nitReceptor} ~ '^[0-9]{1,12}[0-9K]$' or ${t.nitReceptor} ~ '^[0-9]{13}$'))`,
  ),
];
