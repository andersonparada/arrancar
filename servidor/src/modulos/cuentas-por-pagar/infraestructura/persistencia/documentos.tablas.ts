import { boolean, date, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EstadoDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import {
  indicesDeDocumento,
  llavesDeDocumento,
  restriccionesDeEstado,
  restriccionesDeValores,
} from './documentos.restricciones.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';

/**
 * Un documento de Libro de compras que va a Cuentas por pagar: facturas y demás cargos, y notas de crédito (abonos).
 * Nace en la orden `recibir_documento`. Los saldos no se guardan: se calculan. Serie, número y emisor se leen del
 * documento del libro. Las restricciones viven en `documentos.restricciones.ts`; la llave hacia la factura de una nota
 * (`documentos_factura_fk`) va a mano en la migración.
 */
export const documentos = esquemaCuentasPorPagar.table(
  'documentos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** El documento de Libro de compras. */
    documentoId: uuid().notNull(),
    /** Solo existe para la llave compuesta hacia Libro de compras. */
    destino: text().notNull().default('cuentas-por-pagar'),
    tipo: text().$type<TipoDeDocumento>().notNull(),
    proveedorId: uuid().notNull(),
    /** La factura (id de Libro de compras) de una nota de crédito o de débito. */
    documentoAfectadoId: uuid(),
    fechaEmision: date().notNull(),
    total: numeric({ precision: 14, scale: 2 }).notNull(),
    retenciones: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    tieneActivoFijo: boolean().notNull().default(false),
    vencimiento: date(),
    estado: text().$type<EstadoDeDocumento>().notNull().default('pendiente'),
    registradoEn: timestamp({ withTimezone: true }),
    registradoPor: uuid(),
    autorizadoEn: timestamp({ withTimezone: true }),
    autorizadoPor: uuid(),
    autorizacionPropia: boolean().notNull().default(false),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    estabaAutorizado: boolean(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...restriccionesDeValores(t),
    ...restriccionesDeEstado(t),
    ...llavesDeDocumento(t),
    ...indicesDeDocumento(t),
    politicaPorEmpresa(),
  ],
);
