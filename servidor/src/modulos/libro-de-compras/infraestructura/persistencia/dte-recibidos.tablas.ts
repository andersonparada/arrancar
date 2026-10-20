import { boolean, date, jsonb, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  idPrimario,
  marcasDeTiempo,
  politicaPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EstadoDeDte, EstadoDeDteEnLaSat, MotivoDeBloqueo } from '../../dominio/estado-de-dte.js';
import type { TipoDte } from '../../dominio/tipos-de-documento.js';
import {
  indicesDeDteRecibido,
  llavesDeDteRecibido,
  llavesDeLoRegistrado,
  restriccionesDelBorrador,
  restriccionesDelDte,
  restriccionesDelEstado,
} from './dte-recibidos.restricciones.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

const monto = () => numeric({ precision: 14, scale: 2 });

/**
 * La bandeja de DTE recibidos: una fila por DTE, con sus datos tal como los dice la SAT, su estado en la SAT, su
 * estado en la bandeja y lo que el usuario completa antes de registrarlo. Nunca se borra (solo en cascada con la
 * empresa). La cuenta se usa solo para la llave foránea hacia el proveedor.
 * Las restricciones viven en `dte-recibidos.restricciones.ts`.
 */
export const dteRecibidos = esquemaLibroDeCompras.table(
  'dte_recibidos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    autorizacionFel: uuid().notNull(),
    tipoDte: text().$type<TipoDte>().notNull(),
    serie: text().notNull(),
    numero: text().notNull(),
    fechaEmision: date().notNull(),
    nitEmisor: text().notNull(),
    nombreEmisor: text().notNull(),
    nitReceptor: text().notNull(),
    total: monto().notNull(),
    iva: monto().notNull(),
    idp: monto().notNull().default('0'),
    otrosImpuestos: monto().notNull().default('0'),
    otrosImpuestosDetalle: jsonb().$type<Record<string, string>>().notNull().default({}),
    filaOriginal: jsonb().$type<Record<string, string>>().notNull(),
    estadoSat: text().$type<EstadoDeDteEnLaSat>().notNull(),
    anuladoEnLaSatEl: date(),
    loteId: uuid().notNull(),
    primerLoteId: uuid().notNull(),
    estado: text().$type<EstadoDeDte>().notNull().default('pendiente'),
    documentoId: uuid(),
    motivoDeDescarte: text(),
    descartadoEn: timestamp({ withTimezone: true }),
    descartadoPor: uuid(),
    motivoDeBloqueo: text().$type<MotivoDeBloqueo>(),
    proveedorId: uuid(),
    conceptoId: uuid(),
    destino: text().$type<'cuentas-por-pagar' | 'caja-chica' | 'cuentas-por-liquidar'>(),
    fechaRecepcion: date(),
    periodo: date(),
    noVinculado: boolean().notNull().default(false),
    documentoAfectadoId: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    ...restriccionesDelDte(t),
    ...restriccionesDelEstado(t),
    ...restriccionesDelBorrador(t),
    ...llavesDeDteRecibido(t),
    ...llavesDeLoRegistrado(t),
    ...indicesDeDteRecibido(t),
    politicaPorEmpresa(),
  ],
);
