import { sql } from 'drizzle-orm';
import { check, pgPolicy, text, timestamp } from 'drizzle-orm/pg-core';
import { rolAplicacion } from '../../../base-datos/columnas.js';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';

/**
 * Catálogo de la instalación: recursos cuya auditoría **no se depura** mientras exista la empresa
 * (`core.depurar_auditoria`). Lo escriben solo las migraciones, cada módulo con su recurso y la cita legal que lo
 * justifica en `motivo`.
 *
 * Solo tiene política de lectura: aunque el migrador le dé `insert`, `update` y `delete` a `arrancar_app`, RLS los
 * rechaza. Si la app pudiera borrar una fila, volvería depurable lo que debe conservarse.
 */
export const recursosDeAuditoriaPermanente = esquemaCore.table(
  'recursos_de_auditoria_permanente',
  {
    recurso: text().primaryKey(),
    motivo: text().notNull(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('recursos_de_auditoria_permanente_recurso_valido', sql`${t.recurso} ~ '^[a-z0-9-]+\\.[a-z0-9-]+$'`),
    check('recursos_de_auditoria_permanente_motivo_valido', sql`char_length(btrim(${t.motivo})) between 1 and 500`),
    pgPolicy('leer_el_catalogo', { as: 'permissive', for: 'select', to: rolAplicacion, using: sql`true` }),
  ],
);
