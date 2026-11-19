import { sql } from 'drizzle-orm';
import { boolean, check, integer, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo } from '../../../base-datos/columnas.js';
import { bytea } from '../../../base-datos/bytea.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';

export const RESULTADOS_DE_PRUEBA = ['enviado', 'temporal', 'permanente', 'autenticacion'] as const;

/**
 * El servidor de correo de la instalación: una sola fila (`id` es siempre `true`). No es de una empresa ni de
 * una cuenta, así que no lleva `empresa_id` ni RLS por empresa: la lee el trabajador de la bandeja y la escribe
 * solo Soporte. La contraseña va cifrada con AES-256-GCM y una llave que **no** está en la base (`CLAVE_SECRETOS`).
 * No admite conexión sin cifrado: solo `tls_directo` (465) y `starttls` (587).
 */
export const servidorDeCorreo = esquemaCore.table(
  'servidor_de_correo',
  {
    id: boolean().primaryKey().default(true),
    servidor: text().notNull(),
    puerto: integer().notNull().default(587),
    seguridad: text().notNull().default('starttls'),
    usuario: text().notNull(),
    contrasenaCifrada: bytea(),
    iv: bytea(),
    versionDeClave: smallint(),
    remitenteDireccion: text().notNull(),
    remitenteNombre: text().notNull(),
    activo: boolean().notNull().default(false),
    ultimaPruebaEn: timestamp({ withTimezone: true }),
    ultimaPruebaResultado: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    check('servidor_de_correo_fila_unica', sql`${t.id}`),
    check('servidor_de_correo_servidor_largo', sql`char_length(${t.servidor}) between 1 and 253`),
    check('servidor_de_correo_puerto_valido', sql`${t.puerto} in (465, 587)`),
    check('servidor_de_correo_seguridad_valida', sql`${t.seguridad} in ('tls_directo', 'starttls')`),
    check('servidor_de_correo_seguridad_del_puerto', sql`(${t.puerto} = 465) = (${t.seguridad} = 'tls_directo')`),
    check('servidor_de_correo_usuario_largo', sql`char_length(${t.usuario}) between 1 and 254`),
    check(
      'servidor_de_correo_secreto_completo',
      sql`(${t.contrasenaCifrada} is null) = (${t.iv} is null) and (${t.iv} is null) = (${t.versionDeClave} is null)`,
    ),
    check('servidor_de_correo_iv_largo', sql`${t.iv} is null or octet_length(${t.iv}) = 12`),
    check('servidor_de_correo_remitente_largo', sql`char_length(${t.remitenteDireccion}) between 3 and 254`),
    check('servidor_de_correo_remitente_nombre_largo', sql`char_length(${t.remitenteNombre}) between 1 and 80`),
    check('servidor_de_correo_activo_con_contrasena', sql`not ${t.activo} or ${t.contrasenaCifrada} is not null`),
    check(
      'servidor_de_correo_resultado_de_prueba_valido',
      sql`${t.ultimaPruebaResultado} is null or ${t.ultimaPruebaResultado} in ('enviado', 'temporal', 'permanente', 'autenticacion')`,
    ),
  ],
);
