import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { REGIMENES_DE_IVA } from '../../dominio/datos-fiscales-de-empresa.js';

const REGIMENES_SQL = REGIMENES_DE_IVA.map((regimen) => `'${regimen}'`).join(', ');

type T = Record<'tipo' | 'iva' | 'muestraEnReportesSat' | 'motivoSinCredito' | 'regimenIvaDeLaEmpresa', AnyPgColumn>;

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
        or coalesce(${t.motivoSinCredito}, '') not in ('fuera_de_plazo', 'no_vinculado')`,
  ),
];
