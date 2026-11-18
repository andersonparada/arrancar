import { sql } from 'drizzle-orm';
import { check, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { fechaDeAnulacionPosterior, restriccionesDeAnulacion } from '../../../core/base-datos/restricciones.js';

/** Las columnas de `cambios_de_monto` que usan estas restricciones. */
type T = Record<
  | 'fondoId'
  | 'tipo'
  | 'forma'
  | 'fecha'
  | 'monto'
  | 'movimientoId'
  | 'estado'
  | 'fechaDeAnulacion'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** El tipo, la forma que acepta cada tipo, el monto y el movimiento de Bancos que lo respalda. */
export const restriccionesDelTipoDelCambio = (t: T) => [
  check('cambios_tipo_valido', sql`${t.tipo} in ('apertura', 'aumento', 'disminucion', 'cierre')`),
  check(
    'cambios_forma_valida',
    sql`${t.forma} in ('cheque', 'nota_de_debito', 'nota_de_credito', 'saldo_inicial', 'sin_deposito')`,
  ),
  check(
    'cambios_tipo_y_forma',
    sql`(${t.tipo} = 'apertura' and ${t.forma} in ('cheque', 'nota_de_debito', 'saldo_inicial'))
      or (${t.tipo} = 'aumento' and ${t.forma} in ('cheque', 'nota_de_debito'))
      or (${t.tipo} = 'disminucion' and ${t.forma} = 'nota_de_credito')
      or (${t.tipo} = 'cierre' and ${t.forma} in ('nota_de_credito', 'sin_deposito'))`,
  ),
  check('cambios_monto_valido', sql`case when ${t.tipo} = 'cierre' then ${t.monto} >= 0 else ${t.monto} > 0 end`),
  check('cambios_sin_deposito_es_cero', sql`(${t.forma} = 'sin_deposito') = (${t.tipo} = 'cierre' and ${t.monto} = 0)`),
  check(
    'cambios_movimiento_de_su_forma',
    sql`(${t.forma} in ('saldo_inicial', 'sin_deposito')) = (${t.movimientoId} is null)`,
  ),
];

/** El estado (vigente o anulado) y la anulación completa, con su fecha contable. */
export const restriccionesDeEstadoDelCambio = (t: T) => [
  check('cambios_estado_valido', sql`${t.estado} in ('vigente', 'anulado')`),
  ...restriccionesDeAnulacion('cambios', t),
  fechaDeAnulacionPosterior('cambios', t),
];

/** Un movimiento respalda un solo cambio; una sola apertura y un solo cierre vigentes por fondo. */
export const indicesDelCambioDeMonto = (t: T) => [
  uniqueIndex('cambios_movimiento_unico')
    .on(t.movimientoId)
    .where(sql`${t.movimientoId} is not null`),
  uniqueIndex('cambios_apertura_unica')
    .on(t.fondoId)
    .where(sql`${t.tipo} = 'apertura' and ${t.estado} = 'vigente'`),
  uniqueIndex('cambios_cierre_unico')
    .on(t.fondoId)
    .where(sql`${t.tipo} = 'cierre' and ${t.estado} = 'vigente'`),
  index('cambios_fondo_idx').on(t.fondoId, t.fecha),
];
