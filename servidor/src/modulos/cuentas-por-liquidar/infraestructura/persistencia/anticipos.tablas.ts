import { boolean, date, foreignKey, integer, numeric, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { fechaDeAnulacionPosterior, restriccionesDeAnulacion } from '../../../core/base-datos/restricciones.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import { indicesDeAnticipo } from './anticipos.indices.js';
import {
  restriccionesDeLaEntrega,
  restriccionesDeLaLiquidacion,
  restriccionesDeLoNoLiquidado,
  restriccionesDeLosMontosLiquidados,
} from './anticipos.restricciones.js';
import { esquemaCuentasPorLiquidar } from './esquema.tablas.js';

export type DestinoDeLoNoLiquidado = 'cobrar' | 'renta_del_trabajo' | 'perdida';

/**
 * El dinero que la empresa entrega a una persona (un tercero de la cuenta, empleado o no) que debe justificarlo con
 * documentos. Su `id` es el documento de origen de la entrega, la devolución y el reembolso en Bancos. Al liquidar,
 * `monto + reembolsado = gastos + devuelto + no liquidado` (lo cuida el dominio con el anticipo bloqueado). No se
 * borra: se anula. Sin alcance por registro en esta versión: ve los anticipos quien tenga el permiso.
 */
export const anticipos = esquemaCuentasPorLiquidar.table(
  'anticipos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    /** Del correlativo `cuentas-por-liquidar.anticipos`. */
    numero: integer().notNull(),
    anioDeNumero: integer().notNull().default(0),
    /** El dominio exige que el tercero sea de la cuenta de la empresa. */
    beneficiarioId: uuid()
      .notNull()
      .references(() => terceros.id),
    /** El nombre como estaba al entregar. */
    beneficiario: text().notNull(),
    /** Decide si lo no liquidado puede ir a «renta del trabajo». */
    esEmpleado: boolean().notNull(),
    /** El usuario de Arrancar que es el beneficiario, si lo es (aviso si liquida él mismo). */
    beneficiarioUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    clase: text().$type<'viatico' | 'compra' | 'otro'>().notNull(),
    descripcion: text().notNull(),
    /** Informativa: dónde se usará el dinero. */
    localidadId: uuid(),
    /** La del cheque o la nota. */
    fecha: date().notNull(),
    fechaLimite: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    forma: text().$type<'cheque' | 'nota_de_debito'>().notNull(),
    movimientoId: uuid()
      .notNull()
      .references(() => movimientos.id),
    /** Por qué se entregó a quien tenía anticipos vencidos (con el permiso de excepción). */
    motivoConVencidos: text(),
    estado: text().$type<'abierto' | 'liquidado' | 'anulado'>().notNull().default('abierto'),
    fechaDeLiquidacion: date(),
    liquidadoEn: timestamp({ withTimezone: true }),
    liquidadoPor: uuid(),
    devuelto: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    movimientoDeDevolucionId: uuid().references(() => movimientos.id),
    reembolsado: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    movimientoDeReembolsoId: uuid().references(() => movimientos.id),
    noLiquidado: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    destinoDeNoLiquidado: text().$type<DestinoDeLoNoLiquidado>(),
    /** Solo al cobrar; el dominio pide 5 o más salvo pago voluntario. */
    cuotas: smallint(),
    motivoDeNoLiquidado: text(),
    fechaDeAnulacion: date(),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'anticipos_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    ...restriccionesDeLaEntrega(t),
    ...restriccionesDeLaLiquidacion(t),
    ...restriccionesDeLosMontosLiquidados(t),
    ...restriccionesDeLoNoLiquidado(t),
    ...restriccionesDeAnulacion('anticipos', t),
    fechaDeAnulacionPosterior('anticipos', t),
    ...indicesDeAnticipo(t),
    politicaPorEmpresa(),
  ],
);
