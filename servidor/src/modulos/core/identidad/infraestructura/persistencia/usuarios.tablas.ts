import { sql } from 'drizzle-orm';
import { boolean, check, index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../esquemas/core.esquema.js';
import { idPrimario, marcasDeTiempo } from '../../../base-datos/columnas.js';
import { empresas } from '../../../esquemas/empresas.esquema.js';

/**
 * Persona que inicia sesión. Entra con `usuario`: solo letras minúsculas, único
 * en todo el servidor y generado a partir de nombres y apellidos (ver
 * `identidad/dominio/nombre-de-usuario.ts`). El correo es opcional y solo sirve para
 * enviarle informes.
 */
export const usuarios = esquemaCore.table(
  'usuarios',
  {
    id: idPrimario(),
    usuario: text().notNull(),
    correo: text(),
    nombres: text().notNull(),
    apellidos: text().notNull().default(''),
    hashContrasena: text().notNull(),
    esSuperacceso: boolean().notNull().default(false),
    activo: boolean().notNull().default(true),
    ultimoAccesoEn: timestamp({ withTimezone: true }),
    ...marcasDeTiempo,
  },
  (t) => [
    uniqueIndex('usuarios_usuario_unico').on(t.usuario),
    check('usuarios_usuario_formato', sql`usuario ~ '^[a-z]{3,30}$'`),
  ],
);

/** Sesión web. Solo se guarda el hash SHA-256 del token que viaja en la cookie. */
export const sesiones = esquemaCore.table(
  'sesiones',
  {
    id: idPrimario(),
    hashToken: text().notNull().unique(),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    empresaActivaId: uuid().references(() => empresas.id, { onDelete: 'set null' }),
    direccionIp: text(),
    agenteUsuario: text(),
    expiraEn: timestamp({ withTimezone: true }).notNull(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sesiones_usuario_idx').on(t.usuarioId)],
);
