import { sql } from 'drizzle-orm';
import { boolean, check, integer, text, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { chequeras } from './chequeras.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/**
 * Cada cheque de una chequera, único por número dentro de ella. Nace
 * `disponible`; al emitirse queda enlazado a su movimiento (`movimiento_id`) y
 * al anularse conserva su número (no se vuelve a usar).
 */
export const cheques = esquemaBancos.table(
  'cheques',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    chequeraId: uuid()
      .references((): AnyPgColumn => chequeras.id)
      .notNull(),
    numero: integer().notNull(),
    estado: text().$type<'disponible' | 'emitido' | 'anulado'>().default('disponible').notNull(),
    noNegociable: boolean().default(true).notNull(),
    movimientoId: uuid().references((): AnyPgColumn => movimientos.id),
    anuladoEn: timestamp({ withTimezone: true }),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('cheques_chequera_numero_unico').on(t.chequeraId, t.numero),
    check('cheques_estado_valido', sql`${t.estado} in ('disponible', 'emitido', 'anulado')`),
    politicaPorEmpresa(),
  ],
);
