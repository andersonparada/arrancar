import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { restriccionesDeAnulacion, textoRecortado } from '../../../core/base-datos/restricciones.js';

/** Las columnas de `arqueos` que usan estos checks. */
type T = Record<
  | 'numero'
  | 'realizadoEn'
  | 'custodio'
  | 'conteo'
  | 'efectivoContado'
  | 'valoresPorCambiar'
  | 'montoDelFondo'
  | 'pendienteDeReponer'
  | 'valesAbiertos'
  | 'efectivoEsperado'
  | 'diferencia'
  | 'motivoDeDiferencia'
  | 'observaciones'
  | 'estado'
  | 'fechaDeAnulacion'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** Reglas de forma del arqueo: número, custodio, conteo y montos no negativos. */
export const restriccionesDeLosDatosDelArqueo = (t: T) => [
  check('arqueos_numero_positivo', sql`${t.numero} > 0`),
  check('arqueos_custodio_valido', sql`${t.custodio} is not null and ${textoRecortado(t.custodio, 150)}`),
  check('arqueos_conteo_es_arreglo', sql`jsonb_typeof(${t.conteo}) = 'array'`),
  check('arqueos_montos_validos', sql`${t.efectivoContado} >= 0 and ${t.valoresPorCambiar} >= 0`),
  check('arqueos_fondo_y_vales_validos', sql`${t.montoDelFondo} >= 0 and ${t.valesAbiertos} >= 0`),
  check('arqueos_observaciones_validas', textoRecortado(t.observaciones, 500)),
];

/** Lo esperado y la diferencia cuadran con lo que decía el sistema; con diferencia, el motivo es obligatorio. */
export const restriccionesDeLaDiferenciaDelArqueo = (t: T) => [
  check(
    'arqueos_efectivo_esperado_cuadra',
    sql`${t.efectivoEsperado} = ${t.montoDelFondo} - ${t.pendienteDeReponer} - ${t.valesAbiertos}`,
  ),
  check(
    'arqueos_diferencia_cuadra',
    sql`${t.diferencia} = ${t.efectivoContado} + ${t.valoresPorCambiar} - ${t.efectivoEsperado}`,
  ),
  check('arqueos_motivo_de_diferencia', sql`(${t.diferencia} <> 0) = (${t.motivoDeDiferencia} is not null)`),
  check('arqueos_motivo_de_diferencia_rango', textoRecortado(t.motivoDeDiferencia, 300)),
];

/** Estado (vigente o anulado) y anulación completa; la fecha del conteo es `realizado_en`. */
export const restriccionesDeEstadoDelArqueo = (t: T) => [
  check('arqueos_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
  ...restriccionesDeAnulacion('arqueos', { ...t, fecha: t.realizadoEn }),
];
