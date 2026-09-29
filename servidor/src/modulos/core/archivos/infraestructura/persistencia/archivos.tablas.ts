import { sql } from 'drizzle-orm';
import { check, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../compartido/infraestructura/persistencia/esquema-core.tablas.js';
import { idPrimario, politicaPorEmpresa } from '../../../base-datos/columnas.js';
import { empresas } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';

/**
 * Archivo subido por una empresa: una imagen (foto, en dos tamaños) o un documento (PDF).
 * Si `recurso_dueno` no es nulo (p. ej. `bancos.conciliaciones`), solo se sirve desde la
 * ruta del módulo dueño, nunca desde `/archivos/:id`.
 */
export const archivos = esquemaCore.table(
  'archivos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    rutaOriginal: text().notNull(),
    clase: text().notNull().default('imagen'),
    rutaMiniatura: text(),
    tipoMime: text().notNull(),
    tamanoBytes: integer().notNull(),
    ancho: integer(),
    alto: integer(),
    /** Huella del contenido guardado. */
    sha256: text(),
    /** Huella del archivo tal como llegó, antes de reescribirlo. */
    sha256Recibido: text(),
    paginas: integer(),
    recursoDueno: text(),
    nombreOriginal: text(),
    subidoPor: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('archivos_empresa_idx').on(t.empresaId),
    check('archivos_clase_valida', sql`${t.clase} in ('imagen', 'documento')`),
    check(
      'archivos_imagen_completa',
      sql`${t.clase} <> 'imagen' or (${t.rutaMiniatura} is not null and ${t.ancho} is not null and ${t.alto} is not null)`,
    ),
    politicaPorEmpresa(),
  ],
);
