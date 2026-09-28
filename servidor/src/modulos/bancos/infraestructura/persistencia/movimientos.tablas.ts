import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';
import { transferencias } from './transferencias.tablas.js';

/**
 * Las notas de crédito y de débito de cada cuenta. El monto siempre es positivo
 * (el tipo dice la dirección) y nada se borra: se anula. Una sola nota de saldo
 * inicial vigente por cuenta. La seguridad por empresa (RLS) oculta las ajenas.
 */
export const movimientos = esquemaBancos.table(
  'movimientos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaBancariaId: uuid()
      .references((): AnyPgColumn => cuentasBancarias.id)
      .notNull(),
    tipo: text().$type<'credito' | 'debito' | 'cheque'>().notNull(),
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    saldoInicial: boolean().default(false).notNull(),
    referencia: text(),
    beneficiario: text(),
    observaciones: text(),
    anuladoEn: timestamp({ withTimezone: true }),
    motivoDeAnulacion: text(),
    /** La transferencia que la creó, si es una de sus dos notas. */
    transferenciaId: uuid().references((): AnyPgColumn => transferencias.id),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('movimientos_cuenta_fecha_idx').on(t.cuentaBancariaId, t.fecha),
    index('movimientos_transferencia_idx').on(t.transferenciaId),
    uniqueIndex('movimientos_un_saldo_inicial')
      .on(t.cuentaBancariaId)
      .where(sql`${t.saldoInicial} and ${t.anuladoEn} is null`),
    check('movimientos_monto_positivo', sql`${t.monto} > 0`),
    check('movimientos_tipo_valido', sql`${t.tipo} in ('credito', 'debito', 'cheque')`),
    politicaPorEmpresa(),
  ],
);
