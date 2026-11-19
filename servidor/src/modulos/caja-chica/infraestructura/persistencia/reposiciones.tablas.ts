import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { fondos } from './fondos.tablas.js';
import { restriccionesDeEstadoDeLaReposicion, restriccionesDeLaReposicion } from './reposiciones.restricciones.js';

/**
 * Una reposición: el cheque o la nota de Bancos que devuelve al fondo lo que se gastó, con los comprobantes que cubre
 * (`reposicion_comprobantes`). Su `id` es el documento de origen del movimiento. La `compensada_al_cerrar` no tiene
 * movimiento: liquida lo pendiente al cerrar el fondo. No se borra: se anula.
 */
export const reposiciones = esquemaCajaChica.table(
  'reposiciones',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fondoId: uuid().notNull(),
    /** Del correlativo `caja-chica.reposiciones`. */
    numero: integer().notNull(),
    anioDeNumero: integer().notNull().default(0),
    fecha: date().notNull(),
    forma: text().$type<'cheque' | 'nota_de_debito' | 'compensada_al_cerrar'>().notNull(),
    /** La suma firmada de sus comprobantes (la cuida el dominio). */
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    movimientoId: uuid().references(() => movimientos.id),
    /** El custodio vigente al reponer, para la impresión. */
    custodio: text().notNull(),
    laHizoElCustodio: boolean().notNull().default(false),
    estado: text().$type<'vigente' | 'anulada'>().notNull().default('vigente'),
    fechaDeAnulacion: date(),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'reposiciones_fondo_fk',
      columns: [t.fondoId, t.empresaId],
      foreignColumns: [fondos.id, fondos.empresaId],
    }),
    ...restriccionesDeLaReposicion(t),
    ...restriccionesDeEstadoDeLaReposicion(t),
    unique('reposiciones_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    // Destino de las llaves de `reposicion_comprobantes`: la reposición y el comprobante son del mismo fondo.
    unique('reposiciones_llave_unica').on(t.id, t.empresaId, t.fondoId),
    uniqueIndex('reposiciones_movimiento_unico')
      .on(t.movimientoId)
      .where(sql`${t.movimientoId} is not null`),
    index('reposiciones_fondo_idx').on(t.fondoId, t.fecha),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_FONDOS, 'fondo_id'),
  ],
);
