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
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';
import {
  restriccionesDeEstadoDeRetiro,
  restriccionesDeLiquidacion,
  restriccionesDeValoresDeRetiro,
} from './retiros-de-efectivo.restricciones.js';

/**
 * El efectivo que la empresa saca del banco (un cheque o una nota de débito de Bancos) para pagar en efectivo a uno o
 * varios proveedores. Su `id` es el documento de origen del movimiento y del depósito de la devolución. No se borra:
 * se anula. Que lo pagado, lo devuelto y el faltante sumen el monto al liquidar lo cuida el dominio con el retiro
 * bloqueado. El custodio es el nombre de quien lleva el efectivo y, si es usuario de Arrancar, su `id`.
 */
export const retirosDeEfectivo = esquemaCuentasPorPagar.table(
  'retiros_de_efectivo',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Del correlativo `cuentas-por-pagar.retiros`. */
    numero: integer().notNull(),
    /** El año del número si la empresa reinicia sus correlativos cada año; 0 si no. */
    anioDeNumero: integer().notNull().default(0),
    forma: text().$type<'cheque' | 'nota_de_debito'>().notNull(),
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** El cheque o la nota de Bancos que sacó el efectivo. */
    movimientoId: uuid().notNull(),
    custodio: text().notNull(),
    /** El usuario de Arrancar que es el custodio, si lo es; si se borra, el nombre queda en `custodio`. */
    custodioUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    observaciones: text(),
    estado: text().$type<'abierto' | 'liquidado' | 'anulado'>().notNull().default('abierto'),
    fechaDeLiquidacion: date(),
    liquidadoEn: timestamp({ withTimezone: true }),
    liquidadoPor: uuid(),
    /** Lo que se depositó de vuelta al liquidar. */
    devuelto: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    /** El depósito de Bancos de lo devuelto. */
    movimientoDeDevolucionId: uuid(),
    faltante: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    motivoDeFaltante: text(),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({ name: 'retiros_movimiento_fk', columns: [t.movimientoId], foreignColumns: [movimientos.id] }),
    foreignKey({
      name: 'retiros_devolucion_fk',
      columns: [t.movimientoDeDevolucionId],
      foreignColumns: [movimientos.id],
    }),
    ...restriccionesDeValoresDeRetiro(t),
    ...restriccionesDeEstadoDeRetiro(t),
    ...restriccionesDeLiquidacion(t),
    unique('retiros_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    unique('retiros_movimiento_unico').on(t.movimientoId),
    unique('retiros_llave_unica').on(t.id, t.empresaId),
    uniqueIndex('retiros_devolucion_unica')
      .on(t.movimientoDeDevolucionId)
      .where(sql`${t.movimientoDeDevolucionId} is not null`),
    index('retiros_custodio_usuario_idx')
      .on(t.custodioUsuarioId)
      .where(sql`${t.custodioUsuarioId} is not null`),
    index('retiros_lista_idx').on(t.empresaId, t.estado, t.fecha),
    politicaPorEmpresa(),
  ],
);
