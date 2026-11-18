import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, numeric, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { anticipos } from './anticipos.tablas.js';
import { esquemaCuentasPorLiquidar } from './esquema.tablas.js';
import { restriccionesDelGasto } from './gastos.restricciones.js';

/**
 * Lo que se gastó con un anticipo: un documento del libro de compras o un gasto sin documento. Un documento sin
 * `anticipo_id` está en la bandeja, esperando que lo asignen. `resta` es verdadero en las notas de crédito, que bajan
 * lo gastado. Sin alcance por registro: la seguridad es por empresa.
 */
export const gastos = esquemaCuentasPorLiquidar.table(
  'gastos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Nulo: el documento está en la bandeja. */
    anticipoId: uuid(),
    clase: text().$type<'documento' | 'sin_documento'>().notNull(),
    documentoDeCompraId: uuid().references(() => documentos.id),
    resta: boolean().notNull().default(false),
    proveedorId: uuid().references(() => proveedores.id),
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    conActivoFijo: boolean().notNull().default(false),
    descripcion: text(),
    pagadoA: text(),
    conceptoDeGastoId: uuid(),
    motivoSinDocumento: text(),
    /** Por validar con el contador (V-6): por omisión `no_deducible`. */
    tratamientoSinDocumento: text().$type<'no_deducible' | 'renta_del_trabajo'>(),
    /** Marca de bancarización: el efectivo pasó del umbral con el proveedor en el mes. */
    sinBancarizar: boolean().notNull().default(false),
    asignadoEn: timestamp({ withTimezone: true }),
    asignadoPor: uuid(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    fechaDeAnulacion: date(),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
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
    ...restriccionesDelGasto(t),
    uniqueIndex('gastos_documento_unico')
      .on(t.documentoDeCompraId)
      .where(sql`${t.documentoDeCompraId} is not null`),
    index('gastos_anticipo_idx').on(t.anticipoId),
    index('gastos_bandeja_idx')
      .on(t.empresaId)
      .where(sql`${t.anticipoId} is null and ${t.estado} = 'vigente'`),
    index('gastos_proveedor_fecha_idx')
      .on(t.proveedorId, t.fecha)
      .where(sql`${t.proveedorId} is not null and ${t.estado} = 'vigente'`),
    politicaPorEmpresa(),
  ],
);
