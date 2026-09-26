import { boolean, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from './core.esquema.js';
import { idPrimario, marcasDeTiempo } from '../base-datos/columnas.js';
import { cuentas } from './cuentas.esquema.js';

/**
 * Rol definido por cada cuenta. Con `accesoTotal` el rol recibe todos los permisos,
 * incluidos los de módulos que se activen más adelante.
 */
export const roles = esquemaCore.table(
  'roles',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    descripcion: text(),
    accesoTotal: boolean().notNull().default(false),
    ...marcasDeTiempo,
  },
  (t) => [unique('roles_nombre_por_cuenta').on(t.cuentaId, t.nombre)],
);

export const rolPermisos = esquemaCore.table(
  'rol_permisos',
  {
    rolId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permiso: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.rolId, t.permiso] })],
);
