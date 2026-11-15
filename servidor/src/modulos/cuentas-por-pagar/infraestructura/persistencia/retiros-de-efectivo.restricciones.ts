import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `retiros_de_efectivo` que usan estos checks. */
type T = Record<
  | 'numero'
  | 'forma'
  | 'monto'
  | 'custodio'
  | 'observaciones'
  | 'estado'
  | 'fechaDeLiquidacion'
  | 'liquidadoEn'
  | 'liquidadoPor'
  | 'devuelto'
  | 'movimientoDeDevolucionId'
  | 'faltante'
  | 'motivoDeFaltante'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** Reglas de los valores de un retiro: forma, monto, textos y número. */
export const restriccionesDeValoresDeRetiro = (t: T) => [
  check('retiros_numero_positivo', sql`${t.numero} > 0`),
  check('retiros_forma_valida', sql`${t.forma} in ('cheque', 'nota_de_debito')`),
  check('retiros_monto_positivo', sql`${t.monto} > 0`),
  check(
    'retiros_custodio_valido',
    sql`char_length(${t.custodio}) between 1 and 150 and ${t.custodio} = btrim(${t.custodio})`,
  ),
  check(
    'retiros_observaciones_validas',
    sql`${t.observaciones} is null or (char_length(${t.observaciones}) between 1 and 500 and ${t.observaciones} = btrim(${t.observaciones}))`,
  ),
];

/** Estado (abierto, liquidado, anulado) y lo que cada uno exige: la anulación y la liquidación se escriben completas. */
export const restriccionesDeEstadoDeRetiro = (t: T) => [
  check('retiros_estado_valido', sql`${t.estado} in ('abierto', 'liquidado', 'anulado')`),
  check(
    'retiros_anulacion_completa',
    sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null) and (${t.anuladoEn} is not null) = (${t.anuladoPor} is not null) and (${t.anuladoPor} is not null) = (${t.motivoDeAnulacion} is not null)`,
  ),
  check(
    'retiros_motivo_de_anulacion_rango',
    sql`${t.motivoDeAnulacion} is null or char_length(${t.motivoDeAnulacion}) between 1 and 300`,
  ),
  check(
    'retiros_liquidacion_completa',
    sql`(${t.estado} = 'liquidado') = (${t.fechaDeLiquidacion} is not null) and (${t.fechaDeLiquidacion} is not null) = (${t.liquidadoEn} is not null) and (${t.liquidadoEn} is not null) = (${t.liquidadoPor} is not null)`,
  ),
];

/** Lo devuelto y el faltante: solo un retiro liquidado los lleva, el depósito acompaña a lo devuelto y el faltante, su motivo. */
export const restriccionesDeLiquidacion = (t: T) => [
  check('retiros_devuelto_valido', sql`${t.devuelto} >= 0`),
  check('retiros_faltante_valido', sql`${t.faltante} >= 0`),
  check(
    'retiros_abierto_sin_liquidar',
    sql`${t.estado} = 'liquidado' or (${t.devuelto} = 0 and ${t.faltante} = 0 and ${t.movimientoDeDevolucionId} is null)`,
  ),
  check('retiros_devolucion_con_deposito', sql`(${t.devuelto} > 0) = (${t.movimientoDeDevolucionId} is not null)`),
  check('retiros_liquidacion_no_pasa_del_monto', sql`${t.devuelto} + ${t.faltante} <= ${t.monto}`),
  check('retiros_motivo_de_faltante', sql`(${t.faltante} > 0) = (${t.motivoDeFaltante} is not null)`),
  check(
    'retiros_motivo_de_faltante_rango',
    sql`${t.motivoDeFaltante} is null or char_length(${t.motivoDeFaltante}) between 1 and 300`,
  ),
];
