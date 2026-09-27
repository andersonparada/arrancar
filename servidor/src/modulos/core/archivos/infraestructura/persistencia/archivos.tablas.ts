import { index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../esquemas/core.esquema.js';
import { idPrimario, politicaPorEmpresa } from '../../../base-datos/columnas.js';
import { empresas } from '../../../esquemas/empresas.esquema.js';
import { usuarios } from '../../../esquemas/usuarios.esquema.js';

/** Imagen subida por una empresa (fotos de animales, fierro, facturas...). */
export const archivos = esquemaCore.table(
  'archivos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    rutaOriginal: text().notNull(),
    rutaMiniatura: text().notNull(),
    tipoMime: text().notNull(),
    tamanoBytes: integer().notNull(),
    ancho: integer().notNull(),
    alto: integer().notNull(),
    nombreOriginal: text(),
    subidoPor: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('archivos_empresa_idx').on(t.empresaId), politicaPorEmpresa()],
);
