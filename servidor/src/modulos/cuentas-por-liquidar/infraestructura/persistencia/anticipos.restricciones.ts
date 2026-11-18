import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { textoRecortado } from '../../../core/base-datos/restricciones.js';

/** Las columnas de `anticipos` que usan estos checks. */
type T = Record<
  | 'numero'
  | 'beneficiario'
  | 'esEmpleado'
  | 'clase'
  | 'descripcion'
  | 'fecha'
  | 'fechaLimite'
  | 'monto'
  | 'forma'
  | 'motivoConVencidos'
  | 'estado'
  | 'fechaDeLiquidacion'
  | 'liquidadoEn'
  | 'liquidadoPor'
  | 'devuelto'
  | 'movimientoDeDevolucionId'
  | 'reembolsado'
  | 'movimientoDeReembolsoId'
  | 'noLiquidado'
  | 'destinoDeNoLiquidado'
  | 'cuotas'
  | 'motivoDeNoLiquidado',
  AnyPgColumn
>;

/** Reglas de forma de los datos que se escriben al entregar el anticipo. */
export const restriccionesDeLaEntrega = (t: T) => [
  check('anticipos_numero_positivo', sql`${t.numero} > 0`),
  check('anticipos_beneficiario_valido', sql`${t.beneficiario} is not null and ${textoRecortado(t.beneficiario, 150)}`),
  check('anticipos_clase_valida', sql`${t.clase} in ('viatico', 'compra', 'otro')`),
  check('anticipos_descripcion_valida', sql`${t.descripcion} is not null and ${textoRecortado(t.descripcion, 300)}`),
  check('anticipos_monto_positivo', sql`${t.monto} > 0`),
  check('anticipos_fecha_limite_valida', sql`${t.fechaLimite} >= ${t.fecha}`),
  check('anticipos_forma_valida', sql`${t.forma} in ('cheque', 'nota_de_debito')`),
  check('anticipos_motivo_con_vencidos_valido', textoRecortado(t.motivoConVencidos, 300)),
];

/** El estado (abierto, liquidado, anulado) y la liquidación, que se escribe completa y solo en un anticipo liquidado. */
export const restriccionesDeLaLiquidacion = (t: T) => [
  check('anticipos_estado_valido', sql`${t.estado} in ('abierto', 'liquidado', 'anulado')`),
  check(
    'anticipos_liquidacion_completa',
    sql`(${t.estado} = 'liquidado') = (${t.fechaDeLiquidacion} is not null) and (${t.fechaDeLiquidacion} is not null) = (${t.liquidadoEn} is not null) and (${t.liquidadoEn} is not null) = (${t.liquidadoPor} is not null)`,
  ),
  check(
    'anticipos_abierto_sin_liquidar',
    sql`${t.estado} = 'liquidado' or (${t.devuelto} = 0 and ${t.reembolsado} = 0 and ${t.noLiquidado} = 0 and ${t.movimientoDeDevolucionId} is null and ${t.movimientoDeReembolsoId} is null)`,
  ),
];

/** Lo devuelto, lo reembolsado y lo no liquidado: cada uno con su movimiento o su destino, y sin pasarse del monto. */
export const restriccionesDeLosMontosLiquidados = (t: T) => [
  check(
    'anticipos_montos_liquidados_validos',
    sql`${t.devuelto} >= 0 and ${t.reembolsado} >= 0 and ${t.noLiquidado} >= 0`,
  ),
  check('anticipos_devolucion_con_deposito', sql`(${t.devuelto} > 0) = (${t.movimientoDeDevolucionId} is not null)`),
  check('anticipos_reembolso_con_movimiento', sql`(${t.reembolsado} > 0) = (${t.movimientoDeReembolsoId} is not null)`),
  check('anticipos_reembolso_sin_sobrante', sql`${t.reembolsado} = 0 or (${t.devuelto} = 0 and ${t.noLiquidado} = 0)`),
  check('anticipos_liquidacion_no_pasa_del_monto', sql`${t.devuelto} + ${t.noLiquidado} <= ${t.monto}`),
];

/** Lo no liquidado: su destino (cobrar, renta del trabajo o pérdida), las cuotas y el motivo. */
export const restriccionesDeLoNoLiquidado = (t: T) => [
  check(
    'anticipos_destino_valido',
    sql`${t.destinoDeNoLiquidado} is null or ${t.destinoDeNoLiquidado} in ('cobrar', 'renta_del_trabajo', 'perdida')`,
  ),
  check('anticipos_destino_de_lo_no_liquidado', sql`(${t.noLiquidado} > 0) = (${t.destinoDeNoLiquidado} is not null)`),
  check(
    'anticipos_renta_solo_de_empleados',
    sql`${t.destinoDeNoLiquidado} is distinct from 'renta_del_trabajo' or ${t.esEmpleado}`,
  ),
  check(
    'anticipos_cuotas_solo_al_cobrar',
    sql`${t.cuotas} is null or (${t.destinoDeNoLiquidado} = 'cobrar' and ${t.cuotas} >= 1)`,
  ),
  check('anticipos_motivo_de_lo_no_liquidado', sql`(${t.noLiquidado} > 0) = (${t.motivoDeNoLiquidado} is not null)`),
  check('anticipos_motivo_de_lo_no_liquidado_rango', textoRecortado(t.motivoDeNoLiquidado, 300)),
];
