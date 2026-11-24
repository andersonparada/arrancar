import { sql } from 'drizzle-orm';
import { index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `pagos` que usan estos índices. */
type T = Record<
  | 'empresaId'
  | 'proveedorId'
  | 'movimientoId'
  | 'chequeDeAperturaReferidoId'
  | 'retiroId'
  | 'forma'
  | 'fecha'
  | 'estado'
  | 'fechaDeAnulacion',
  AnyPgColumn
>;

/** Índices de búsqueda de `pagos`: por movimiento, retiro, proveedor, lista y anulados (para el saldo al corte). */
export const indicesDePago = (t: T) => [
  // Un posfechado se liga a un solo pago vigente; al desligarlo (pago anulado) se puede ligar a otro.
  uniqueIndex('pagos_cheque_de_apertura_vigente_unico')
    .on(t.movimientoId)
    .where(sql`${t.forma} = 'cheque_de_apertura' and ${t.estado} = 'vigente'`),
  index('pagos_movimiento_idx')
    .on(t.movimientoId)
    .where(sql`${t.movimientoId} is not null`),
  index('pagos_cheque_referido_idx')
    .on(t.chequeDeAperturaReferidoId)
    .where(sql`${t.chequeDeAperturaReferidoId} is not null`),
  index('pagos_retiro_idx')
    .on(t.retiroId)
    .where(sql`${t.retiroId} is not null`),
  index('pagos_proveedor_fecha_idx').on(t.proveedorId, t.fecha),
  index('pagos_anulados_corte_idx')
    .on(t.empresaId, t.fechaDeAnulacion)
    .where(sql`${t.estado} = 'anulado'`),
  index('pagos_lista_idx').on(t.empresaId, t.estado, t.fecha),
];
