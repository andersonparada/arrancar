import { sql } from 'drizzle-orm';
import { boolean, check, integer, numeric, text, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/**
 * La conciliación de una cuenta con el estado de cuenta del banco, mes por mes.
 * Una sola por cuenta y mes. El usuario no escribe ningún saldo que entre al
 * cálculo: solo marca documentos y transcribe, solo para compararlo, el saldo final del
 * estado de cuenta. Flujo `en_proceso` → `elaborada` → `autorizada`; al autorizar se
 * congela la foto del cálculo (saldos y totales) y la cuenta queda conciliada
 * hasta el fin de ese mes. No se corrige: se elimina (solo la última) y se
 * vuelve a iniciar.
 */
export const conciliaciones = esquemaBancos.table(
  'conciliaciones',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaBancariaId: uuid()
      .references((): AnyPgColumn => cuentasBancarias.id)
      .notNull(),
    anio: integer().notNull(),
    mes: integer().notNull(),
    estado: text().$type<'en_proceso' | 'elaborada' | 'autorizada'>().notNull().default('en_proceso'),
    elaboradaPor: uuid(),
    elaboradaEn: timestamp({ withTimezone: true }),
    autorizadaPor: uuid(),
    autorizadaEn: timestamp({ withTimezone: true }),
    /** La foto del cálculo al autorizar; nula mientras no esté autorizada. */
    fotoSaldoSegunLibros: numeric({ precision: 14, scale: 2 }),
    fotoSaldoCalculadoEstadoDeCuenta: numeric({ precision: 14, scale: 2 }),
    fotoTotalChequesEnCirculacion: numeric({ precision: 14, scale: 2 }),
    fotoTotalOtrosDebitosEnTransito: numeric({ precision: 14, scale: 2 }),
    fotoTotalCreditosEnTransito: numeric({ precision: 14, scale: 2 }),
    /** Lo transcribe quien elabora; solo se compara con el calculado (puede ser negativo). */
    saldoEstadoDeCuenta: numeric({ precision: 14, scale: 2 }),
    /** Solo la migración de H2 la pone en `true`: elaboradas o autorizadas antes de pedir el saldo. */
    previaAlSaldoTranscrito: boolean().notNull().default(false),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('conciliaciones_cuenta_mes_unico').on(t.cuentaBancariaId, t.anio, t.mes),
    check('conciliaciones_mes_valido', sql`${t.mes} between 1 and 12`),
    check('conciliaciones_estado_valido', sql`${t.estado} in ('en_proceso', 'elaborada', 'autorizada')`),
    check(
      'conciliaciones_saldo_al_terminar',
      sql`${t.previaAlSaldoTranscrito} or ${t.estado} = 'en_proceso' or ${t.saldoEstadoDeCuenta} is not null`,
    ),
    check(
      'conciliaciones_saldo_coincide_al_autorizar',
      sql`${t.previaAlSaldoTranscrito} or ${t.estado} <> 'autorizada' or ${t.saldoEstadoDeCuenta} = ${t.fotoSaldoCalculadoEstadoDeCuenta}`,
    ),
    check('conciliaciones_previa_no_en_proceso', sql`not ${t.previaAlSaldoTranscrito} or ${t.estado} <> 'en_proceso'`),
    politicaPorEmpresa(),
  ],
);
