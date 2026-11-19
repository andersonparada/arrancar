import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  ESTADOS_DE_ACTIVO,
  FORMAS_DE_TENENCIA,
  ORIGENES_DE_ACTIVO,
  TIPOS_DE_REGISTRO,
} from '../../dominio/tipos-de-activo.js';

// prettier-ignore
export type ColumnasDeActivo =
  | 'codigo' | 'descripcion' | 'tipoDeRegistro' | 'origen' | 'propietario' | 'formaDeTenencia' | 'estado'
  | 'ocioso' | 'ociosoDesde' | 'motivoDeOcio' | 'fechaDeInicioDeUso' | 'fechaDeBaja' | 'porcentajeFiscal'
  | 'vidaUtilContableMeses' | 'valorResidual' | 'valorComoGanadoComun' | 'valorDeMatricula' | 'valorCatastral'
  | 'valoresDelInmuebleCompleto' | 'marca' | 'modelo' | 'numeroDeSerie' | 'placa' | 'cantidad'
  | 'activoPadreId' | 'id' | 'observaciones' | 'responsable';

const enSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

/** Texto opcional de 1 a `maximo` caracteres (recortado). */
const textoOpcional = (columna: AnyPgColumn, maximo: number) =>
  sql`${columna} is null or char_length(btrim(${columna})) between 1 and ${sql.raw(String(maximo))}`;

/** Los checks de §5.3 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeActivo(t: Record<ColumnasDeActivo, AnyPgColumn>) {
  return [...reglasDeTipo(t), ...reglasDeTextos(t), ...reglasDeVida(t), ...reglasDeMontos(t)];
}

function reglasDeVida(t: Record<ColumnasDeActivo, AnyPgColumn>) {
  return [
    check(
      'activos_ocioso_coherente',
      sql`${t.ocioso} = (${t.ociosoDesde} is not null and ${t.motivoDeOcio} is not null)`,
    ),
    check('activos_ocioso_en_uso', sql`not ${t.ocioso} or ${t.estado} = 'en_uso'`),
    check('activos_inicio_de_uso', sql`(${t.estado} = 'en_construccion') = (${t.fechaDeInicioDeUso} is null)`),
    check('activos_fecha_de_baja', sql`(${t.estado} = 'dado_de_baja') = (${t.fechaDeBaja} is not null)`),
    check(
      'activos_libros_con_uso',
      sql`(${t.tipoDeRegistro} = 'activo' and ${t.estado} <> 'en_construccion') = (${t.porcentajeFiscal} is not null)`,
    ),
  ];
}

function reglasDeMontos(t: Record<ColumnasDeActivo, AnyPgColumn>) {
  return [
    check('activos_porcentaje_fiscal', sql`${t.porcentajeFiscal} between 0 and 100`),
    check('activos_vida_util', sql`${t.vidaUtilContableMeses} between 1 and 1200`),
    check('activos_montos_positivos', sql`${t.valorResidual} >= 0 and ${t.valorComoGanadoComun} >= 0`),
    check('activos_valores_del_inmueble', sql`${t.valorDeMatricula} > 0 and ${t.valorCatastral} > 0`),
    check(
      'activos_inmueble_completo',
      sql`not ${t.valoresDelInmuebleCompleto} or ${t.valorDeMatricula} is not null or ${t.valorCatastral} is not null`,
    ),
    check('activos_cantidad', sql`${t.cantidad} >= 1`),
    check('activos_padre_distinto', sql`${t.activoPadreId} <> ${t.id}`),
  ];
}

function reglasDeTipo(t: Record<ColumnasDeActivo, AnyPgColumn>) {
  return [
    check('activos_tipo_de_registro', sql`${t.tipoDeRegistro} in (${enSql(TIPOS_DE_REGISTRO)})`),
    check('activos_origen', sql`${t.origen} in (${enSql(ORIGENES_DE_ACTIVO)})`),
    check('activos_forma_de_tenencia', sql`${t.formaDeTenencia} in (${enSql(FORMAS_DE_TENENCIA)})`),
    check('activos_estado', sql`${t.estado} in (${enSql(ESTADOS_DE_ACTIVO)})`),
    check(
      'activos_en_construccion_solo_activos',
      sql`${t.estado} <> 'en_construccion' or ${t.tipoDeRegistro} = 'activo'`,
    ),
    check('activos_origen_de_terceros', sql`(${t.tipoDeRegistro} = 'de_terceros') = (${t.origen} is null)`),
    check(
      'activos_propietario_de_terceros',
      sql`(${t.tipoDeRegistro} = 'de_terceros') = (${t.propietario} is not null)`,
    ),
    check(
      'activos_tenencia_de_terceros',
      sql`(${t.tipoDeRegistro} = 'de_terceros') = (${t.formaDeTenencia} is not null)`,
    ),
  ];
}

function reglasDeTextos(t: Record<ColumnasDeActivo, AnyPgColumn>) {
  return [
    check('activos_codigo_valido', sql`${t.codigo} ~ '^[A-Za-z0-9./-]{1,30}$'`),
    check('activos_descripcion_larga', sql`char_length(btrim(${t.descripcion})) between 1 and 200`),
    check('activos_motivo_de_ocio_largo', textoOpcional(t.motivoDeOcio, 300)),
    check('activos_propietario_largo', textoOpcional(t.propietario, 150)),
    check('activos_responsable_largo', textoOpcional(t.responsable, 150)),
    check('activos_observaciones_largas', textoOpcional(t.observaciones, 500)),
    check('activos_marca_larga', textoOpcional(t.marca, 80)),
    check('activos_modelo_largo', textoOpcional(t.modelo, 80)),
    check('activos_serie_larga', textoOpcional(t.numeroDeSerie, 80)),
    check('activos_placa_larga', textoOpcional(t.placa, 80)),
  ];
}
