import { sql } from 'drizzle-orm';
import {
  boolean,
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
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { restriccionesDeEstadoYAnulacion } from './anulacion.restricciones.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';
import { restriccionesDePago } from './pagos.restricciones.js';

/**
 * Un pago a un proveedor sobre uno o varios cargos de sus contraseñas vigentes: cheque, nota de débito, nota ya registrada que se liga o aplicación a la
 * cuenta de apertura. Su `id` es el documento de origen del movimiento en Bancos. No se borra: se anula (y sus líneas
 * quedan con `vigente = false`). Cuánto va a cada cargo está en `aplicaciones_de_pagos`; que la suma cuadre, y que
 * los cargos estén autorizados y tengan saldo, lo cuida el dominio con las filas bloqueadas.
 */
export const pagos = esquemaCuentasPorPagar.table(
  'pagos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** El pago es del proveedor; cada línea dice su contraseña. */
    proveedorId: uuid().notNull(),
    /** Del correlativo `cuentas-por-pagar.pagos`. */
    numero: integer().notNull(),
    /** El año del número si la empresa reinicia sus correlativos cada año; 0 si no. */
    anioDeNumero: integer().notNull().default(0),
    forma: text().$type<'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura'>().notNull(),
    /** La del movimiento (un cheque posfechado lleva la suya), la de la aplicación o la de inicio con carga abierta. */
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** El cheque o la nota de Bancos; nulo solo en la cuenta de apertura. */
    movimientoId: uuid(),
    /** Solo en nota ligada y cuenta de apertura; en cheque y nota de débito la referencia va a Bancos. */
    referencia: text(),
    /** Solo en la cuenta de apertura, obligatorio. */
    motivo: text(),
    /** Solo en la cuenta de apertura: si la carga inicial estaba cerrada al registrarlo. */
    conCargaCerrada: boolean(),
    observaciones: text(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({ name: 'pagos_proveedor_fk', columns: [t.proveedorId], foreignColumns: [proveedores.id] }),
    foreignKey({ name: 'pagos_movimiento_fk', columns: [t.movimientoId], foreignColumns: [movimientos.id] }),
    ...restriccionesDePago(t),
    ...restriccionesDeEstadoYAnulacion('pagos', t),
    unique('pagos_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    unique('pagos_id_proveedor_unico').on(t.id, t.empresaId, t.proveedorId),
    uniqueIndex('pagos_movimiento_creado_unico')
      .on(t.movimientoId)
      .where(sql`${t.forma} in ('cheque', 'nota_de_debito')`),
    index('pagos_movimiento_idx')
      .on(t.movimientoId)
      .where(sql`${t.movimientoId} is not null`),
    index('pagos_proveedor_fecha_idx').on(t.proveedorId, t.fecha),
    index('pagos_lista_idx').on(t.empresaId, t.estado, t.fecha),
    politicaPorEmpresa(),
  ],
);
