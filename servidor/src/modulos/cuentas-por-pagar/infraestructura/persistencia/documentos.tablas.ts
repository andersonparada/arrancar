import { boolean, date, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EstadoDeDocumento, OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import {
  indicesDeDocumento,
  llavesDeDocumento,
  restriccionesDeEstado,
  restriccionesDeValores,
} from './documentos.restricciones.js';
import {
  indicesDeSaldoInicial,
  llavesDeSaldoInicial,
  restriccionesDeSaldoInicial,
  restriccionesDeTextoYEstado,
} from './documentos.restricciones-de-saldos.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';

/**
 * Un documento por pagar: de Libro de compras (facturas y demás cargos, y notas de crédito, que son abonos) o un saldo
 * inicial (`origen = 'saldo_inicial'`, sin documento en el libro). El del libro nace en la orden `recibir_documento`. Los saldos no se guardan: se calculan. Las restricciones viven en `documentos.restricciones.ts`; la llave hacia la factura de una nota
 * (`documentos_factura_fk`) va a mano en la migración.
 */
export const documentos = esquemaCuentasPorPagar.table(
  'documentos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    origen: text().$type<OrigenDeDocumento>().notNull().default('libro_de_compras'),
    /** El documento de Libro de compras; nulo en un saldo inicial. */
    documentoId: uuid(),
    /** Serie y número del documento: copiados del libro al recibir, o escritos en un saldo inicial. */
    serie: text(),
    numero: text().notNull(),
    /** Solo existe para la llave compuesta hacia Libro de compras. */
    destino: text().notNull().default('cuentas-por-pagar'),
    tipo: text().$type<TipoDeDocumento>().notNull(),
    proveedorId: uuid().notNull(),
    /** La factura (id de Libro de compras) de una nota de crédito o de débito. */
    documentoAfectadoId: uuid(),
    fechaEmision: date().notNull(),
    total: numeric({ precision: 14, scale: 2 }).notNull(),
    retenciones: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    /** Solo el saldo inicial: lo que faltaba pagar al corte, sin retenciones. */
    saldoAlInicio: numeric({ precision: 14, scale: 2 }),
    /** Solo el saldo inicial: retenciones que la empresa todavía no practicó (informativa). */
    retencionesPorPracticar: numeric({ precision: 14, scale: 2 }),
    /** Solo el saldo inicial: cómo se llama el documento en el sistema anterior. */
    referencia: text(),
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
    ...restriccionesDeSaldoInicial(t),
    ...restriccionesDeTextoYEstado(t),
    ...llavesDeSaldoInicial(t),
    ...indicesDeSaldoInicial(t),
    politicaPorEmpresa(),
  ],
);
