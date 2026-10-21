import { sql } from 'drizzle-orm';
import { check, foreignKey, smallint, unique, uuid } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  idPrimario,
  marcasDeTiempo,
  politicaPorCuenta,
} from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';

/**
 * Las condiciones de pago de cada proveedor, por cuenta (como el proveedor): hoy los días de crédito; `null` es el
 * plazo por omisión (un mes) y `0`, contado. Nunca se borra una fila: vaciar el campo guarda `null`.
 */
export const condicionesDeProveedor = esquemaCuentasPorPagar.table(
  'condiciones_de_proveedor',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    proveedorId: uuid().notNull(),
    diasDeCredito: smallint(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'condiciones_proveedor_fk',
      columns: [t.proveedorId, t.cuentaId],
      foreignColumns: [proveedores.id, proveedores.cuentaId],
    }).onDelete('cascade'),
    check('condiciones_dias_de_credito_rango', sql`${t.diasDeCredito} is null or ${t.diasDeCredito} between 0 and 365`),
    unique('condiciones_proveedor_unico').on(t.proveedorId),
    politicaPorCuenta(),
  ],
);
