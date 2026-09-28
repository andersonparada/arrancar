import { sql } from 'drizzle-orm';
import { check, integer, numeric, text, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/**
 * La conciliación de una cuenta con el estado de cuenta del banco, mes por mes.
 * Una sola por cuenta y mes. El usuario no escribe ningún saldo: solo marca
 * documentos. Flujo `en_proceso` → `elaborada` → `autorizada`; al autorizar se
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
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('conciliaciones_cuenta_mes_unico').on(t.cuentaBancariaId, t.anio, t.mes),
    check('conciliaciones_mes_valido', sql`${t.mes} between 1 and 12`),
    check('conciliaciones_estado_valido', sql`${t.estado} in ('en_proceso', 'elaborada', 'autorizada')`),
    politicaPorEmpresa(),
  ],
);
