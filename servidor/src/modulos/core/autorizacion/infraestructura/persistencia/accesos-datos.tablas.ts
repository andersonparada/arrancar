import { index, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { idPrimario, politicaPorEmpresa } from '../../../base-datos/columnas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';

/**
 * Registros concretos que un usuario puede usar dentro de un recurso con alcance
 * (p. ej. las cuentas bancarias 1 y 3). Lo consultan las políticas creadas con
 * `politicaPorAlcance`, así que la restricción la aplica PostgreSQL.
 */
export const accesosDatos = esquemaCore.table(
  'accesos_datos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    recurso: text().notNull(),
    registroId: uuid().notNull(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('accesos_datos_unico').on(t.usuarioId, t.recurso, t.registroId),
    index('accesos_datos_busqueda_idx').on(t.recurso, t.registroId, t.usuarioId),
    politicaPorEmpresa(),
  ],
);
