import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn, type ExtraConfigColumn } from 'drizzle-orm/pg-core';
import { activos } from './activos.tablas.js';

type Columnas = Record<
  | 'empresaId'
  | 'activoId'
  | 'numero'
  | 'anioDeNumero'
  | 'causa'
  | 'descripcion'
  | 'autorizadaPor'
  | 'destinoDelBien'
  | 'numeroDeDenuncia'
  | 'actaArchivoId'
  | 'denunciaArchivoId'
  | 'tipoDeActa'
  | 'costo'
  | 'depreciacionAcumuladaContable'
  | 'valorEnLibros'
  | 'costoFiscal'
  | 'baseFiscal'
  | 'depreciacionAcumuladaFiscal'
  | 'valorFiscalPorDepreciar'
  | 'cuotaDelMesContable'
  | 'cuotaDelMesFiscal'
  | 'comprador'
  | 'precio'
  | 'iva'
  | 'numeroFel'
  | 'autorizacionFel'
  | 'resultadoContable'
  | 'resultadoFiscal'
  | 'origenDelCostoFiscal'
  | 'motivoDelCostoFiscal'
  | 'estado'
  | 'anuladaEn'
  | 'anuladaPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
> &
  Record<'fecha', ExtraConfigColumn>;

/** El activo es de la misma empresa que la baja. */
export function llavesDeBaja(t: Columnas) {
  return [
    foreignKey({
      name: 'bajas_activo_fk',
      columns: [t.activoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
  ];
}

/** Una baja vigente por activo; los archivos de cada baja son suyos (únicos); las bajas de una acta se buscan por su número. */
export function indicesDeBaja(t: Columnas) {
  return [
    uniqueIndex('bajas_vigente_unica')
      .on(t.activoId)
      .where(sql`${t.estado} = 'vigente'`),
    uniqueIndex('bajas_acta_archivo_unico')
      .on(t.actaArchivoId)
      .where(sql`${t.actaArchivoId} is not null`),
    uniqueIndex('bajas_denuncia_archivo_unico')
      .on(t.denunciaArchivoId)
      .where(sql`${t.denunciaArchivoId} is not null`),
    index('bajas_empresa_fecha_idx').on(t.empresaId, t.fecha),
    index('bajas_activo_idx').on(t.activoId),
    index('bajas_numero_idx').on(t.empresaId, t.anioDeNumero, t.numero),
  ];
}

/** Los checks de §5.12 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeBaja(t: Columnas) {
  return [...reglasDeTexto(t), ...reglasDeCifras(t), ...reglasDeVenta(t)];
}

function reglasDeTexto(t: Columnas) {
  return [
    check(
      'bajas_causa',
      sql`${t.causa} in ('venta', 'destruccion', 'robo', 'extravio', 'donacion', 'obsolescencia', 'faltante_de_inventario', 'devuelto_al_dueno', 'otra')`,
    ),
    check('bajas_estado', sql`${t.estado} in ('vigente', 'anulada')`),
    check('bajas_descripcion', sql`char_length(btrim(${t.descripcion})) between 1 and 500`),
    check('bajas_autorizada_por', sql`char_length(btrim(${t.autorizadaPor})) between 1 and 150`),
    check(
      'bajas_destino',
      sql`${t.destinoDelBien} is null or char_length(btrim(${t.destinoDelBien})) between 1 and 300`,
    ),
    check(
      'bajas_numero_de_denuncia',
      sql`${t.numeroDeDenuncia} is null or char_length(btrim(${t.numeroDeDenuncia})) between 1 and 60`,
    ),
    check('bajas_tipo_de_acta', sql`${t.tipoDeActa} is null or ${t.tipoDeActa} in ('administrativa', 'notarial')`),
    check('bajas_acta_con_tipo', sql`${t.actaArchivoId} is null or ${t.tipoDeActa} is not null`),
    check(
      'bajas_anulacion_completa',
      sql`(${t.estado} = 'anulada') = (${t.anuladaEn} is not null and ${t.anuladaPor} is not null and ${t.motivoDeAnulacion} is not null)`,
    ),
  ];
}

function reglasDeCifras(t: Columnas) {
  return [
    check('bajas_valor_en_libros', sql`${t.valorEnLibros} = ${t.costo} - ${t.depreciacionAcumuladaContable}`),
    check(
      'bajas_valor_fiscal_por_depreciar',
      sql`${t.valorFiscalPorDepreciar} = ${t.baseFiscal} - ${t.depreciacionAcumuladaFiscal}`,
    ),
    check('bajas_costo_fiscal', sql`${t.costoFiscal} >= 0`),
    check('bajas_cuotas_del_mes', sql`${t.cuotaDelMesContable} >= 0 and ${t.cuotaDelMesFiscal} >= 0`),
  ];
}

function reglasDelCostoFiscal(t: Columnas) {
  return [
    check(
      'bajas_origen_del_costo_fiscal',
      sql`${t.origenDelCostoFiscal} is null or ${t.origenDelCostoFiscal} in ('en_libros', 'documentado', 'sin_documento', 'criterio_del_contador')`,
    ),
    check('bajas_origen_solo_en_venta', sql`(${t.causa} = 'venta') = (${t.origenDelCostoFiscal} is not null)`),
    check(
      'bajas_motivo_del_costo_fiscal',
      sql`(${t.origenDelCostoFiscal} is not distinct from 'criterio_del_contador') = (${t.motivoDelCostoFiscal} is not null) and (${t.motivoDelCostoFiscal} is null or char_length(btrim(${t.motivoDelCostoFiscal})) between 1 and 300)`,
    ),
  ];
}

function reglasDeVenta(t: Columnas) {
  return [
    ...reglasDelCostoFiscal(t),
    check(
      'bajas_venta_completa',
      sql`(${t.causa} = 'venta') = (${t.precio} is not null and ${t.comprador} is not null and ${t.numeroFel} is not null and ${t.autorizacionFel} is not null and ${t.resultadoContable} is not null and ${t.resultadoFiscal} is not null)`,
    ),
    check('bajas_precio_e_iva', sql`(${t.precio} is null or ${t.precio} > 0) and (${t.iva} is null or ${t.iva} >= 0)`),
    check(
      'bajas_resultado_contable',
      sql`${t.resultadoContable} is null or ${t.resultadoContable} = ${t.precio} - ${t.valorEnLibros}`,
    ),
    check(
      'bajas_resultado_fiscal',
      sql`${t.resultadoFiscal} is null or ${t.resultadoFiscal} = ${t.precio} - (${t.costoFiscal} - ${t.depreciacionAcumuladaFiscal})`,
    ),
  ];
}
