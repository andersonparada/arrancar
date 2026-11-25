import { boolean, char, date, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  idPrimario,
  marcasDeTiempo,
  politicaPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { monedas } from '../../../core/monedas/infraestructura/persistencia/monedas.tablas.js';
import type { DestinoDeDocumentoDeVenta } from '../../../core/contratos/libro-de-ventas.contratos.js';
import type { CausaDeAnulacion } from '../../dominio/baja-de-documento.js';
import type { TipoDeIdentificacion } from '../../dominio/receptor.js';
import type { RegimenDeIsr, RegimenDeIva } from '../../dominio/regimen-de-la-empresa.js';
import type { TipoDeDocumento, TipoDte } from '../../dominio/tipos-de-documento.js';
import {
  indicesDeDocumento,
  llavesDeDocumento,
  restriccionesDeAnulacion,
  restriccionesDeMontos,
  restriccionesDeNotas,
  restriccionesDeReceptor,
  restriccionesDeTextos,
  restriccionesDeValores,
} from './documentos.restricciones.js';
import { esquemaLibroDeVentas } from './esquema.tablas.js';

/**
 * El encabezado de un documento de venta (factura, nota, recibo o la factura especial que emite el comprador), con sus
 * totales fijos. Sin edición: se anula o se elimina. La seguridad por empresa (RLS) oculta los de otras empresas; la
 * cuenta se usa solo para la llave hacia el cliente. Las restricciones viven en `documentos.restricciones.ts`.
 */
export const documentos = esquemaLibroDeVentas.table(
  'documentos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    tipo: text().$type<TipoDeDocumento>().notNull(),
    /** Código SAT del DTE (FACT, NCRE…); nulo en un documento de papel. */
    tipoDte: text().$type<TipoDte>(),
    /** Cómo entró: `manual` hoy; `bandeja_sat` desde LV-4 y `fel` si algún día Arrancar emite. */
    origen: text().$type<'manual' | 'bandeja_sat' | 'fel'>().notNull().default('manual'),
    clienteId: uuid(),
    tipoDeIdentificacion: text().$type<TipoDeIdentificacion>().notNull(),
    nitReceptor: text().notNull(),
    nombreReceptor: text().notNull(),
    serie: text(),
    numero: text().notNull(),
    autorizacionFel: uuid(),
    localidadId: uuid(),
    fechaEmision: date().notNull(),
    periodo: date().notNull(),
    /** El régimen de la empresa en el mes del documento, copiado al registrar (no cambia después). */
    regimenIvaDeLaEmpresa: text().$type<RegimenDeIva>().notNull(),
    regimenIsrDeLaEmpresa: text().$type<RegimenDeIsr>(),
    documentoAfectadoId: uuid(),
    /** La factura del sistema anterior que corrige una nota: serie (opcional), número y fecha. */
    facturaAnteriorSerie: text(),
    facturaAnteriorNumero: text(),
    facturaAnteriorFecha: date(),
    destino: text().$type<DestinoDeDocumentoDeVenta>(),
    procesadoEnDestinoEn: timestamp({ withTimezone: true }),
    muestraEnReportesSat: boolean().notNull().default(true),
    moneda: char({ length: 3 })
      .notNull()
      .default('GTQ')
      .references(() => monedas.codigo),
    tipoDeCambio: numeric({ precision: 16, scale: 8 }).notNull().default('1'),
    fechaDelTipoDeCambio: date(),
    totalEnMoneda: numeric({ precision: 14, scale: 2 }).notNull(),
    total: numeric({ precision: 14, scale: 2 }).notNull(),
    gravadoBienes: numeric({ precision: 14, scale: 2 }).notNull(),
    gravadoServicios: numeric({ precision: 14, scale: 2 }).notNull(),
    exento: numeric({ precision: 14, scale: 2 }).notNull(),
    exportacion: numeric({ precision: 14, scale: 2 }).notNull(),
    iva: numeric({ precision: 14, scale: 2 }).notNull(),
    otrosImpuestos: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    observaciones: text(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    causaDeAnulacion: text().$type<CausaDeAnulacion>(),
    /** La fecha de la anulación en la SAT, o la del día en que se anuló el registro. */
    fechaDeAnulacion: date(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...restriccionesDeValores(t),
    ...restriccionesDeTextos(t),
    ...restriccionesDeReceptor(t),
    ...restriccionesDeMontos(t),
    ...restriccionesDeNotas(t),
    ...restriccionesDeAnulacion(t),
    ...llavesDeDocumento(t),
    ...indicesDeDocumento(t),
    politicaPorEmpresa(),
  ],
);
