import { boolean, char, index, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from './core.esquema.js';
import { idPrimario, marcasDeTiempo } from '../base-datos/columnas.js';
import { cuentas } from './cuentas.esquema.js';
import { monedas } from './monedas.esquema.js';
import { usuarios } from './usuarios.esquema.js';
import { roles } from '../autorizacion/infraestructura/persistencia/roles.tablas.js';

export const empresas = esquemaCore.table(
  'empresas',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    nit: text(),
    direccion: text(),
    telefono: text(),
    correo: text(),
    monedaBase: char({ length: 3 })
      .notNull()
      .default('GTQ')
      .references(() => monedas.codigo),
    activa: boolean().notNull().default(true),
    ...marcasDeTiempo,
  },
  (t) => [index('empresas_cuenta_idx').on(t.cuentaId)],
);

/** Acceso de un usuario a una empresa, con el rol que tiene en ella. */
export const empresaUsuarios = esquemaCore.table(
  'empresa_usuarios',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    rolId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.empresaId, t.usuarioId] }), index('empresa_usuarios_usuario_idx').on(t.usuarioId)],
);
