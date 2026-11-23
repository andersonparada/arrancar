import { boolean, char, index, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import {
  autoria,
  idPrimario,
  marcasDeTiempo,
  politicasDeEscrituraPorCuenta,
  politicasDeEscrituraPorCuentaDe,
} from '../../../base-datos/columnas.js';
import { cuentas } from './cuentas.tablas.js';
import { monedas } from '../../../monedas/infraestructura/persistencia/monedas.tablas.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';

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
    ...autoria,
  },
  (t) => [
    index('empresas_cuenta_idx').on(t.cuentaId),
    /** Para las llaves compuestas `(empresa_id, cuenta_id)` de otros módulos: la cuenta no puede ser otra (A-9). */
    unique('empresas_id_cuenta_unico').on(t.id, t.cuentaId),
    ...politicasDeEscrituraPorCuenta({ sinBorrar: true, lecturaPorCuenta: true }),
  ],
);

/** En qué empresas trabaja un usuario. Sus roles y permisos son de la cuenta (`usuario_roles`, `usuario_permisos`). */
export const empresaUsuarios = esquemaCore.table(
  'empresa_usuarios',
  {
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.empresaId, t.usuarioId] }),
    index('empresa_usuarios_usuario_idx').on(t.usuarioId),
    ...politicasDeEscrituraPorCuentaDe('core.empresas', 'empresa_id'),
  ],
);
