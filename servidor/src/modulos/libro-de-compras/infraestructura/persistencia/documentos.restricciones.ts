import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';

const TIPOS = "'factura', 'factura_pequeno_contribuyente', 'nota_de_credito', 'recibo'";
const DESTINOS = "'cuentas-por-pagar', 'caja-chica', 'cuentas-por-liquidar'";
const MOTIVOS_FUERA = "'sin_fel', 'fel_a_consumidor_final', 'fel_a_otro_nit'";
const CAUSAS_DE_ANULACION = "'error_de_captura', 'fel_anulada_por_el_emisor', 'no_corresponde_a_la_empresa'";
const MOTIVOS = "'fuera_de_plazo', 'no_vinculado', 'pequeno_contribuyente', 'exento'";

/** Las columnas de `documentos` que usan las restricciones (la tabla las pasa desde su callback). */
export type ColumnasDeDocumento = Record<
  | 'id'
  | 'empresaId'
  | 'cuentaId'
  | 'tipo'
  | 'proveedorId'
  | 'nitEmisor'
  | 'nombreEmisor'
  | 'serie'
  | 'numero'
  | 'autorizacionFel'
  | 'fechaEmision'
  | 'fechaRecepcion'
  | 'periodo'
  | 'muestraEnReportesSat'
  | 'motivoFueraDelLibro'
  | 'motivoSinCredito'
  | 'documentoAfectadoId'
  | 'destino'
  | 'total'
  | 'base'
  | 'iva'
  | 'ivaNoAcreditable'
  | 'idp'
  | 'exento'
  | 'observaciones'
  | 'estado'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion'
  | 'causaDeAnulacion'
  | 'creadoEn',
  AnyPgColumn
>;

type T = ColumnasDeDocumento;

/** Valores permitidos. */
export const restriccionesDeValores = (t: T) => [
  check('documentos_tipo_valido', sql`${t.tipo} in (${sql.raw(TIPOS)})`),
  check('documentos_destino_valido', sql`${t.destino} in (${sql.raw(DESTINOS)})`),
  check(
    'documentos_motivo_sin_credito_valido',
    sql`${t.motivoSinCredito} is null or ${t.motivoSinCredito} in (${sql.raw(MOTIVOS)})`,
  ),
  check(
    'documentos_motivo_fuera_del_libro_valido',
    sql`${t.motivoFueraDelLibro} is null or ${t.motivoFueraDelLibro} in (${sql.raw(MOTIVOS_FUERA)})`,
  ),
  check('documentos_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
  check(
    'documentos_causa_de_anulacion_valida',
    sql`${t.causaDeAnulacion} is null or ${t.causaDeAnulacion} in (${sql.raw(CAUSAS_DE_ANULACION)})`,
  ),
  check('documentos_nit_emisor_valido', sql`${t.nitEmisor} is null or ${t.nitEmisor} ~ '^[0-9]{1,12}[0-9K]$'`),
];

/** Largo y formato de los textos. */
export const restriccionesDeTextos = (t: T) => [
  check('documentos_nombre_emisor_largo', sql`char_length(btrim(${t.nombreEmisor})) between 1 and 200`),
  check(
    'documentos_serie_valida',
    sql`${t.serie} is null or (char_length(btrim(${t.serie})) between 1 and 40 and btrim(${t.serie}) = upper(btrim(${t.serie})) and btrim(${t.serie}) !~ '\\s')`,
  ),
  check(
    'documentos_numero_valido',
    sql`char_length(btrim(${t.numero})) between 1 and 40 and btrim(${t.numero}) = upper(btrim(${t.numero})) and btrim(${t.numero}) !~ '\\s'`,
  ),
  check(
    'documentos_observaciones_largo',
    sql`${t.observaciones} is null or char_length(btrim(${t.observaciones})) between 1 and 500`,
  ),
  check(
    'documentos_motivo_de_anulacion_largo',
    sql`${t.motivoDeAnulacion} is null or char_length(btrim(${t.motivoDeAnulacion})) between 1 and 300`,
  ),
];

/** Montos: signos, rangos y que los totales cuadren. */
export const restriccionesDeMontos = (t: T) => [
  check('documentos_total_positivo', sql`${t.total} > 0`),
  check('documentos_base_no_negativa', sql`${t.base} >= 0`),
  check('documentos_iva_no_negativo', sql`${t.iva} >= 0`),
  check('documentos_iva_no_acreditable_rango', sql`${t.ivaNoAcreditable} between 0 and ${t.iva}`),
  check('documentos_idp_no_negativo', sql`${t.idp} >= 0`),
  check('documentos_exento_no_negativo', sql`${t.exento} >= 0`),
  check('documentos_totales_cuadran', sql`${t.total} = ${t.base} + ${t.iva} + ${t.idp} + ${t.exento}`),
  check(
    'documentos_sin_sat_sin_credito',
    sql`${t.muestraEnReportesSat} or (${t.iva} = 0 and ${t.motivoSinCredito} is null)`,
  ),
  check('documentos_pequeno_contribuyente_sin_iva', sql`${t.tipo} <> 'factura_pequeno_contribuyente' or ${t.iva} = 0`),
  check(
    'documentos_iva_no_acreditable_por_motivo',
    sql`(${t.motivoSinCredito} in ('fuera_de_plazo', 'no_vinculado') and ${t.ivaNoAcreditable} = ${t.iva})
        or (coalesce(${t.motivoSinCredito}, '') not in ('fuera_de_plazo', 'no_vinculado') and ${t.ivaNoAcreditable} = 0)`,
  ),
  check('documentos_exento_sin_iva', sql`coalesce(${t.motivoSinCredito}, '') <> 'exento' or ${t.iva} = 0`),
];

/** Fechas, periodo y plazo del crédito fiscal. La nota de crédito hereda el motivo de su factura, así que no se revisa su plazo. */
export const restriccionesDePeriodo = (t: T) => [
  check('documentos_fechas_ordenadas', sql`${t.fechaRecepcion} >= ${t.fechaEmision}`),
  check('documentos_periodo_primer_dia', sql`extract(day from ${t.periodo}) = 1`),
  check('documentos_periodo_desde_emision', sql`${t.periodo} >= date_trunc('month', ${t.fechaEmision})::date`),
  check(
    'documentos_plazo_del_credito',
    sql`${t.tipo} = 'nota_de_credito' or not ${t.muestraEnReportesSat} or ${t.motivoSinCredito} is not null
        or ${t.periodo} <= (date_trunc('month', ${t.fechaEmision}) + interval '2 months')::date`,
  ),
  check(
    'documentos_fuera_de_plazo_real',
    sql`${t.tipo} = 'nota_de_credito' or coalesce(${t.motivoSinCredito}, '') <> 'fuera_de_plazo'
        or ${t.periodo} > (date_trunc('month', ${t.fechaEmision}) + interval '2 months')::date`,
  ),
  check(
    'documentos_nota_en_su_mes',
    sql`${t.tipo} <> 'nota_de_credito' or ${t.periodo} = date_trunc('month', ${t.fechaRecepcion})::date`,
  ),
];

/** Reglas del SAT, de la nota de crédito, del recibo y de la anulación. */
export const restriccionesDeTipo = (t: T) => [
  check('documentos_nota_con_factura', sql`(${t.tipo} = 'nota_de_credito') = (${t.documentoAfectadoId} is not null)`),
  check(
    'documentos_datos_sat',
    sql`not ${t.muestraEnReportesSat} or (${t.nitEmisor} is not null and ${t.serie} is not null and ${t.autorizacionFel} is not null)`,
  ),
  check(
    'documentos_pequeno_contribuyente',
    sql`${t.tipo} = 'nota_de_credito' or not ${t.muestraEnReportesSat}
        or ((${t.tipo} = 'factura_pequeno_contribuyente') = (coalesce(${t.motivoSinCredito}, '') = 'pequeno_contribuyente'))`,
  ),
  check(
    'documentos_anulacion_completa',
    sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null and ${t.causaDeAnulacion} is not null)`,
  ),
  check('documentos_recibo_desmarcado', sql`${t.tipo} <> 'recibo' or not ${t.muestraEnReportesSat}`),
];

/** La casilla «Se muestra en reportes SAT» sigue al motivo de dejar el documento fuera del libro. */
export const restriccionesDeFueraDelLibro = (t: T) => [
  check('documentos_muestra_segun_motivo', sql`${t.muestraEnReportesSat} = (${t.motivoFueraDelLibro} is null)`),
  check(
    'documentos_sin_fel_sin_autorizacion',
    sql`${t.motivoFueraDelLibro} is distinct from 'sin_fel' or ${t.autorizacionFel} is null`,
  ),
  check(
    'documentos_fel_con_autorizacion',
    sql`${t.motivoFueraDelLibro} not in ('fel_a_consumidor_final', 'fel_a_otro_nit') or ${t.autorizacionFel} is not null`,
  ),
];

/** Llaves únicas y foráneas: los documentos vigentes no se repiten. */
export const llavesDeDocumento = (t: T) => [
  unique('documentos_id_empresa_unico').on(t.id, t.empresaId),
  unique('documentos_para_notas_unico').on(t.id, t.empresaId, t.proveedorId, t.destino),
  foreignKey({
    name: 'documentos_proveedor_fk',
    columns: [t.proveedorId, t.cuentaId],
    foreignColumns: [proveedores.id, proveedores.cuentaId],
  }),
  uniqueIndex('documentos_sat_unico')
    .on(t.nitEmisor, t.tipo, t.serie, t.numero)
    .where(sql`${t.estado} = 'vigente' and ${t.muestraEnReportesSat}`),
  uniqueIndex('documentos_autorizacion_fel_unica')
    .on(t.autorizacionFel)
    .where(sql`${t.estado} = 'vigente' and ${t.autorizacionFel} is not null`),
  uniqueIndex('documentos_del_proveedor_unico')
    .on(t.empresaId, t.proveedorId, t.tipo, sql`coalesce(${t.serie}, '')`, t.numero)
    .where(sql`${t.estado} = 'vigente'`),
];

/** Índices de consulta. */
export const indicesDeDocumento = (t: T) => [
  index('documentos_libro_idx').on(t.empresaId, t.periodo),
  index('documentos_proveedor_reciente_idx').on(t.empresaId, t.proveedorId, sql`${t.creadoEn} desc`),
  index('documentos_emision_idx').on(t.empresaId, t.fechaEmision),
  index('documentos_proveedor_idx').on(t.proveedorId),
  index('documentos_afectado_idx')
    .on(t.documentoAfectadoId)
    .where(sql`${t.documentoAfectadoId} is not null`),
];
