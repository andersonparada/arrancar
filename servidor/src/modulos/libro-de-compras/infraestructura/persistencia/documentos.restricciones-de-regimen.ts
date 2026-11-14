import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { REGIMENES_DE_IVA } from '../../dominio/datos-fiscales-de-empresa.js';

const REGIMENES_SQL = REGIMENES_DE_IVA.map((regimen) => `'${regimen}'`).join(', ');

/** Los motivos cuyo IVA va al costo de las líneas. */
const MOTIVOS_AL_COSTO =
  "'fuera_de_plazo', 'no_vinculado', 'empresa_sin_credito', 'nota_de_debito_tardia', 'otra_causa_sin_credito'";

type T = Record<
  | 'tipo'
  | 'iva'
  | 'ivaNoAcreditable'
  | 'observaciones'
  | 'muestraEnReportesSat'
  | 'motivoSinCredito'
  | 'regimenIvaDeLaEmpresa',
  AnyPgColumn
>;

/** Lo que depende del motivo de no dar crédito: IVA al costo, detalle de «otra causa», exento y fuera del libro. */
export const restriccionesDeMotivo = (t: T) => [
  check(
    'documentos_sin_sat_sin_credito',
    sql`${t.muestraEnReportesSat} or (${t.iva} = 0 and ${t.motivoSinCredito} is null)`,
  ),
  check(
    'documentos_iva_no_acreditable_por_motivo',
    sql`(${t.motivoSinCredito} in (${sql.raw(MOTIVOS_AL_COSTO)}) and ${t.ivaNoAcreditable} = ${t.iva})
        or (coalesce(${t.motivoSinCredito}, '') not in (${sql.raw(MOTIVOS_AL_COSTO)}) and ${t.ivaNoAcreditable} = 0)`,
  ),
  check(
    'documentos_otra_causa_con_detalle',
    sql`coalesce(${t.motivoSinCredito}, '') <> 'otra_causa_sin_credito' or ${t.tipo} = 'nota_de_credito' or ${t.observaciones} is not null`,
  ),
  check('documentos_exento_sin_iva', sql`coalesce(${t.motivoSinCredito}, '') <> 'exento' or ${t.iva} = 0`),
];

/**
 * El régimen de IVA con que se registró el documento (la «foto» de la vigencia de su período) y lo que de él
 * depende: sin crédito fiscal el motivo es `empresa_sin_credito`, y solo en esos períodos (la nota de crédito lo
 * hereda de su factura aunque ella caiga en un período con crédito). Con `coalesce`: el motivo casi siempre es nulo.
 */
export const restriccionesDeRegimen = (t: T) => [
  check('documentos_regimen_de_la_empresa_valido', sql`${t.regimenIvaDeLaEmpresa} in (${sql.raw(REGIMENES_SQL)})`),
  check(
    'documentos_empresa_sin_credito',
    sql`not ${t.muestraEnReportesSat} or ${t.iva} = 0 or ${t.regimenIvaDeLaEmpresa} = 'general'
        or coalesce(${t.motivoSinCredito}, '') = 'empresa_sin_credito'`,
  ),
  check(
    'documentos_empresa_sin_credito_real',
    sql`${t.tipo} = 'nota_de_credito' or coalesce(${t.motivoSinCredito}, '') <> 'empresa_sin_credito'
        or ${t.regimenIvaDeLaEmpresa} <> 'general'`,
  ),
  check(
    'documentos_sin_credito_sin_art_20',
    sql`${t.tipo} = 'nota_de_credito' or ${t.regimenIvaDeLaEmpresa} = 'general'
        or coalesce(${t.motivoSinCredito}, '') not in ('fuera_de_plazo', 'no_vinculado', 'nota_de_debito_tardia')`,
  ),
];
