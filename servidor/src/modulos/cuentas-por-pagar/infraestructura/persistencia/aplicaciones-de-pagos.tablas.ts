import { sql } from 'drizzle-orm';
import { boolean, check, index, numeric, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { llavesDeAplicacionDePago } from './aplicaciones-de-pagos.llaves.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';

/**
 * Cuánto entrega cada pago a cada cargo de su contraseña y qué retención descontó. La base garantiza que el cargo es del
 * proveedor y la empresa del pago, que está en su contraseña y que la retención se descuenta en un solo pago vigente.
 * Que el cargo esté autorizado, que el monto no pase del saldo y que la suma cuadre con el pago lo cuida el dominio.
 * Al eliminarse el documento (solo con pagos anulados) se van sus líneas.
 */
export const aplicacionesDePagos = esquemaCuentasPorPagar.table(
  'aplicaciones_de_pagos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Solo para las llaves compuestas. */
    proveedorId: uuid().notNull(),
    pagoId: uuid().notNull(),
    /** La contraseña del pago, para la llave hacia `contrasena_documentos`. */
    contrasenaId: uuid().notNull(),
    cargoId: uuid().notNull(),
    /** Lo que este pago entrega al proveedor por ese cargo. */
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    /** Las retenciones del cargo si este es su primer pago vigente; si no, 0. */
    retencionDescontada: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    /** Pasa a `false` al anular el pago. */
    vigente: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...llavesDeAplicacionDePago(t),
    check('aplicaciones_de_pagos_monto_positivo', sql`${t.monto} > 0`),
    check('aplicaciones_de_pagos_retencion_valida', sql`${t.retencionDescontada} >= 0`),
    unique('aplicaciones_de_pagos_par_unico').on(t.pagoId, t.cargoId),
    uniqueIndex('aplicaciones_de_pagos_retencion_una_vez')
      .on(t.cargoId)
      .where(sql`${t.vigente} and ${t.retencionDescontada} > 0`),
    index('aplicaciones_de_pagos_cargo_idx')
      .on(t.cargoId)
      .where(sql`${t.vigente}`),
    index('aplicaciones_de_pagos_contrasena_idx').on(t.contrasenaId, t.cargoId),
    index('aplicaciones_de_pagos_cargo_todas_idx').on(t.cargoId),
    politicaPorEmpresa(),
  ],
);
