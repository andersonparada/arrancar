import { sql } from 'drizzle-orm';
import {
  date,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { restriccionesDeEstadoYAnulacion } from './anulacion.restricciones.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';
import { restriccionesDeReintegro } from './reintegros.restricciones.js';

/**
 * Lo que el proveedor devuelve a la empresa (depósito o efectivo) contra el saldo libre de sus notas de crédito. Es un
 * cobro: no va en contraseñas. No se borra: se anula. Cuánto consume cada nota está en `aplicaciones_de_reintegros`.
 */
export const reintegros = esquemaCuentasPorPagar.table(
  'reintegros',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    proveedorId: uuid().notNull(),
    /** Del correlativo `cuentas-por-pagar.reintegros`: el recibo que se le extiende al proveedor. */
    numero: integer().notNull(),
    anioDeNumero: integer().notNull().default(0),
    forma: text().$type<'deposito' | 'efectivo'>().notNull(),
    /** La del depósito o la del recibo de caja. */
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** La nota de crédito de Bancos; solo en el depósito. */
    movimientoId: uuid(),
    /** En efectivo es obligatoria: el recibo de caja o la boleta. */
    referencia: text(),
    observaciones: text(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({ name: 'reintegros_proveedor_fk', columns: [t.proveedorId], foreignColumns: [proveedores.id] }),
    foreignKey({ name: 'reintegros_movimiento_fk', columns: [t.movimientoId], foreignColumns: [movimientos.id] }),
    ...restriccionesDeReintegro(t),
    ...restriccionesDeEstadoYAnulacion('reintegros', t),
    unique('reintegros_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    unique('reintegros_id_proveedor_unico').on(t.id, t.empresaId, t.proveedorId),
    uniqueIndex('reintegros_movimiento_unico')
      .on(t.movimientoId)
      .where(sql`${t.movimientoId} is not null`),
    index('reintegros_proveedor_idx').on(t.proveedorId),
    index('reintegros_lista_idx').on(t.empresaId, t.estado, t.fecha),
    politicaPorEmpresa(),
  ],
);
