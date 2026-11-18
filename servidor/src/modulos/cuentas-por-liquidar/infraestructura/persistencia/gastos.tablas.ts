import { boolean, date, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  idPrimario,
  marcasDeTiempo,
  politicaPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaCuentasPorLiquidar } from './esquema.tablas.js';
import { indicesDelGasto } from './gastos.indices.js';
import { llavesDelGasto } from './gastos.llaves.js';
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
    /** La pone la transacción; solo sirve para la llave al proveedor de la misma cuenta. */
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    /** Nulo: el documento está en la bandeja. */
    anticipoId: uuid(),
    clase: text().$type<'documento' | 'sin_documento'>().notNull(),
    documentoDeCompraId: uuid(),
    /** Siempre `cuentas-por-liquidar`: con él la llave al libro exige que el documento sea de este destino. */
    destinoDelDocumento: text().$type<'cuentas-por-liquidar'>().notNull().default('cuentas-por-liquidar'),
    resta: boolean().notNull().default(false),
    proveedorId: uuid(),
    fecha: date().notNull(),
    /** Lo que salió del anticipo: con retención (excepción CC-f) es el neto que pagó el beneficiario. */
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** Excepción de CC-f: factura con retención, que entera la empresa. Con permiso y motivo. */
    conRetencion: boolean().notNull().default(false),
    montoRetenido: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    motivoConRetencion: text(),
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
  (t) => [...llavesDelGasto(t), ...restriccionesDelGasto(t), ...indicesDelGasto(t), politicaPorEmpresa()],
);
