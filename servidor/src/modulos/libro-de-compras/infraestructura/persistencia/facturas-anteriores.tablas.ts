import { date, numeric, text, uuid } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  idPrimario,
  marcasDeTiempo,
  politicaPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import {
  llavesDeFacturaAnterior,
  restriccionesDeMontosYFamilia,
  restriccionesDeTextosYValores,
} from './facturas-anteriores.restricciones.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/**
 * Una factura del sistema anterior que corrige una nota registrada en Arrancar (una fila por factura, no por nota):
 * guarda lo que la nota necesita para su cálculo fiscal y sus topes. Se crea con la primera nota que la cita. No es un
 * registro fiscal de Arrancar, así que no se edita ni se anula sola. Las restricciones viven en
 * `facturas-anteriores.restricciones.ts`.
 */
export const facturasAnteriores = esquemaLibroDeCompras.table(
  'facturas_anteriores',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    proveedorId: uuid().notNull(),
    /** Solo familias de factura que admiten notas. */
    tipo: text().$type<TipoDeDocumento>().notNull(),
    serie: text(),
    numero: text().notNull(),
    autorizacionFel: uuid(),
    fechaEmision: date().notNull(),
    total: numeric({ precision: 14, scale: 2 }).notNull(),
    iva: numeric({ precision: 14, scale: 2 }).notNull(),
    /** Notas de débito del sistema anterior sobre esta factura: suben el tope de las notas de crédito. */
    notasDeDebitoAnterioresTotal: numeric({ precision: 14, scale: 2 }).default('0').notNull(),
    notasDeDebitoAnterioresIva: numeric({ precision: 14, scale: 2 }).default('0').notNull(),
    /** Por qué no dio crédito fiscal; nulo si lo dio. La nota de crédito lo hereda. */
    motivoSinCredito: text(),
    /** Qué pasó; obligatorio con `otra_causa_sin_credito`. */
    detalleDelMotivo: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...restriccionesDeTextosYValores(t),
    ...restriccionesDeMontosYFamilia(t),
    ...llavesDeFacturaAnterior(t),
    politicaPorEmpresa(),
  ],
);
