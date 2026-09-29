import { sql } from 'drizzle-orm';
import { check, foreignKey, index, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo } from '../../../base-datos/columnas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { roles } from './roles.tablas.js';

/**
 * Roles que un usuario tiene en una cuenta: valen en todas las empresas de la cuenta
 * donde trabaja. Sin seguridad por filas (como `roles`): la sesión la lee antes de
 * saber la empresa activa, así que cada consulta filtra por `cuenta_id`.
 */
export const usuarioRoles = esquemaCore.table(
  'usuario_roles',
  {
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    rolId: uuid().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ columns: [t.cuentaId, t.usuarioId, t.rolId] }),
    index('usuario_roles_rol_idx').on(t.rolId),
    foreignKey({
      name: 'usuario_roles_rol_de_la_cuenta_fk',
      columns: [t.rolId, t.cuentaId],
      foreignColumns: [roles.id, roles.cuentaId],
    }).onDelete('restrict'),
  ],
);

/**
 * Permisos que se suman a los de los roles de un usuario en una cuenta. Solo suman:
 * no hay permisos negados. Sin seguridad por filas; se filtra por `cuenta_id`.
 */
export const usuarioPermisos = esquemaCore.table(
  'usuario_permisos',
  {
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    permiso: text().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    primaryKey({ columns: [t.cuentaId, t.usuarioId, t.permiso] }),
    index('usuario_permisos_permiso_idx').on(t.permiso),
    check('usuario_permisos_formato', sql`${t.permiso} ~ '^[a-z0-9-]+(\\.[a-z0-9-]+)+$'`),
  ],
);
