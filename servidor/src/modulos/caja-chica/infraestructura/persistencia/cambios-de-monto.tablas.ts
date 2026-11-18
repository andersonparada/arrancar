import { date, foreignKey, numeric, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import {
  indicesDelCambioDeMonto,
  restriccionesDeEstadoDelCambio,
  restriccionesDelTipoDelCambio,
} from './cambios-de-monto.restricciones.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { fondos } from './fondos.tablas.js';

export type TipoDeCambioDeMonto = 'apertura' | 'aumento' | 'disminucion' | 'cierre';
export type FormaDeCambioDeMonto = 'cheque' | 'nota_de_debito' | 'nota_de_credito' | 'saldo_inicial' | 'sin_deposito';

/**
 * Cada vez que cambia el dinero del fondo: la apertura, los aumentos, las disminuciones y el depósito del cierre.
 * El monto del fondo es la suma de los vigentes (apertura y aumentos suman; disminuciones, no). Cada uno apunta al
 * cheque o la nota de Bancos que lo movió, salvo el saldo inicial y el cierre sin nada que depositar.
 */
export const cambiosDeMonto = esquemaCajaChica.table(
  'cambios_de_monto',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fondoId: uuid().notNull(),
    tipo: text().$type<TipoDeCambioDeMonto>().notNull(),
    forma: text().$type<FormaDeCambioDeMonto>().notNull(),
    fecha: date().notNull(),
    /** En el cierre es lo que se depositó (puede ser 0); en los demás, mayor que 0. */
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    movimientoId: uuid().references(() => movimientos.id),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    fechaDeAnulacion: date(),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'cambios_fondo_fk',
      columns: [t.fondoId, t.empresaId],
      foreignColumns: [fondos.id, fondos.empresaId],
    }),
    ...restriccionesDelTipoDelCambio(t),
    ...restriccionesDeEstadoDelCambio(t),
    ...indicesDelCambioDeMonto(t),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_FONDOS, 'fondo_id'),
  ],
);
