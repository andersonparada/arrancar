import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { deLaTransaccion, idPrimario, politicasDeSoloAgregar } from '../../../base-datos/columnas.js';
import { cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { AccionAuditada } from '../../aplicacion/auditoria.js';
import { esquemaCore } from './esquema-core.tablas.js';

/**
 * Bitácora de auditoría de la cuenta: borrados, inactivaciones, reactivaciones y
 * anulaciones. Solo se agrega y se lee (RLS no deja cambiarla ni borrarla). La
 * cuenta, la empresa y el usuario salen de la transacción.
 */
export const auditoria = esquemaCore.table(
  'auditoria',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    empresaId: uuid()
      .default(deLaTransaccion.empresa())
      .references(() => empresas.id, { onDelete: 'set null' }),
    usuarioId: uuid().default(deLaTransaccion.usuario()),
    recurso: text().notNull(),
    registroId: text().notNull(),
    accion: text().$type<AccionAuditada>().notNull(),
    motivo: text(),
    anterior: jsonb(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('auditoria_registro_idx').on(t.recurso, t.registroId),
    index('auditoria_cuenta_fecha_idx').on(t.cuentaId, t.creadoEn),
    ...politicasDeSoloAgregar(),
  ],
);
