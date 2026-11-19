import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { deLaTransaccion, idPrimario, politicasDeSoloAgregarPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cheques } from './cheques.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/**
 * Cada vez que se imprime un cheque o su comprobante de egreso. Solo crece: guarda el formato resuelto que se usó. Un
 * solo `original` por cheque aunque dos personas impriman a la vez.
 */
export const impresionesDeCheques = esquemaBancos.table(
  'impresiones_de_cheques',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    chequeId: uuid()
      .notNull()
      .references((): AnyPgColumn => cheques.id),
    /** El movimiento impreso: tras pasar a otro formulario el cheque viejo conserva su historia. */
    movimientoId: uuid()
      .notNull()
      .references((): AnyPgColumn => movimientos.id),
    tipo: text().$type<'original' | 'reimpresion'>().notNull(),
    /** `false` = solo el comprobante. */
    conCheque: boolean().notNull().default(true),
    motivo: text(),
    loteId: uuid(),
    formato: jsonb().notNull(),
    impresoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    impresoPor: uuid().notNull().default(deLaTransaccion.usuario()),
  },
  (t) => [
    index('impresiones_de_cheques_cheque_idx').on(t.chequeId, t.impresoEn),
    index('impresiones_de_cheques_movimiento_idx').on(t.movimientoId),
    uniqueIndex('impresiones_de_cheques_un_original')
      .on(t.chequeId)
      .where(sql`${t.tipo} = 'original'`),
    check('impresiones_de_cheques_tipo_valido', sql`${t.tipo} in ('original', 'reimpresion')`),
    check(
      'impresiones_de_cheques_motivo_valido',
      sql`${t.tipo} = 'original' or coalesce(char_length(btrim(${t.motivo})) between 1 and 300, false)`,
    ),
    ...politicasDeSoloAgregarPorEmpresa(),
  ],
);
