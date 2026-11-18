import { foreignKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { anticipos } from './anticipos.tablas.js';

/** Las columnas de `gastos` que usan sus llaves. */
type T = Record<
  | 'empresaId'
  | 'cuentaId'
  | 'anticipoId'
  | 'conceptoDeGastoId'
  | 'documentoDeCompraId'
  | 'proveedorId'
  | 'destinoDelDocumento',
  AnyPgColumn
>;

/**
 * Las llaves del gasto: anticipo y concepto de gasto de su misma empresa, y el documento del libro de la misma
 * empresa, del mismo proveedor y con destino cuentas por liquidar.
 */
export const llavesDelGasto = (t: T) => [
  foreignKey({
    name: 'gastos_anticipo_fk',
    columns: [t.anticipoId, t.empresaId],
    foreignColumns: [anticipos.id, anticipos.empresaId],
  }),
  foreignKey({
    name: 'gastos_concepto_de_gasto_fk',
    columns: [t.conceptoDeGastoId, t.empresaId],
    foreignColumns: [conceptosDeGasto.id, conceptosDeGasto.empresaId],
  }),
  foreignKey({
    name: 'gastos_documento_fk',
    columns: [t.documentoDeCompraId, t.empresaId, t.proveedorId, t.destinoDelDocumento],
    foreignColumns: [documentos.id, documentos.empresaId, documentos.proveedorId, documentos.destino],
  }),
  foreignKey({
    name: 'gastos_proveedor_fk',
    columns: [t.proveedorId, t.cuentaId],
    foreignColumns: [proveedores.id, proveedores.cuentaId],
  }),
];
