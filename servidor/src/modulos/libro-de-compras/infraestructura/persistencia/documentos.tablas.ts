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
import {
  indicesDeDocumento,
  llavesDeDocumento,
  restriccionesDeFueraDelLibro,
  restriccionesDeMontos,
  restriccionesDeTextos,
  restriccionesDePeriodo,
  restriccionesDeTipo,
  restriccionesDeValores,
} from './documentos.restricciones.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/**
 * El encabezado de un documento de compra (factura, factura de pequeño contribuyente, nota de crédito o recibo),
 * con sus totales ya calculados y fijos. Sin edición: se anula o se elimina. La seguridad por empresa (RLS)
 * oculta los de otras empresas; la cuenta se usa solo para la llave foránea hacia el proveedor.
 * Las restricciones viven en `documentos.restricciones.ts`.
 */
export const documentos = esquemaLibroDeCompras.table(
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
    tipo: text().$type<'factura' | 'factura_pequeno_contribuyente' | 'nota_de_credito' | 'recibo'>().notNull(),
    proveedorId: uuid().notNull(),
    nitEmisor: text(),
    nombreEmisor: text().notNull(),
    nitReceptor: text(),
    serie: text(),
    numero: text().notNull(),
    autorizacionFel: uuid(),
    fechaEmision: date().notNull(),
    fechaRecepcion: date().notNull(),
    periodo: date().notNull(),
    muestraEnReportesSat: boolean().default(true).notNull(),
    motivoFueraDelLibro: text().$type<'sin_fel' | 'fel_a_consumidor_final' | 'fel_a_otro_nit'>(),
    motivoSinCredito: text(),
    documentoAfectadoId: uuid(),
    destino: text().$type<'cuentas-por-pagar' | 'caja-chica' | 'cuentas-por-liquidar'>().notNull(),
    procesadoEnDestinoEn: timestamp({ withTimezone: true }),
    total: numeric({ precision: 14, scale: 2 }).notNull(),
    base: numeric({ precision: 14, scale: 2 }).notNull(),
    iva: numeric({ precision: 14, scale: 2 }).notNull(),
    ivaNoAcreditable: numeric({ precision: 14, scale: 2 }).notNull(),
    idp: numeric({ precision: 14, scale: 2 }).notNull(),
    exento: numeric({ precision: 14, scale: 2 }).notNull(),
    observaciones: text(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    causaDeAnulacion: text().$type<'error_de_captura' | 'fel_anulada_por_el_emisor' | 'no_corresponde_a_la_empresa'>(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...restriccionesDeValores(t),
    ...restriccionesDeTextos(t),
    ...restriccionesDeMontos(t),
    ...restriccionesDePeriodo(t),
    ...restriccionesDeTipo(t),
    ...restriccionesDeFueraDelLibro(t),
    ...llavesDeDocumento(t),
    ...indicesDeDocumento(t),
    politicaPorEmpresa(),
  ],
);
