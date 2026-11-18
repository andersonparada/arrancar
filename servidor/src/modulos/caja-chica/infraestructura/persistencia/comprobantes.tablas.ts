import { boolean, date, integer, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { politicaPorAlcanceOpcional } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { fechaDeAnulacionPosterior, restriccionesDeAnulacion } from '../../../core/base-datos/restricciones.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import { llavesDeComprobante } from './comprobantes.llaves.js';
import { indicesDeComprobante } from './comprobantes.indices.js';
import {
  restriccionesDeLaClase,
  restriccionesDeMarcas,
  restriccionesDelValeDeGasto,
} from './comprobantes.restricciones.js';
import { esquemaCajaChica } from './esquema.tablas.js';

export type ClaseDeComprobante = 'documento' | 'vale_de_gasto' | 'faltante' | 'sobrante';

/**
 * Lo que gasta o desajusta el fondo: un documento del libro de compras, un vale de gasto (sin factura), el faltante o
 * el sobrante de un arqueo. Un documento sin `fondo_id` está en la bandeja, esperando que lo asignen. «Repuesto» no es
 * una columna: es tener una fila vigente en `reposicion_comprobantes`. `resta` es verdadero en las notas de crédito y
 * los sobrantes, que bajan lo pendiente de reponer.
 */
export const comprobantes = esquemaCajaChica.table(
  'comprobantes',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fondoId: uuid(),
    clase: text().$type<ClaseDeComprobante>().notNull(),
    documentoDeCompraId: uuid().references(() => documentos.id),
    resta: boolean().notNull().default(false),
    /** Copiada del libro al recibir el documento. */
    esNotaDeCredito: boolean().notNull().default(false),
    /** El comprobante de la factura que rebaja la nota (del mismo fondo). */
    documentoAfectadoId: uuid(),
    proveedorId: uuid().references(() => proveedores.id),
    /** La del gasto: por omisión la emisión del documento. */
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    conActivoFijo: boolean().notNull().default(false),
    /** Solo vales de gasto, del correlativo `caja-chica.vales`. */
    numero: integer(),
    anioDeNumero: integer().notNull().default(0),
    descripcion: text(),
    pagadoA: text(),
    conceptoDeGastoId: uuid(),
    motivoSinDocumento: text(),
    sobreElTope: boolean().notNull().default(false),
    motivoSobreElTope: text(),
    /** Marca de bancarización: el efectivo pasó del umbral con el proveedor en el mes. */
    sinBancarizar: boolean().notNull().default(false),
    motivoSinBancarizar: text(),
    arqueoId: uuid(),
    destinoDelFaltante: text().$type<'perdida' | 'cobrar_al_custodio'>(),
    valeProvisionalId: uuid(),
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
  (t) => [
    ...llavesDeComprobante(t),
    ...restriccionesDeLaClase(t),
    ...restriccionesDelValeDeGasto(t),
    ...restriccionesDeMarcas(t),
    ...restriccionesDeAnulacion('comprobantes', t),
    fechaDeAnulacionPosterior('comprobantes', t),
    ...indicesDeComprobante(t),
    politicaPorEmpresa(),
    politicaPorAlcanceOpcional(ALCANCE_DE_FONDOS, 'fondo_id'),
  ],
);
