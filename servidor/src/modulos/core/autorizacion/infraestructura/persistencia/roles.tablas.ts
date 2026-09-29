import { boolean, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { idPrimario, marcasDeTiempo } from '../../../base-datos/columnas.js';
import { cuentas } from '../../../cuentas/infraestructura/persistencia/cuentas.tablas.js';

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
  (t) => [
    unique('roles_nombre_por_cuenta').on(t.cuentaId, t.nombre),
    /** Destino de la llave compuesta de `usuario_roles`: un usuario solo recibe roles de su cuenta. */
    unique('roles_id_cuenta_unico').on(t.id, t.cuentaId),
  ],
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
