import { sql } from 'drizzle-orm';
import { index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `gastos` que usan estos índices. */
type T = Record<
  | 'empresaId'
  | 'cuentaId'
  | 'anticipoId'
  | 'documentoDeCompraId'
  | 'proveedorId'
  | 'conceptoDeGastoId'
  | 'fecha'
  | 'estado',
  AnyPgColumn
>;

/** Un documento del libro una sola vez y las búsquedas por anticipo, bandeja, concepto y proveedor. */
export const indicesDelGasto = (t: T) => [
  uniqueIndex('gastos_documento_unico')
    .on(t.documentoDeCompraId)
    .where(sql`${t.documentoDeCompraId} is not null`),
  index('gastos_anticipo_idx').on(t.anticipoId),
  index('gastos_concepto_de_gasto_idx')
    .on(t.conceptoDeGastoId)
    .where(sql`${t.conceptoDeGastoId} is not null`),
  index('gastos_proveedor_idx')
    .on(t.proveedorId, t.cuentaId)
    .where(sql`${t.proveedorId} is not null`),
  index('gastos_cuenta_idx').on(t.cuentaId),
  index('gastos_bandeja_idx')
    .on(t.empresaId)
    .where(sql`${t.anticipoId} is null and ${t.estado} = 'vigente'`),
  index('gastos_proveedor_fecha_idx')
    .on(t.proveedorId, t.fecha)
    .where(sql`${t.proveedorId} is not null and ${t.estado} = 'vigente'`),
];
