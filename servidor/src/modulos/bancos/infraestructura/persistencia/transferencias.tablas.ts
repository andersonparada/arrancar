import { sql } from 'drizzle-orm';
import { check, date, index, numeric, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/**
 * Transferencias entre dos cuentas propias de la misma empresa. No se corrigen:
 * se anulan (junto a sus dos notas en `bancos.movimientos`) y se registra otra.
 */
export const transferencias = esquemaBancos.table(
  'transferencias',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaOrigenId: uuid()
      .references((): AnyPgColumn => cuentasBancarias.id)
      .notNull(),
    cuentaDestinoId: uuid()
      .references((): AnyPgColumn => cuentasBancarias.id)
      .notNull(),
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    referencia: text(),
    observaciones: text(),
    anuladaEn: timestamp({ withTimezone: true }),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('transferencias_origen_idx').on(t.cuentaOrigenId),
    index('transferencias_destino_idx').on(t.cuentaDestinoId),
    check('transferencias_monto_positivo', sql`${t.monto} > 0`),
    check('transferencias_cuentas_distintas', sql`${t.cuentaOrigenId} <> ${t.cuentaDestinoId}`),
    politicaPorEmpresa(),
  ],
);
