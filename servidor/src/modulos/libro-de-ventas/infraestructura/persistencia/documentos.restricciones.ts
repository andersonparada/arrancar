import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { clientes } from '../../../terceros/infraestructura/persistencia/clientes.tablas.js';
import { CAUSAS_DE_ANULACION } from '../../dominio/baja-de-documento.js';
import { REGIMENES_DE_ISR, REGIMENES_DE_IVA } from '../../dominio/regimen-de-la-empresa.js';
import { TIPOS_DE_IDENTIFICACION } from '../../dominio/receptor.js';
import { CODIGOS_DTE_DE_LA_FAMILIA, TIPOS_DE_DOCUMENTO, TIPOS_DE_NOTA } from '../../dominio/tipos-de-documento.js';

const lista = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

/** Las columnas de `documentos` que usan las restricciones (la tabla las pasa desde su callback). */
export type ColumnasDeDocumento = Record<
  | 'id'
  | 'empresaId'
  | 'cuentaId'
  | 'tipo'
  | 'tipoDte'
  | 'origen'
  | 'clienteId'
  | 'tipoDeIdentificacion'
  | 'nitReceptor'
  | 'nombreReceptor'
  | 'serie'
  | 'numero'
  | 'autorizacionFel'
  | 'localidadId'
  | 'fechaEmision'
  | 'periodo'
  | 'regimenIvaDeLaEmpresa'
  | 'regimenIsrDeLaEmpresa'
  | 'documentoAfectadoId'
  | 'facturaAnteriorSerie'
  | 'facturaAnteriorNumero'
  | 'facturaAnteriorFecha'
  | 'destino'
  | 'procesadoEnDestinoEn'
  | 'muestraEnReportesSat'
  | 'moneda'
  | 'tipoDeCambio'
  | 'fechaDelTipoDeCambio'
  | 'totalEnMoneda'
  | 'total'
  | 'gravadoBienes'
  | 'gravadoServicios'
  | 'exento'
  | 'exportacion'
  | 'iva'
  | 'otrosImpuestos'
  | 'observaciones'
  | 'estado'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion'
  | 'causaDeAnulacion'
  | 'fechaDeAnulacion',
  AnyPgColumn
>;

type T = ColumnasDeDocumento;

/** Cada código de la SAT solo con su familia: `(tipo = 'factura' and tipo_dte in ('FACT')) or …`. */
const codigosPorFamilia = (t: T) =>
  sql.join(
    TIPOS_DE_DOCUMENTO.map(
      (familia) =>
        sql`(${t.tipo} = ${sql.raw(`'${familia}'`)} and ${t.tipoDte} in (${lista(CODIGOS_DTE_DE_LA_FAMILIA[familia])}))`,
    ),
    sql` or `,
  );

/** Valores permitidos: tipo, código SAT de su familia, origen, régimen, destino y la moneda en quetzales por ahora. */
export const restriccionesDeValores = (t: T) => [
  check('documentos_tipo_valido', sql`${t.tipo} in (${lista(TIPOS_DE_DOCUMENTO)})`),
  check('documentos_tipo_dte_de_la_familia', sql`${t.tipoDte} is null or (${codigosPorFamilia(t)})`),
  check('documentos_fel_con_tipo_dte', sql`(${t.autorizacionFel} is null) = (${t.tipoDte} is null)`),
  check('documentos_origen_valido', sql`${t.origen} in ('manual', 'bandeja_sat', 'fel')`),
  check('documentos_regimen_iva_valido', sql`${t.regimenIvaDeLaEmpresa} in (${lista(REGIMENES_DE_IVA)})`),
  check(
    'documentos_regimen_isr_valido',
    sql`${t.regimenIsrDeLaEmpresa} is null or ${t.regimenIsrDeLaEmpresa} in (${lista(REGIMENES_DE_ISR)})`,
  ),
  check('documentos_destino_valido', sql`${t.destino} is null or ${t.destino} in ('cuentas-por-cobrar')`),
  check('documentos_destino_con_cliente', sql`${t.destino} is null or ${t.clienteId} is not null`),
  check('documentos_procesado_con_destino', sql`${t.procesadoEnDestinoEn} is null or ${t.destino} is not null`),
];

/** Lo que va con el destino y el formato de lo que se escribe: serie, número y observaciones. */
export const restriccionesDeTextos = (t: T) => [
  check('documentos_recibo_fuera_de_los_reportes', sql`(${t.tipo} = 'recibo') = (not ${t.muestraEnReportesSat})`),
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
];

/** El receptor: cómo se identificó y que solo sin cliente cabe el consumidor final. */
export const restriccionesDeReceptor = (t: T) => [
  check('documentos_identificacion_valida', sql`${t.tipoDeIdentificacion} in (${lista(TIPOS_DE_IDENTIFICACION)})`),
  check('documentos_cf_con_nit_cf', sql`${t.tipoDeIdentificacion} <> 'cf' or ${t.nitReceptor} = 'CF'`),
  check('documentos_sin_cliente_es_cf', sql`${t.clienteId} is not null or ${t.nitReceptor} = 'CF'`),
  check('documentos_nit_receptor_largo', sql`char_length(btrim(${t.nitReceptor})) between 1 and 20`),
  check('documentos_nombre_receptor_largo', sql`char_length(btrim(${t.nombreReceptor})) between 1 and 200`),
];

/** Montos: signos, el período, la moneda y que los totales cuadren. El signo de una nota lo da su tipo, no el monto. */
export const restriccionesDeMontos = (t: T) => [
  check('documentos_total_positivo', sql`${t.total} > 0`),
  check(
    'documentos_columnas_no_negativas',
    sql`${t.gravadoBienes} >= 0 and ${t.gravadoServicios} >= 0 and ${t.exento} >= 0 and ${t.exportacion} >= 0 and ${t.iva} >= 0 and ${t.otrosImpuestos} >= 0`,
  ),
  check(
    'documentos_totales_cuadran',
    sql`${t.total} = ${t.gravadoBienes} + ${t.gravadoServicios} + ${t.exento} + ${t.exportacion} + ${t.iva} + ${t.otrosImpuestos}`,
  ),
  check('documentos_periodo_es_el_mes_de_emision', sql`${t.periodo} = date_trunc('month', ${t.fechaEmision})::date`),
  check('documentos_total_en_moneda_positivo', sql`${t.totalEnMoneda} > 0`),
  check(
    'documentos_quetzales_sin_cambio',
    sql`${t.moneda} <> 'GTQ' or (${t.tipoDeCambio} = 1 and ${t.totalEnMoneda} = ${t.total} and ${t.fechaDelTipoDeCambio} is null)`,
  ),
  check(
    'documentos_extranjera_con_tipo',
    sql`${t.moneda} = 'GTQ' or (${t.tipoDeCambio} > 0 and ${t.fechaDelTipoDeCambio} is not null)`,
  ),
];

/** Las notas corrigen una factura del libro o una anterior (nunca las dos); lo demás no corrige nada. */
export const restriccionesDeNotas = (t: T) => [
  check(
    'documentos_nota_con_factura',
    sql`(${t.tipo} in (${lista(TIPOS_DE_NOTA)})) = (${t.documentoAfectadoId} is not null or ${t.facturaAnteriorNumero} is not null)`,
  ),
  check(
    'documentos_una_sola_factura_corregida',
    sql`${t.documentoAfectadoId} is null or ${t.facturaAnteriorNumero} is null`,
  ),
  check(
    'documentos_factura_anterior_completa',
    sql`(${t.facturaAnteriorNumero} is null) = (${t.facturaAnteriorFecha} is null) and (${t.facturaAnteriorSerie} is null or ${t.facturaAnteriorNumero} is not null)`,
  ),
];

/** Anular deja la fecha, quién, por qué y con qué causa; vigente no lleva nada de eso. */
export const restriccionesDeAnulacion = (t: T) => [
  check('documentos_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
  check(
    'documentos_anulacion_completa',
    sql`(${t.estado} = 'anulado' and ${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null and ${t.causaDeAnulacion} is not null and ${t.fechaDeAnulacion} is not null)
        or (${t.estado} = 'vigente' and ${t.anuladoEn} is null and ${t.anuladoPor} is null and ${t.motivoDeAnulacion} is null and ${t.causaDeAnulacion} is null and ${t.fechaDeAnulacion} is null)`,
  ),
  check(
    'documentos_causa_valida',
    sql`${t.causaDeAnulacion} is null or ${t.causaDeAnulacion} in (${lista(CAUSAS_DE_ANULACION)})`,
  ),
  check(
    'documentos_motivo_de_anulacion_largo',
    sql`${t.motivoDeAnulacion} is null or char_length(btrim(${t.motivoDeAnulacion})) between 1 and 300`,
  ),
];

/** Llaves compuestas con la empresa (o la cuenta) para no cruzar datos entre ellas. */
export const llavesDeDocumento = (t: T) => [
  foreignKey({
    name: 'documentos_cliente_fk',
    columns: [t.clienteId, t.cuentaId],
    foreignColumns: [clientes.id, clientes.cuentaId],
  }),
  foreignKey({
    name: 'documentos_afectado_fk',
    columns: [t.documentoAfectadoId, t.empresaId],
    foreignColumns: [t.id, t.empresaId],
  }),
  foreignKey({
    name: 'documentos_localidad_fk',
    columns: [t.localidadId, t.empresaId],
    foreignColumns: [localidades.id, localidades.empresaId],
  }),
];

/** Únicos e índices: el número no se repite ni anulado, la FEL tampoco, y cada llave tiene su índice. */
export const indicesDeDocumento = (t: T) => [
  unique('documentos_id_empresa_unico').on(t.id, t.empresaId),
  unique('documentos_destino_unico').on(t.id, t.empresaId, t.destino),
  uniqueIndex('documentos_serie_y_numero_unicos').on(
    t.empresaId,
    sql`coalesce(${t.tipoDte}, ${t.tipo})`,
    sql`coalesce(${t.serie}, '')`,
    t.numero,
  ),
  uniqueIndex('documentos_autorizacion_fel_unica')
    .on(t.empresaId, t.autorizacionFel)
    .where(sql`${t.autorizacionFel} is not null`),
  index('documentos_libro_idx').on(t.empresaId, t.periodo, t.estado),
  index('documentos_cliente_idx').on(t.empresaId, t.clienteId, t.fechaEmision),
  index('documentos_destino_idx')
    .on(t.empresaId, t.destino)
    .where(sql`${t.destino} is not null`),
  index('documentos_afectado_idx')
    .on(t.documentoAfectadoId, t.empresaId)
    .where(sql`${t.documentoAfectadoId} is not null`),
  index('documentos_localidad_idx')
    .on(t.localidadId)
    .where(sql`${t.localidadId} is not null`),
  index('documentos_cliente_cuenta_idx').on(t.cuentaId),
];
