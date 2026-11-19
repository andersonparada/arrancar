import { sql } from 'drizzle-orm';
import { bigint, check, index, jsonb, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { deLaTransaccion, politicasDeSoloAgregarPorEmpresa } from '../../../base-datos/columnas.js';
import { cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { esquemaCore } from './esquema-core.tablas.js';

/**
 * Registro de los eventos de dominio de cada empresa, escrito en la misma transacción que el hecho que los causó:
 * si esa se deshace, el evento no queda. Solo se agrega y se lee (RLS y privilegios no dejan cambiarlo ni borrarlo)
 * y no se depura mientras exista la empresa: es la fuente de la contabilidad. `numero` da el orden global de llegada
 * para reprocesar en orden. La cuenta, la empresa y el usuario salen de la transacción.
 */
export const registroDeEventos = esquemaCore.table(
  'registro_de_eventos',
  {
    id: uuid().primaryKey(),
    numero: bigint({ mode: 'number' }).notNull().generatedAlwaysAsIdentity(),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    empresaId: uuid()
      .notNull()
      .default(deLaTransaccion.empresa())
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    version: smallint().notNull(),
    datos: jsonb().notNull(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull(),
    usuarioId: uuid().default(deLaTransaccion.usuario()),
  },
  (t) => [
    index('registro_de_eventos_empresa_nombre_idx').on(t.empresaId, t.nombre, t.numero),
    index('registro_de_eventos_empresa_numero_idx').on(t.empresaId, t.numero),
    check('registro_de_eventos_nombre_valido', sql`${t.nombre} ~ '^[a-z0-9-]+\\.[a-z_]+$'`),
    check('registro_de_eventos_version_valida', sql`${t.version} >= 1`),
    ...politicasDeSoloAgregarPorEmpresa(),
  ],
);
