import { sql } from 'drizzle-orm';
import { index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';

/** Las columnas de `comprobantes` que usan estos índices. */
type T = Record<
  | 'id'
  | 'empresaId'
  | 'fondoId'
  | 'documentoDeCompraId'
  | 'proveedorId'
  | 'fecha'
  | 'numero'
  | 'anioDeNumero'
  | 'arqueoId'
  | 'valeProvisionalId'
  | 'conceptoDeGastoId'
  | 'documentoAfectadoId'
  | 'estado',
  AnyPgColumn
>;

/** Las búsquedas por fondo, bandeja, proveedor, concepto, factura afectada, arqueo y vale provisional. */
const busquedasDeComprobante = (t: T) => [
  index('comprobantes_fondo_idx').on(t.fondoId, t.estado),
  index('comprobantes_bandeja_idx')
    .on(t.empresaId)
    .where(sql`${t.fondoId} is null and ${t.estado} = 'vigente'`),
  index('comprobantes_proveedor_fecha_idx')
    .on(t.proveedorId, t.fecha)
    .where(sql`${t.proveedorId} is not null and ${t.estado} = 'vigente'`),
  index('comprobantes_concepto_de_gasto_idx')
    .on(t.conceptoDeGastoId)
    .where(sql`${t.conceptoDeGastoId} is not null`),
  index('comprobantes_proveedor_idx')
    .on(t.proveedorId)
    .where(sql`${t.proveedorId} is not null`),
  index('comprobantes_documento_afectado_idx')
    .on(t.documentoAfectadoId)
    .where(sql`${t.documentoAfectadoId} is not null`),
  index('comprobantes_arqueo_idx')
    .on(t.arqueoId)
    .where(sql`${t.arqueoId} is not null`),
  index('comprobantes_vale_idx')
    .on(t.valeProvisionalId)
    .where(sql`${t.valeProvisionalId} is not null`),
];

/**
 * Únicos e índices de los comprobantes: la llave que usan las líneas de reposición, un documento del libro una sola
 * vez, el número del vale por empresa y año, y las búsquedas por fondo, bandeja, proveedor (bancarización), arqueo y
 * vale provisional.
 */
export const indicesDeComprobante = (t: T) => [
  unique('comprobantes_llave_unica').on(t.id, t.empresaId, t.fondoId),
  uniqueIndex('comprobantes_documento_unico')
    .on(t.documentoDeCompraId)
    .where(sql`${t.documentoDeCompraId} is not null`),
  uniqueIndex('comprobantes_numero_unico')
    .on(t.empresaId, t.anioDeNumero, t.numero)
    .where(sql`${t.numero} is not null`),
  ...busquedasDeComprobante(t),
];
